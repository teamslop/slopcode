import { describe, expect, test } from "bun:test"
import { layoutSessionStrip } from "../../../src/cli/cmd/tui/routes/session/session-strip-layout"

const tabs = [
  { id: "ses_1", title: "One" },
  { id: "ses_2", title: "Two" },
  { id: "ses_3", title: "Three" },
  { id: "ses_4", title: "Four" },
]

describe("session strip layout", () => {
  test("shows every tab when there is enough width", () => {
    const result = layoutSessionStrip(tabs, {
      active: "ses_2",
      width: 80,
    })

    expect(result.tabs).toEqual(tabs)
    expect(result.hidden).toBe(0)
    expect(Array.from(result.underline)).toHaveLength(80)
  })

  test("keeps the active tab visible when width is tight", () => {
    const result = layoutSessionStrip(tabs, {
      active: "ses_3",
      width: 18,
    })

    expect(result.tabs.some((tab) => tab.id === "ses_3")).toBe(true)
    expect(result.hidden).toBeGreaterThan(0)
  })

  test("prefers a wider left-anchored window on ties", () => {
    const result = layoutSessionStrip(tabs, {
      active: "ses_2",
      width: 28,
    })

    expect(result.tabs).toEqual([tabs[0], tabs[1]])
    expect(result.hidden).toBe(2)
  })

  test("falls back to a prefix when active is missing", () => {
    const result = layoutSessionStrip(tabs, {
      active: "ses_missing",
      width: 26,
    })

    expect(result.tabs).toEqual([tabs[0], tabs[1]])
    expect(result.hidden).toBe(2)
  })

  test("returns no tabs when width is zero", () => {
    const result = layoutSessionStrip(tabs, {
      active: "ses_1",
      width: 0,
    })

    expect(result).toEqual({
      tabs: [],
      hidden: 4,
      underline: "",
    })
  })

  test("draws joints under tab separators including the closing divider", () => {
    const result = layoutSessionStrip(
      [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      { width: 20 },
    )

    expect(result.tabs).toEqual([
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ])
    expect(result.hidden).toBe(0)
    expect(result.underline).toHaveLength(20)
    expect(Array.from(result.underline).filter((x) => x === "┴")).toHaveLength(2)
    expect(result.underline[6]).toBe("┴")
    expect(result.underline[14]).toBe("┴")
  })

  test("keeps joints aligned when the active marker shifts tab text", () => {
    const result = layoutSessionStrip(
      [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      { active: "a", width: 22 },
    )

    expect(result.hidden).toBe(0)
    expect(result.underline).toHaveLength(22)
    expect(Array.from(result.underline).filter((x) => x === "┴")).toHaveLength(2)
    expect(result.underline[8]).toBe("┴")
    expect(result.underline[16]).toBe("┴")
  })

  test("keeps the last tab closing divider before the overflow marker", () => {
    const result = layoutSessionStrip(
      [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
        { id: "c", title: "Long" },
      ],
      { width: 22 },
    )

    expect(result.tabs).toEqual([
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ])
    expect(result.hidden).toBe(1)
    expect(result.underline).toHaveLength(22)
    expect(Array.from(result.underline).filter((x) => x === "┴")).toHaveLength(2)
    expect(result.underline[6]).toBe("┴")
    expect(result.underline[14]).toBe("┴")
  })
})
