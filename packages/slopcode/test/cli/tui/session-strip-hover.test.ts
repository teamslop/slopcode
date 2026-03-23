import { describe, expect, test } from "bun:test"
import {
  sessionStripTabClose,
  sessionStripTabLabel,
  SessionStripText,
} from "../../../src/cli/cmd/tui/routes/session/session-strip-layout"

describe("session strip hover", () => {
  test("hovering a tab reveals the close X in the rendered row text", () => {
    const tab = { id: "right", title: "HoverTarget" }
    const idle = sessionStripTabLabel(tab, true) + " " + sessionStripTabClose(false) + SessionStripText.SEP
    const hovered = sessionStripTabLabel(tab, true) + " " + sessionStripTabClose(true) + SessionStripText.SEP

    expect(idle).not.toContain("HoverTarget X")
    expect(hovered).toContain("HoverTarget X")
  })
})
