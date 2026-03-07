import { describe, expect, test } from "bun:test"
import { ghostRemainder } from "../../../src/cli/cmd/tui/component/prompt/ghost"

describe("ghostRemainder", () => {
  test("matches case-insensitive prefixes", () => {
    expect(ghostRemainder("heL", "Hello")).toBe("lo")
  })

  test("returns empty remainder for exact case-insensitive matches", () => {
    expect(ghostRemainder("HELLO", "hello")).toBe("")
  })

  test("returns undefined for mismatches", () => {
    expect(ghostRemainder("help", "hello")).toBeUndefined()
  })

  test("returns undefined for empty input", () => {
    expect(ghostRemainder("", "hello")).toBeUndefined()
  })
})
