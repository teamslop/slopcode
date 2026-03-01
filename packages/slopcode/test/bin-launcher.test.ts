import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"

const launcher = path.join(__dirname, "../bin/slopcode")

async function temp() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "slopcode-launcher-"))
  const bin = path.join(dir, "bin")
  await fs.mkdir(bin, { recursive: true })
  return { dir, bin }
}

async function script(file: string, content: string) {
  await Bun.write(file, content)
  await fs.chmod(file, 0o755)
}

async function run(env: Record<string, string>, args: string[] = []) {
  const proc = Bun.spawn([launcher, ...args], {
    env: {
      ...process.env,
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
  })

  return {
    code: await proc.exited,
    stdout: proc.stdout ? await new Response(proc.stdout).text() : "",
    stderr: proc.stderr ? await new Response(proc.stderr).text() : "",
  }
}

describe("bin launcher", () => {
  test("prefers node when both runtimes exist", async () => {
    if (process.platform === "win32") return
    const dir = await temp()

    await script(path.join(dir.bin, "sh"), '#!/bin/sh\nexec /bin/sh "$@"\n')
    await script(path.join(dir.bin, "bun"), "#!/bin/sh\necho bun\n")
    await script(path.join(dir.bin, "node"), "#!/bin/sh\necho node\n")

    const out = await run({ PATH: dir.bin })
    expect(out.code).toBe(0)
    expect(out.stdout.trim()).toBe("node")
  })

  test("falls back to bun when node is missing", async () => {
    if (process.platform === "win32") return
    const dir = await temp()

    await script(path.join(dir.bin, "sh"), '#!/bin/sh\nexec /bin/sh "$@"\n')
    await script(path.join(dir.bin, "bun"), "#!/bin/sh\necho bun\n")

    const out = await run({ PATH: dir.bin })
    expect(out.code).toBe(0)
    expect(out.stdout.trim()).toBe("bun")
  })

  test("prints clear error when no runtime exists", async () => {
    if (process.platform === "win32") return
    const dir = await temp()

    await script(path.join(dir.bin, "sh"), '#!/bin/sh\nexec /bin/sh "$@"\n')

    const out = await run({ PATH: dir.bin })
    expect(out.code).toBe(127)
    expect(out.stderr).toContain("slopcode requires bun or node in PATH")
  })

  test("runs with bun-only PATH when node is unavailable", async () => {
    if (process.platform === "win32") return
    const dir = await temp()

    await script(path.join(dir.bin, "sh"), '#!/bin/sh\nexec /bin/sh "$@"\n')
    await script(path.join(dir.bin, "bun"), `#!/bin/sh\nexec "${process.execPath}" "$@"\n`)

    const out = await run(
      {
        PATH: dir.bin,
        SLOPCODE_BIN_PATH: "/bin/echo",
      },
      ["ok"],
    )

    expect(out.code).toBe(0)
    expect(out.stdout.trim()).toBe("ok")
  })
})
