#!/usr/bin/env bun
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const out = resolve(dir, "../.vercel/output")
const pub = resolve(dir, "../.output/public")
const server = resolve(dir, "../.output/server")
const func = resolve(out, "functions/__server.func")
const shim = resolve(func, "node_modules/cloudflare-workers-shim")

await rm(out, { force: true, recursive: true })
await mkdir(resolve(out, "functions"), { recursive: true })
await cp(pub, resolve(out, "static"), { recursive: true })
await cp(server, func, { recursive: true })
await mkdir(shim, { recursive: true })
await writeFile(
  resolve(shim, "package.json"),
  JSON.stringify(
    {
      name: "cloudflare-workers-shim",
      type: "module",
      exports: "./index.mjs",
    },
    null,
    2,
  ),
)
await writeFile(
  resolve(shim, "index.mjs"),
  [
    "function parse(value) {",
    "  if (typeof value !== 'string') return value",
    "  try { return JSON.parse(value) } catch { return value }",
    "}",
    "export const env = new Proxy({}, {",
    "  get(_target, prop) {",
    "    if (typeof prop !== 'string') return undefined",
    "    const value = globalThis.__env__?.[prop] ?? process.env[`SST_RESOURCE_${prop}`] ?? process.env[prop]",
    "    return parse(value)",
    "  }",
    "})",
    "export const waitUntil = async (promise) => { await promise }",
    "",
  ].join("\n"),
)
await writeFile(
  resolve(func, "vercel.mjs"),
  [
    "import app from './index.mjs'",
    "",
    "function parse(value) {",
    "  if (typeof value !== 'string') return value",
    "  try { return JSON.parse(value) } catch { return value }",
    "}",
    "",
    "const env = new Proxy({}, {",
    "  get(_target, prop) {",
    "    if (typeof prop !== 'string') return undefined",
    "    const value = process.env[`SST_RESOURCE_${prop}`] ?? process.env[prop]",
    "    return parse(value)",
    "  }",
    "})",
    "",
    "export default {",
    "  fetch(req, context) {",
    "    const query = req.headers.get('x-now-route-matches')",
    "    if (query) {",
    "      const url = new URLSearchParams(query).get('url')",
    "      if (url) req = new Request(new URL(decodeURIComponent(url), req.url).href, req)",
    "    }",
    "    req.runtime ??= { name: 'vercel' }",
    "    req.runtime.vercel = { context }",
    "    req.waitUntil = context?.waitUntil",
    "    globalThis.__env__ = env",
    "    return app.fetch(req, env, { waitUntil: context?.waitUntil ?? (() => {}) })",
    "  },",
    "}",
    "",
  ].join("\n"),
)

const files = async (path: string) => {
  return (await readdir(path, { recursive: true }))
    .filter((entry) => entry.endsWith(".mjs"))
    .map((entry) => resolve(path, entry))
}

for (const file of await files(func)) {
  const text = await readFile(file, "utf8")
  if (!text.includes('"cloudflare:workers"')) continue
  await writeFile(file, text.replaceAll('"cloudflare:workers"', '"cloudflare-workers-shim"'))
}

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
      handler: "vercel.mjs",
      launcherType: "Nodejs",
      runtime: "nodejs22.x",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
)
