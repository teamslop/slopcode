import { describe, expect, test } from "bun:test"
import {
  closeSessionTab,
  DRAFT_TAB_ID,
  openDraftTab,
  promoteDraftTab,
  pruneSessionTabs,
  tabStatus,
  visitSessionTabs,
} from "../../../src/cli/cmd/tui/context/session-tabs-state"

describe("session tabs", () => {
  test("tracks the first root session without duplication", () => {
    const next = visitSessionTabs({ tabs: [], active: undefined }, { sessionID: "ses_1", source: "switch", root: true })

    expect(next).toEqual({
      tabs: [{ type: "session", id: "ses_1" }],
      active: "ses_1",
    })
  })

  test("appends unseen switched sessions", () => {
    const next = visitSessionTabs(
      { tabs: [{ type: "session", id: "ses_1" }], active: "ses_1" },
      { sessionID: "ses_2", source: "switch", root: true },
    )

    expect(next).toEqual({
      tabs: [
        { type: "session", id: "ses_1" },
        { type: "session", id: "ses_2" },
      ],
      active: "ses_2",
    })
  })

  test("revisiting a session only changes the active tab", () => {
    const next = visitSessionTabs(
      {
        tabs: [
          { type: "session", id: "ses_1" },
          { type: "session", id: "ses_2" },
          { type: "session", id: "ses_3" },
        ],
        active: "ses_3",
      },
      { sessionID: "ses_1", source: "switch", root: true },
    )

    expect(next).toEqual({
      tabs: [
        { type: "session", id: "ses_1" },
        { type: "session", id: "ses_2" },
        { type: "session", id: "ses_3" },
      ],
      active: "ses_1",
    })
  })

  test("new sessions reset the strip back to a single tab", () => {
    const next = visitSessionTabs(
      {
        tabs: [
          { type: "session", id: "ses_1" },
          { type: "draft", id: DRAFT_TAB_ID },
          { type: "session", id: "ses_2" },
        ],
        active: DRAFT_TAB_ID,
      },
      { sessionID: "ses_3", source: "new", root: true },
    )

    expect(next).toEqual({
      tabs: [{ type: "session", id: "ses_3", pendingTitle: true }],
      active: "ses_3",
    })
  })

  test("forked sessions append to the strip instead of resetting it", () => {
    const next = visitSessionTabs(
      {
        tabs: [
          { type: "session", id: "ses_1" },
          { type: "draft", id: DRAFT_TAB_ID },
          { type: "session", id: "ses_2" },
        ],
        active: "ses_2",
      },
      { sessionID: "ses_3", source: "fork", root: true },
    )

    expect(next).toEqual({
      tabs: [
        { type: "session", id: "ses_1" },
        { type: "draft", id: DRAFT_TAB_ID },
        { type: "session", id: "ses_2" },
        { type: "session", id: "ses_3" },
      ],
      active: "ses_3",
    })
  })

  test("child routes never enter the top strip", () => {
    const next = visitSessionTabs(
      {
        tabs: [
          { type: "session", id: "ses_1" },
          { type: "session", id: "ses_2" },
        ],
        active: "ses_2",
      },
      { sessionID: "ses_child", source: "child", root: false },
    )

    expect(next).toEqual({
      tabs: [
        { type: "session", id: "ses_1" },
        { type: "session", id: "ses_2" },
      ],
      active: "ses_2",
    })
  })

  test("known non-root sessions are ignored", () => {
    const next = visitSessionTabs(
      { tabs: [{ type: "session", id: "ses_1" }], active: "ses_1" },
      { sessionID: "ses_child", source: "switch", root: false },
    )

    expect(next).toEqual({
      tabs: [{ type: "session", id: "ses_1" }],
      active: "ses_1",
    })
  })

  test("unknown sessions are provisionally tracked until sync resolves them", () => {
    const next = visitSessionTabs(
      { tabs: [{ type: "session", id: "ses_1" }], active: "ses_1" },
      { sessionID: "ses_2", source: "switch", root: undefined },
    )

    expect(next).toEqual({
      tabs: [
        { type: "session", id: "ses_1" },
        { type: "session", id: "ses_2" },
      ],
      active: "ses_2",
    })
  })

  test("opens a single reusable draft tab", () => {
    const next = openDraftTab({ tabs: [{ type: "session", id: "ses_1" }], active: "ses_1" })
    const reused = openDraftTab(next)

    expect(next).toEqual({
      tabs: [
        { type: "session", id: "ses_1" },
        { type: "draft", id: DRAFT_TAB_ID },
      ],
      active: DRAFT_TAB_ID,
    })
    expect(reused).toEqual(next)
  })

  test("promotes the draft tab into a real session in place", () => {
    const next = promoteDraftTab(
      {
        tabs: [
          { type: "session", id: "ses_1" },
          { type: "draft", id: DRAFT_TAB_ID },
        ],
        active: DRAFT_TAB_ID,
      },
      { sessionID: "ses_2" },
    )

    expect(next).toEqual({
      tabs: [
        { type: "session", id: "ses_1" },
        { type: "session", id: "ses_2", pendingTitle: true },
      ],
      active: "ses_2",
    })
  })

  test("new tabs are ready before message sync finishes", () => {
    expect(tabStatus({ draft: true, working: false, count: 0 })).toBe("ready")
    expect(tabStatus({ pending: true, working: false, count: 0 })).toBe("ready")
    expect(tabStatus({ pending: false, working: false, count: 1 })).toBe("done")
  })

  test("working state wins over ready and done", () => {
    expect(tabStatus({ pending: true, working: true, count: 1 })).toBe("working")
  })

  test("closing an inactive tab preserves the current active tab", () => {
    const next = closeSessionTab(
      {
        tabs: [
          { type: "session", id: "ses_1" },
          { type: "session", id: "ses_2" },
          { type: "session", id: "ses_3" },
        ],
        active: "ses_2",
      },
      "ses_1",
    )

    expect(next).toEqual({
      tabs: [
        { type: "session", id: "ses_2" },
        { type: "session", id: "ses_3" },
      ],
      active: "ses_2",
    })
  })

  test("closing the active tab prefers the tab to the right", () => {
    const next = closeSessionTab(
      {
        tabs: [
          { type: "session", id: "ses_1" },
          { type: "session", id: "ses_2" },
          { type: "session", id: "ses_3" },
        ],
        active: "ses_2",
      },
      "ses_2",
    )

    expect(next).toEqual({
      tabs: [
        { type: "session", id: "ses_1" },
        { type: "session", id: "ses_3" },
      ],
      active: "ses_3",
    })
  })

  test("closing the last tab falls back to the left", () => {
    const next = closeSessionTab(
      {
        tabs: [
          { type: "session", id: "ses_1" },
          { type: "session", id: "ses_2" },
        ],
        active: "ses_2",
      },
      "ses_2",
    )

    expect(next).toEqual({
      tabs: [{ type: "session", id: "ses_1" }],
      active: "ses_1",
    })
  })

  test("closing the draft can activate the next session tab", () => {
    const next = closeSessionTab(
      {
        tabs: [
          { type: "draft", id: DRAFT_TAB_ID },
          { type: "session", id: "ses_1" },
        ],
        active: DRAFT_TAB_ID,
      },
      DRAFT_TAB_ID,
    )

    expect(next).toEqual({
      tabs: [{ type: "session", id: "ses_1" }],
      active: "ses_1",
    })
  })

  test("closing the final tab clears the active tab", () => {
    const next = closeSessionTab(
      {
        tabs: [{ type: "draft", id: DRAFT_TAB_ID }],
        active: DRAFT_TAB_ID,
      },
      DRAFT_TAB_ID,
    )

    expect(next).toEqual({
      tabs: [],
      active: undefined,
    })
  })

  test("prunes deleted sessions and keeps the current active tab when possible", () => {
    const next = pruneSessionTabs(
      {
        tabs: [
          { type: "session", id: "ses_1" },
          { type: "draft", id: DRAFT_TAB_ID },
          { type: "session", id: "ses_2" },
          { type: "session", id: "ses_3" },
        ],
        active: "ses_2",
      },
      new Set(["ses_2", "ses_3"]),
    )

    expect(next).toEqual({
      tabs: [
        { type: "draft", id: DRAFT_TAB_ID },
        { type: "session", id: "ses_2" },
        { type: "session", id: "ses_3" },
      ],
      active: "ses_2",
    })
  })

  test("pruning falls back to the last remaining tab when active disappears", () => {
    const next = pruneSessionTabs(
      {
        tabs: [
          { type: "session", id: "ses_1" },
          { type: "draft", id: DRAFT_TAB_ID },
          { type: "session", id: "ses_3" },
        ],
        active: "ses_1",
      },
      new Set(["ses_3"]),
    )

    expect(next).toEqual({
      tabs: [
        { type: "draft", id: DRAFT_TAB_ID },
        { type: "session", id: "ses_3" },
      ],
      active: "ses_3",
    })
  })
})
