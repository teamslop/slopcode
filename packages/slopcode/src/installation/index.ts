import { BusEvent } from "@/bus/bus-event"
import path from "path"
import { $ } from "bun"
import z from "zod"
import { NamedError } from "@slopcode-ai/util/error"
import { Log } from "../util/log"
import { iife } from "@/util/iife"
import { Flag } from "../flag/flag"

declare global {
  const SLOPCODE_VERSION: string
  const SLOPCODE_CHANNEL: string
}

export namespace Installation {
  const log = Log.create({ service: "installation" })
  const nixMatch = /(^|[^a-z0-9])slopcode([^a-z0-9]|$)/i

  const aptNormalizedVersion = (value: string) => {
    const plain = value.trim().replace(/^v/, "")
    if (!plain) return plain
    const noEpoch = plain.includes(":") ? plain.split(":").slice(-1)[0] : plain
    const upstream = noEpoch.replace(/-[^-]+$/, "")
    return upstream.replace(/~/g, "-")
  }

  const aptPackageVersion = (value: string) => {
    const plain = value.trim().replace(/^v/, "")
    if (!plain) return plain
    if (plain.includes(":")) return plain
    if (/-\d+$/.test(plain)) return plain
    return `${plain.replace(/-/g, "~")}-1`
  }

  const aptCandidate = (policy: string) => {
    const match = policy.match(/^\s*Candidate:\s*(\S+)/m)
    if (!match) {
      return
    }
    const value = match[1]
    if (value === "(none)") {
      return
    }
    return value
  }

  const aptPolicy = () => $`apt-cache policy slopcode`.throws(false).quiet().text()

  const aptNeedsPrivilege = (stderr: string) => {
    const text = stderr.toLowerCase()
    return (
      text.includes("a password is required") ||
      text.includes("not in the sudoers") ||
      text.includes("permission denied") ||
      text.includes("no tty present") ||
      text.includes("command not found")
    )
  }

  const snapNeedsPrivilege = (stderr: string) => {
    const text = stderr.toLowerCase()
    return (
      text.includes("a password is required") ||
      text.includes("not in the sudoers") ||
      text.includes("permission denied") ||
      text.includes("requires root") ||
      text.includes("must be run as root") ||
      text.includes("no tty present") ||
      text.includes("command not found")
    )
  }

  const aptUpgradeCommand = (pkg: string) => {
    const env = {
      DEBIAN_FRONTEND: "noninteractive",
      ...process.env,
    }
    if (typeof process.getuid === "function" && process.getuid() === 0) {
      return $`apt-get install -y --only-upgrade ${pkg}`.env(env)
    }
    return $`sudo -n apt-get install -y --only-upgrade ${pkg}`.env(env)
  }

  const snapUpgradeCommand = () => {
    if (typeof process.getuid === "function" && process.getuid() === 0) {
      return $`snap refresh slopcode`
    }
    return $`sudo -n snap refresh slopcode`
  }

  const nixVersionInstallable = (source: string) => {
    const normalized = source.startsWith("flake:") ? source.replace(/^flake:/, "") : source
    const arch = process.arch === "x64" ? "x86_64" : process.arch === "arm64" ? "aarch64" : process.arch
    const os = process.platform === "darwin" ? "darwin" : process.platform === "linux" ? "linux" : process.platform
    return `${normalized}#packages.${arch}-${os}.slopcode.version`
  }

  const isNixEntry = (entry: {
    attrPath?: string
    flake?: string
    originalUrl?: string
    url?: string
    storePaths?: string[]
  }) => {
    const source = [entry.attrPath, entry.flake, entry.originalUrl, entry.url, ...(entry.storePaths ?? [])]
    return source.some((item) => !!item && nixMatch.test(item))
  }

  const nixEntry = async () => {
    const output = await $`nix profile list --json`.throws(false).quiet().text()
    if (!output.trim()) {
      return
    }
    try {
      const parsed = JSON.parse(output) as Record<
        string,
        {
          attrPath?: string
          flake?: string
          originalUrl?: string
          url?: string
          storePaths?: string[]
        }
      >
      const pair = Object.entries(parsed).find(([, value]) => isNixEntry(value))
      if (!pair) {
        return
      }
      const [index, value] = pair
      return {
        index,
        ...value,
      }
    } catch {
      return
    }
  }

  const nixSource = (entry: {
    attrPath?: string
    flake?: string
    originalUrl?: string
    url?: string
    storePaths?: string[]
  }) => {
    if (entry.flake) {
      return entry.flake
    }
    if (entry.originalUrl) {
      return entry.originalUrl
    }
    if (entry.url) {
      return entry.url
    }
    return
  }

