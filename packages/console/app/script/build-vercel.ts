#!/usr/bin/env bun
import { cp, mkdir, rm, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const out = resolve(dir, "../.vercel/output")
const server = resolve(dir, "../.output/server")
const func = resolve(out, "functions/__server.func")

await rm(func, { force: true, recursive: true })
await mkdir(func, { recursive: true })
await cp(server, func, { recursive: true })
await writeFile(
  resolve(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/__server" }],
    },
    null,
    2,
  ),
)
await writeFile(
  resolve(func, ".vc-config.json"),
  JSON.stringify(
    {
      handler: "index.mjs",
      launcherType: "Nodejs",
      runtime: "nodejs22.x",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
)
