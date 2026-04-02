import { describe, expect, test } from "bun:test"
import { layoutPromptFooter, type PromptFooterItem } from "../../../src/cli/cmd/tui/component/prompt/footer-layout"

const box = (id: string, key: string, labels: string[], required = false): PromptFooterItem => ({
  id,
  required,
  variants: labels.map((label) => ({
    box: true,
    parts: [{ text: key, tone: "text" }, ...(label ? [{ text: label, tone: "muted" as const }] : [])],
  })),
})

const group = (id: string, left: string, right: string, labels: string[], required = false): PromptFooterItem => ({
  id,
  required,
  variants: labels.map((label) => ({
    gap: 1,
    parts: [
      { id: `${id}-left`, text: left, tone: "text", box: true },
      { id: `${id}-right`, text: right, tone: "text", box: true },
      ...(label ? [{ text: label, tone: "muted" as const }] : []),
    ],
  })),
})

const normal = [
  box("interrupt", "esc", ["interrupt", "stop"], true),
  box("variant", "ctrl+t", ["variants", "var"]),
  box("agent", "tab", ["agents", "agent"]),
  box("history", "ctrl+y", ["history", "hist"]),
  box("command", "ctrl+p", ["commands", "cmd"]),
]

const history = [
  box("history-toggle", "ctrl+y", ["edit mode", "edit"], true),
  group("history-prompt", "↑", "↓", ["nav. prompt", "prompt", ""], true),
  group("history-trace", "←", "→", ["nav. trace", "trace", ""]),
  box("expand", "space", ["expand", ""]),
]

describe("prompt footer layout", () => {
  test("keeps every normal shortcut when the row is roomy", () => {
    const result = layoutPromptFooter({ width: 100, items: normal })

    expect(result.pad).toBe(1)
    expect(result.width).toBe(100)
    expect(result.items.map((item) => [item.id, item.variant])).toEqual([
      ["interrupt", 0],
      ["variant", 0],
      ["agent", 0],
      ["history", 0],
      ["command", 0],
    ])
    expect(Math.max(...result.gaps) - Math.min(...result.gaps)).toBeLessThanOrEqual(1)
  })

  test("shortens trailing normal shortcuts before hiding them", () => {
    const result = layoutPromptFooter({ width: 60, items: normal })

    expect(result.pad).toBe(0)
    expect(result.items.map((item) => item.id)).toEqual(["interrupt", "variant", "agent", "history", "command"])
    expect(result.items.map((item) => item.variant)).toEqual([0, 1, 1, 1, 1])
  })

  test("hides trailing normal shortcuts only after shortening them", () => {
    const result = layoutPromptFooter({ width: 50, items: normal })

    expect(result.items.map((item) => item.id)).toEqual(["interrupt", "variant", "agent", "history"])
    expect(result.items.some((item) => item.id === "variant")).toBe(true)
    expect(result.items.some((item) => item.id === "command")).toBe(false)
  })

  test("lays out grouped history controls with the same fitter", () => {
    const result = layoutPromptFooter({ width: 80, items: history })

    expect(result.items.map((item) => item.id)).toEqual(["history-toggle", "history-prompt", "history-trace", "expand"])
    expect(result.items[0]?.box).toBe(true)
    expect(result.items[1]?.box).toBe(false)
    expect(result.items[2]?.box).toBe(false)
    expect(result.items[3]?.box).toBe(true)
    expect(Math.max(...result.gaps) - Math.min(...result.gaps)).toBeLessThanOrEqual(1)
  })

  test("keeps required history actions before optional ones", () => {
    const result = layoutPromptFooter({ width: 16, items: history })

    expect(result.items.map((item) => item.id)).toEqual(["history-toggle", "history-prompt"])
    expect(result.items.every((item) => item.id !== "history-trace")).toBe(true)
    expect(result.items.every((item) => item.id !== "expand")).toBe(true)
  })

  test("compacts required shell shortcuts down to a key-only fallback", () => {
    const shell = [box("shell", "esc", ["exit shell mode", "shell", ""], true)]
    const result = layoutPromptFooter({ width: 3, items: shell })

    expect(result.items.map((item) => item.variant)).toEqual([2])
    expect(result.width).toBe(result.items[0]?.width)
  })

  test("keeps required interrupt controls when retry text must drop", () => {
    const retry = [
      {
        id: "retry",
        variants: [
          { parts: [{ text: "retrying in 12s attempt #2", tone: "error" as const }] },
          { parts: [{ text: "12s #2", tone: "error" as const }] },
        ],
      },
      box("interrupt", "esc", ["interrupt", "stop"], true),
    ]
    const result = layoutPromptFooter({ width: 8, items: retry })

    expect(result.items.map((item) => item.id)).toEqual(["interrupt"])
  })

  test("fills the requested width with evenly distributed outer gaps", () => {
    const result = layoutPromptFooter({ width: 92, items: normal })
    const used = result.items.reduce((sum, item) => sum + item.width, 0) + result.gaps.reduce((sum, gap) => sum + gap, 0)

    expect(used).toBe(result.width)
    expect(Math.max(...result.gaps) - Math.min(...result.gaps)).toBeLessThanOrEqual(1)
  })
})