  export type Method = Awaited<ReturnType<typeof method>>

  export async function nixSelector() {
    return (await nixEntry())?.index
  }

  export const Event = {
    Updated: BusEvent.define(
      "installation.updated",
      z.object({
        version: z.string(),
      }),
    ),
    UpdateAvailable: BusEvent.define(
      "installation.update-available",
      z.object({
        version: z.string(),
      }),
    ),
  }

  export const Info = z
    .object({
      version: z.string(),
      latest: z.string(),
    })
    .meta({
      ref: "InstallationInfo",
    })
  export type Info = z.infer<typeof Info>

  export async function info() {
    return {
      version: VERSION,
      latest: await latest(),
    }
  }

  export function isPreview() {
    return CHANNEL !== "latest"
  }

  export function isLocal() {
    return CHANNEL === "local"
  }

  export async function method() {
    if (process.execPath.includes(path.join(".slopcode", "bin"))) return "curl"
    if (process.execPath.includes(path.join(".local", "bin"))) return "curl"
    const exec = process.execPath.toLowerCase()
    if (await nixSelector()) return "nix"

    const checks = [
      {
        name: "npm" as const,
        command: () => $`npm list -g --depth=0`.throws(false).quiet().text(),
      },
      {
        name: "yarn" as const,
        command: () => $`yarn global list`.throws(false).quiet().text(),
      },
      {
        name: "pnpm" as const,
        command: () => $`pnpm list -g --depth=0`.throws(false).quiet().text(),
      },
      {
        name: "bun" as const,
        command: () => $`bun pm ls -g`.throws(false).quiet().text(),
      },
      {
        name: "brew" as const,
        command: () => $`brew list --formula slopcode`.throws(false).quiet().text(),
      },
      {
        name: "apt" as const,
        command: () => $`dpkg-query -W -f='\${Package}' slopcode`.throws(false).quiet().text(),
      },
      {
        name: "snap" as const,
        command: () => $`snap list slopcode`.throws(false).quiet().text(),
      },
      {
        name: "scoop" as const,
        command: () => $`scoop list slopcode`.throws(false).quiet().text(),
      },
      {
        name: "choco" as const,
        command: () => $`choco list --limit-output slopcode`.throws(false).quiet().text(),
      },
    ]

    checks.sort((a, b) => {
      const aMatches = exec.includes(a.name)
      const bMatches = exec.includes(b.name)
      if (aMatches && !bMatches) return -1
      if (!aMatches && bMatches) return 1
      return 0
    })

    for (const check of checks) {
      const output = await check.command()
      const installedName = "slopcode"
      if (output.includes(installedName)) {
        return check.name
      }
    }

    return "unknown"
  }

  export const UpgradeFailedError = NamedError.create(
    "UpgradeFailedError",
    z.object({
      stderr: z.string(),
    }),
  )

  async function getBrewFormula() {
    const tapFormula = await $`brew list --formula teamslop/slopcode/slopcode`.throws(false).quiet().text()
    if (tapFormula.includes("slopcode")) return "teamslop/slopcode/slopcode"
    const coreFormula = await $`brew list --formula slopcode`.throws(false).quiet().text()
    if (coreFormula.includes("slopcode")) return "slopcode"
    return "slopcode"
  }

  export async function upgrade(method: Method, target: string) {
    let cmd
    switch (method) {
      case "curl":
        cmd = $`curl -fsSL https://slopcode.dev/install | bash`.env({
          ...process.env,
          VERSION: target,
        })
        break
      case "npm":
        cmd = $`npm install -g slopcode@${target}`
        break
      case "pnpm":
        cmd = $`pnpm install -g slopcode@${target}`
        break
      case "bun":
        cmd = $`bun install -g slopcode@${target}`
        break
      case "nix": {
        const selector = await nixSelector()
        if (!selector) {
          throw new UpgradeFailedError({
            stderr:
              "Could not find slopcode in your nix profile. Install with: nix profile install github:teamslop/slopcode#slopcode",
          })
        }
        cmd = $`nix profile upgrade ${selector}`
        break
      }
      case "brew": {
        const formula = await getBrewFormula()
        if (formula.includes("/")) {
          cmd =
            $`brew tap teamslop/slopcode && cd "$(brew --repo teamslop/slopcode)" && git pull --ff-only && brew upgrade ${formula}`.env(
              {
                HOMEBREW_NO_AUTO_UPDATE: "1",
                ...process.env,
              },
            )
          break
        }
        cmd = $`brew upgrade ${formula}`.env({
          HOMEBREW_NO_AUTO_UPDATE: "1",
          ...process.env,
        })
        break
      }
      case "apt": {
        const candidate = aptCandidate(await aptPolicy())
        const version = candidate && aptNormalizedVersion(candidate) === target ? undefined : aptPackageVersion(target)
        const pkg = version ? `slopcode=${version}` : "slopcode"
        cmd = aptUpgradeCommand(pkg)
        break
      }
      case "snap":
        cmd = snapUpgradeCommand()
        break
      case "choco":
        cmd = $`echo Y | choco upgrade slopcode --version=${target}`
        break
      case "scoop":
        cmd = $`scoop install slopcode@${target}`
        break
      default:
        throw new Error(`Unknown method: ${method}`)
    }
    const result = await cmd.quiet().throws(false)
    if (result.exitCode !== 0) {
      const stderrText = result.stderr.toString("utf8")
      const stderr =
        method === "choco"
          ? "not running from an elevated command shell"
          : method === "apt" && aptNeedsPrivilege(stderrText)
            ? "not running from a privileged shell"
            : method === "snap" && snapNeedsPrivilege(stderrText)
              ? "not running from a privileged shell"
              : stderrText
      throw new UpgradeFailedError({
        stderr: stderr,
      })
    }
    log.info("upgraded", {
      method,
      target,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    })
    await $`${process.execPath} --version`.nothrow().quiet().text()
  }

