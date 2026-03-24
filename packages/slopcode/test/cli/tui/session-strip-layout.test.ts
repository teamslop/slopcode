import { describe, expect, test } from "bun:test"
import {
  layoutSessionStrip,
  layoutSessionStripUnderlineSegments,
  sessionStripWidth,
} from "../../../src/cli/cmd/tui/routes/session/session-strip-layout"

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

    expect(result).toMatchObject({
      tabs,
      hidden: 0,
      before: 0,
      after: 0,
      prev: undefined,
      next: undefined,
    })
    expect(Array.from(result.underline)).toHaveLength(80)
  })

  test("exposes hidden navigation targets around the active tab", () => {
    const result = layoutSessionStrip(tabs, {
      active: "ses_3",
      width: 18,
    })

    expect(result.tabs.some((tab) => tab.id === "ses_3")).toBe(true)
    expect(result).toMatchObject({
      hidden: 3,
      before: 2,
      after: 1,
      prev: "ses_2",
      next: "ses_4",
    })
  })

  test("prefers a wider left-anchored window on ties", () => {
    const result = layoutSessionStrip(tabs, {
      active: "ses_2",
      width: 31,
    })

    expect(result).toMatchObject({
      tabs: [tabs[0], tabs[1]],
      hidden: 2,
      before: 0,
      after: 2,
      prev: undefined,
      next: "ses_3",
    })
  })

  test("falls back to a prefix when active is missing", () => {
    const result = layoutSessionStrip(tabs, {
      active: "ses_missing",
      width: 29,
    })

    expect(result).toMatchObject({
      tabs: [tabs[0], tabs[1]],
      hidden: 2,
      before: 0,
      after: 2,
      prev: undefined,
      next: "ses_3",
    })
  })

  test("returns no tabs when width is zero", () => {
    const result = layoutSessionStrip(tabs, {
      active: "ses_1",
      width: 0,
    })

    expect(result).toEqual({
      tabs: [],
      hidden: 4,
      before: 0,
      after: 0,
      prev: undefined,
      next: undefined,
      underline: "",
    })
  })

  test("keeps the full terminal width when the strip inset is zero", () => {
    expect(sessionStripWidth(80, 0)).toBe(80)
    expect(sessionStripWidth(3, 2)).toBe(0)
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
    expect(Array.from(result.underline).filter((x) => x === "┴")).toHaveLength(3)
    expect(result.underline[1]).toBe("┴")
    expect(result.underline[9]).toBe("┴")
    expect(result.underline[17]).toBe("┴")
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
    expect(Array.from(result.underline).filter((x) => x === "┴")).toHaveLength(3)
    expect(result.underline[1]).toBe("┴")
    expect(result.underline[11]).toBe("┴")
    expect(result.underline[19]).toBe("┴")
  })

  test("adds a joint before the next control when tabs overflow", () => {
    const result = layoutSessionStrip(
      [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
        { id: "c", title: "Long" },
      ],
      { width: 25 },
    )

    expect(result).toMatchObject({
      tabs: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      hidden: 1,
      before: 0,
      after: 1,
      prev: undefined,
      next: "c",
    })
    expect(result.underline).toHaveLength(25)
    expect(Array.from(result.underline).filter((x) => x === "┴")).toHaveLength(4)
    expect(result.underline[1]).toBe("┴")
    expect(result.underline[9]).toBe("┴")
    expect(result.underline[17]).toBe("┴")
    expect(result.underline[22]).toBe("┴")
  })

  test("adds a joint after the previous control when tabs are hidden on the left", () => {
    const result = layoutSessionStrip(
      [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
        { id: "c", title: "C" },
      ],
      { active: "c", width: 14 },
    )

    expect(result).toMatchObject({
      tabs: [{ id: "c", title: "C" }],
      hidden: 2,
      before: 2,
      after: 0,
      prev: "b",
      next: undefined,
    })
    expect(Array.from(result.underline).filter((x) => x === "┴")).toHaveLength(2)
    expect(result.underline[2]).toBe("┴")
    expect(result.underline[12]).toBe("┴")
  })

  test("splits underline into hover-aware segments without changing the text", () => {
    const result = layoutSessionStrip(
      [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      { active: "a", width: 22 },
    )
    const segments = layoutSessionStripUnderlineSegments(result, {
      active: "a",
      prevOwner: "__prev__",
      nextOwner: "__next__",
    })

    expect(segments.map((segment) => segment.text).join("")).toBe(result.underline)
    expect(segments.map((segment) => segment.owners)).toEqual([[], ["a"], [], ["b"], [], []])
  })

  test("adds a leading boundary when the first visible tab is also the first tab", () => {
    const result = layoutSessionStrip(
      [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      { width: 20 },
    )

    const segments = layoutSessionStripUnderlineSegments(result, {})

    expect(result.before).toBe(0)
    expect(result.tabs.map((tab) => tab.id)).toEqual(["a", "b"])
    expect(segments[0]?.text).toBe("─┴─")
    expect(segments[0]?.owners).toEqual([])
  })
})
