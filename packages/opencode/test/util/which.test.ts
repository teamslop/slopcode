import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { which } from "../../src/util/which"
import { tmpdir } from "../fixture/fixture"

async function cmd(dir: string, name: string, exec = true) {
  const ext = process.platform === "win32" ? ".cmd" : ""
  const file = path.join(dir, name + ext)
  const body = process.platform === "win32" ? "@echo off\r\n" : "#!/bin/sh\n"
  await fs.writeFile(file, body)
  if (process.platform !== "win32") {
    await fs.chmod(file, exec ? 0o755 : 0o644)
  }
  return file
}

function env(PATH: string): NodeJS.ProcessEnv {
  return {
    PATH,
    PATHEXT: process.env["PATHEXT"],
  }
}

describe("util.which", () => {
  test("returns null when command is missing", () => {
    expect(which("opencode-missing-command-for-test")).toBeNull()
  })

  test("finds a command from PATH override", async () => {
    await using tmp = await tmpdir()
    const bin = path.join(tmp.path, "bin")
    await fs.mkdir(bin)
    const file = await cmd(bin, "tool")

    expect(which("tool", env(bin))).toBe(file)
  })

  test("uses first PATH match", async () => {
    await using tmp = await tmpdir()
    const a = path.join(tmp.path, "a")
    const b = path.join(tmp.path, "b")
    await fs.mkdir(a)
    await fs.mkdir(b)
    const first = await cmd(a, "dupe")
    await cmd(b, "dupe")

    expect(which("dupe", env([a, b].join(path.delimiter)))).toBe(first)
  })

  test("returns null for non-executable file on unix", async () => {
    if (process.platform === "win32") return

    await using tmp = await tmpdir()
    const bin = path.join(tmp.path, "bin")
    await fs.mkdir(bin)
    await cmd(bin, "noexec", false)

    expect(which("noexec", env(bin))).toBeNull()
  })

  test("uses PATHEXT on windows", async () => {
    if (process.platform !== "win32") return

    await using tmp = await tmpdir()
    const bin = path.join(tmp.path, "bin")
    await fs.mkdir(bin)
    const file = path.join(bin, "pathext.CMD")
    await fs.writeFile(file, "@echo off\r\n")

    expect(which("pathext", { PATH: bin, PATHEXT: ".CMD" })).toBe(file)
  })
})
