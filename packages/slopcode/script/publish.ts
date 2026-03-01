#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@slopcode-ai/script"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

const binaries = await Array.fromAsync(new Bun.Glob("*/package.json").scan({ cwd: "./dist" })).then((arr) =>
  Promise.all(
    arr.map(async (filepath) => {
      const dir = filepath.replace(/\/package\.json$/, "")
      if (dir === pkg.name) return

      const item = await Bun.file(`./dist/${filepath}`).json()
      let name = item.name
      if (name.startsWith(`${pkg.name}-bin-bin-`)) {
        name = name.replace(`${pkg.name}-bin-bin-`, `${pkg.name}-bin-`)
      }
      if (name.startsWith(`${pkg.name}-`) && !name.startsWith(`${pkg.name}-bin-`)) {
        name = name.replace(`${pkg.name}-`, `${pkg.name}-bin-`)
      }

      if (name !== item.name) {
        await Bun.file(`./dist/${filepath}`).write(
          JSON.stringify(
            {
              ...item,
              name,
            },
            null,
            2,
          ),
        )
      }

      return {
        dir,
        name,
        version: item.version,
      }
    }),
  ).then((arr) => arr.flatMap((item) => (item ? [item] : []))),
)
const deps = Object.fromEntries(binaries.map((item) => [item.name, item.version]))
console.log("binaries", deps)
const version = binaries[0]?.version
if (!version) {
  throw new Error("No binary artifacts found in ./dist")
}
const otp = process.env.NPM_OTP?.trim()
const skipPack = process.env.SLOPCODE_SKIP_PACK === "true"
const registry = (process.env.npm_config_registry ?? "https://registry.npmjs.org").replace(/\/$/, "")
const exists = (name: string, version: string) => fetch(`${registry}/${name}/${version}`).then((x) => x.ok)

await $`rm -rf ./dist/${pkg.name}`
await $`mkdir -p ./dist/${pkg.name}`
await $`cp -r ./bin ./dist/${pkg.name}/bin`
await $`cp ./script/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`
await Bun.file(`./dist/${pkg.name}/LICENSE`).write(await Bun.file("../../LICENSE").text())

await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name,
      bin: {
        [pkg.name]: `./bin/${pkg.name}`,
      },
      scripts: {
        postinstall: "bun ./postinstall.mjs || node ./postinstall.mjs",
      },
      version: version,
      license: pkg.license,
      optionalDependencies: deps,
    },
    null,
    2,
  ),
)

const tasks = binaries.map(async (binary) => {
  if (await exists(binary.name, binary.version)) {
    console.log("skip", binary.name, binary.version)
    return
  }

  if (!skipPack) {
    if (process.platform !== "win32") {
      await $`chmod -R 755 .`.cwd(`./dist/${binary.dir}`)
    }
    await $`bash -lc "rm -f ./*.tgz"`.cwd(`./dist/${binary.dir}`)
    await $`bun pm pack`.cwd(`./dist/${binary.dir}`)
  }

  const publish = otp
    ? $`npm publish *.tgz --access public --tag ${Script.channel} --otp=${otp}`
    : $`npm publish *.tgz --access public --tag ${Script.channel}`
  await publish.cwd(`./dist/${binary.dir}`)
})

const main = (async () => {
  if (await exists(pkg.name, version)) {
    console.log("skip", pkg.name, version)
    return
  }

  await $`bash -lc "rm -f ./*.tgz"`.cwd(`./dist/${pkg.name}`)
  await $`bun pm pack`.cwd(`./dist/${pkg.name}`)
  const publish = otp
    ? $`npm publish *.tgz --access public --tag ${Script.channel} --otp=${otp}`
    : $`npm publish *.tgz --access public --tag ${Script.channel}`
  await publish.cwd(`./dist/${pkg.name}`)
})()

await Promise.all([...tasks, main])

if (Script.channel === "latest") {
  await import("./publish-apt.ts")
}

// Non-npm publishing channels are intentionally disabled for npm-only rollout.
// if (Script.channel === "latest") {
//   await import("./publish-homebrew.ts")
// }

// Supplemental channels sourced from npm artifacts.
//
// Disabled channels:
// - GHCR container publish
// - AUR publish
// - Homebrew tap publish
