import { describe, expect, test } from "bun:test"
import { pruneSessionTabs, visitSessionTabs } from "../../../src/cli/cmd/tui/context/session-tabs-state"

describe("session tabs", () => {
  test("tracks the first root session without duplication", () => {
    const next = visitSessionTabs({ ids: [], active: undefined }, { sessionID: "ses_1", source: "switch", root: true })

    expect(next).toEqual({
      ids: ["ses_1"],
      active: "ses_1",
    })
  })

  test("appends unseen switched sessions", () => {
    const next = visitSessionTabs(
      { ids: ["ses_1"], active: "ses_1" },
      { sessionID: "ses_2", source: "switch", root: true },
    )

    expect(next).toEqual({
      ids: ["ses_1", "ses_2"],
      active: "ses_2",
    })
  })

  test("revisiting a session only changes the active tab", () => {
    const next = visitSessionTabs(
      { ids: ["ses_1", "ses_2", "ses_3"], active: "ses_3" },
      { sessionID: "ses_1", source: "switch", root: true },
    )

    expect(next).toEqual({
      ids: ["ses_1", "ses_2", "ses_3"],
      active: "ses_1",
    })
  })

  test("new sessions reset the strip back to a single tab", () => {
    const next = visitSessionTabs(
      { ids: ["ses_1", "ses_2"], active: "ses_2" },
      { sessionID: "ses_3", source: "new", root: true },
    )

    expect(next).toEqual({
      ids: ["ses_3"],
      active: "ses_3",
    })
  })

  test("child routes never enter the top strip", () => {
    const next = visitSessionTabs(
      { ids: ["ses_1", "ses_2"], active: "ses_2" },
      { sessionID: "ses_child", source: "child", root: false },
    )

    expect(next).toEqual({
      ids: ["ses_1", "ses_2"],
      active: "ses_2",
    })
  })

  test("known non-root sessions are ignored", () => {
    const next = visitSessionTabs(
      { ids: ["ses_1"], active: "ses_1" },
      { sessionID: "ses_child", source: "switch", root: false },
    )

    expect(next).toEqual({
      ids: ["ses_1"],
      active: "ses_1",
    })
  })

  test("unknown sessions are provisionally tracked until sync resolves them", () => {
    const next = visitSessionTabs(
      { ids: ["ses_1"], active: "ses_1" },
      { sessionID: "ses_2", source: "switch", root: undefined },
    )

    expect(next).toEqual({
      ids: ["ses_1", "ses_2"],
      active: "ses_2",
    })
  })

  test("prunes deleted sessions and keeps the current active tab when possible", () => {
    const next = pruneSessionTabs({ ids: ["ses_1", "ses_2", "ses_3"], active: "ses_2" }, new Set(["ses_2", "ses_3"]))

    expect(next).toEqual({
      ids: ["ses_2", "ses_3"],
      active: "ses_2",
    })
  })

  test("pruning falls back to the last remaining tab when active disappears", () => {
    const next = pruneSessionTabs({ ids: ["ses_1", "ses_2", "ses_3"], active: "ses_2" }, new Set(["ses_1", "ses_3"]))

    expect(next).toEqual({
      ids: ["ses_1", "ses_3"],
      active: "ses_3",
    })
  })
})