  export const VERSION = typeof SLOPCODE_VERSION === "string" ? SLOPCODE_VERSION : "local"
  export const CHANNEL = typeof SLOPCODE_CHANNEL === "string" ? SLOPCODE_CHANNEL : "local"
  export const USER_AGENT = `slopcode/${CHANNEL}/${VERSION}/${Flag.SLOPCODE_CLIENT}`

  export async function latest(installMethod?: Method) {
    const detectedMethod = installMethod || (await method())

    if (detectedMethod === "brew") {
      const formula = await getBrewFormula()
      if (formula.includes("/")) {
        const infoJson = await $`brew info --json=v2 ${formula}`.quiet().text()
        const info = JSON.parse(infoJson)
        const version = info.formulae?.[0]?.versions?.stable
        if (!version) throw new Error(`Could not detect version for tap formula: ${formula}`)
        return version
      }
      return fetch("https://formulae.brew.sh/api/formula/slopcode.json")
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
        .then((data: any) => data.versions.stable)
    }

    if (detectedMethod === "apt") {
      const candidate = aptCandidate(await aptPolicy())
      if (!candidate) {
        return VERSION
      }
      const latest = aptNormalizedVersion(candidate)
      if (!latest) {
        return VERSION
      }
      return latest
    }

    if (detectedMethod === "snap") {
      const info = await $`snap info slopcode`.throws(false).quiet().text()
      const stable = info.match(/^\s*(?:latest\/)?stable:\s*([^\s]+)/m)?.[1]?.replace(/^v/, "")
      return stable || VERSION
    }

    if (detectedMethod === "nix") {
      const entry = await nixEntry()
      if (!entry) {
        return VERSION
      }
      const source = nixSource(entry)
      if (!source) {
        return VERSION
      }
      if (source.includes("nixpkgs")) {
        const latest = (await $`nix eval --raw nixpkgs#slopcode.version`.quiet().nothrow().text()).trim()
        if (latest) {
          return latest
        }
      }
      const latest = (await $`nix eval --raw ${nixVersionInstallable(source)}`.quiet().nothrow().text()).trim()
      if (latest) {
        return latest
      }
      return VERSION
    }

    if (detectedMethod === "npm" || detectedMethod === "bun" || detectedMethod === "pnpm") {
      const registry = await iife(async () => {
        const r = (await $`npm config get registry`.quiet().nothrow().text()).trim()
        const reg = r || "https://registry.npmjs.org"
        return reg.endsWith("/") ? reg.slice(0, -1) : reg
      })
      const channel = CHANNEL
      return fetch(`${registry}/slopcode/${channel}`)
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
        .then((data: any) => data.version)
    }

    if (detectedMethod === "choco") {
      return fetch(
        "https://community.chocolatey.org/api/v2/Packages?$filter=Id%20eq%20%27slopcode%27%20and%20IsLatestVersion&$select=Version",
        { headers: { Accept: "application/json;odata=verbose" } },
      )
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
        .then((data: any) => data.d.results[0].Version)
    }

    if (detectedMethod === "scoop") {
      return fetch("https://raw.githubusercontent.com/ScoopInstaller/Main/master/bucket/slopcode.json", {
        headers: { Accept: "application/json" },
      })
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
        .then((data: any) => data.version)
    }

    return fetch("https://api.github.com/repos/teamslop/slopcode/releases/latest")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data: any) => data.tag_name.replace(/^v/, ""))
  }
}
