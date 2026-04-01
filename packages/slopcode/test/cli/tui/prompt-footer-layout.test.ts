import { describe, expect, test } from "bun:test"
import { layoutPromptFooterShortcuts } from "../../../src/cli/cmd/tui/component/prompt/footer-layout"

const items = [
  { id: "interrupt", key: "esc", full: "interrupt", short: "stop", required: true },
  { id: "variant", key: "ctrl+t", full: "variants", short: "var" },
  { id: "agent", key: "tab", full: "agents", short: "agent" },
  { id: "history", key: "ctrl+y", full: "history", short: "hist" },
  { id: "command", key: "ctrl+p", full: "commands", short: "cmd" },
]

describe("prompt footer layout", () => {
  test("keeps every shortcut when the row is roomy", () => {
    const result = layoutPromptFooterShortcuts({ width: 100, items })

    expect(result.pad).toBe(1)
    expect(result.width).toBe(100)
    expect(result.items.map((item) => [item.id, item.mode])).toEqual([
      ["interrupt", "full"],
      ["variant", "full"],
      ["agent", "full"],
      ["history", "full"],
      ["command", "full"],
    ])
    expect(Math.max(...result.gaps) - Math.min(...result.gaps)).toBeLessThanOrEqual(1)
  })

  test("shortens trailing labels before hiding any shortcut", () => {
    const result = layoutPromptFooterShortcuts({ width: 60, items })

    expect(result.pad).toBe(0)
    expect(result.items.map((item) => item.id)).toEqual(["interrupt", "variant", "agent", "history", "command"])
    expect(result.items.map((item) => item.mode)).toEqual(["full", "short", "short", "short", "short"])
  })

  test("hides trailing shortcuts only after shortened labels still overflow", () => {
    const result = layoutPromptFooterShortcuts({ width: 50, items })

    expect(result.items.map((item) => item.id)).toEqual(["interrupt", "variant", "agent", "history"])
    expect(result.items.some((item) => item.id === "variant")).toBe(true)
    expect(result.items.some((item) => item.id === "command")).toBe(false)
  })

  test("distributes leftover space evenly across interior gaps", () => {
    const result = layoutPromptFooterShortcuts({ width: 92, items })
    const used = result.items.reduce((sum, item) => sum + item.width, 0) + result.gaps.reduce((sum, gap) => sum + gap, 0)

    expect(used).toBe(result.width)
    expect(Math.max(...result.gaps) - Math.min(...result.gaps)).toBeLessThanOrEqual(1)
  })
})
