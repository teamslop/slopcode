#!/usr/bin/env bun

import { Script } from "@slopcode-ai/script"

const output = [`version=${Script.version}`, "release=", `tag=v${Script.version}`]

// Non-npm publishing channels are intentionally disabled for npm-only rollout.
// GitHub release draft creation is disabled in this mode.

output.push(`repo=${process.env.GH_REPO}`)

if (process.env.GITHUB_OUTPUT) {
  await Bun.write(process.env.GITHUB_OUTPUT, output.join("\n"))
}

process.exit(0)
