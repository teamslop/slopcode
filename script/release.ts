#!/usr/bin/env bun

import { $ } from "bun"

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const value = args.find((item) => !item.startsWith("--"))
const invalid = args.filter((item) => item.startsWith("--") && item !== "--dry-run")

if (!value || invalid.length > 0) {
  console.log(
    [
      "Usage: bun run release <patch|minor|major|version> [--dry-run]",
      "",
      "Examples:",
      "  bun run release patch",
      "  bun run release minor",
      "  bun run release 1.2.3",
    ].join("\n"),
  )
  process.exit(1)
}

const env = {
  ...process.env,
  SLOPCODE_RELEASE: "local",
}
if (["major", "minor", "patch"].includes(value)) {
  env.SLOPCODE_BUMP = value
} else {
  env.SLOPCODE_VERSION = value
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        command: "bun ./script/publish.ts",
        env: {
          SLOPCODE_RELEASE: env.SLOPCODE_RELEASE,
          SLOPCODE_BUMP: env.SLOPCODE_BUMP,
          SLOPCODE_VERSION: env.SLOPCODE_VERSION,
        },
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const dirty = (await $`git status --porcelain`.text()).trim()
if (dirty) {
  throw new Error("Release from a clean worktree only. Commit or stash changes first.")
}

await $`bun ./script/publish.ts`.env(env)
