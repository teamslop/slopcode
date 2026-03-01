#!/usr/bin/env bun

import { $ } from "bun"
import { Script } from "@slopcode-ai/script"

const repo = process.env.GH_REPO ?? "teamslop/slopcode"
const tag = `v${Script.version}`
const output = [`version=${Script.version}`, "release=", `tag=${tag}`]

if (!Script.preview) {
  const existing = await $`gh release view ${tag} --json tagName,databaseId --repo ${repo}`.quiet().nothrow()
  if (existing.exitCode !== 0) {
    await $`gh release create ${tag} -d --title ${tag} --notes "Release ${tag}" --repo ${repo}`
  }

  const release = await $`gh release view ${tag} --json tagName,databaseId --repo ${repo}`.json()
  output[1] = `release=${release.databaseId}`
  output[2] = `tag=${release.tagName}`
}

output.push(`repo=${repo}`)

if (process.env.GITHUB_OUTPUT) {
  await Bun.write(process.env.GITHUB_OUTPUT, output.join("\n"))
}

process.exit(0)
