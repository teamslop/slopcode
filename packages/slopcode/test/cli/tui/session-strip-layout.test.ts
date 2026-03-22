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

    expect(result).toEqual({
      tabs,
      hidden: 0,
    })
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
      width: 18,
    })

    expect(result).toEqual({
      tabs: [tabs[0], tabs[1]],
      hidden: 2,
    })
  })

  test("falls back to a prefix when active is missing", () => {
    const result = layoutSessionStrip(tabs, {
      active: "ses_missing",
      width: 14,
    })

    expect(result).toEqual({
      tabs: [tabs[0], tabs[1]],
      hidden: 2,
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
    })
  })
})
