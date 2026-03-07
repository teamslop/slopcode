import { describe, expect, test } from "bun:test"
import { ghostCursor, ghostVisible, ghostRemainder } from "../../../src/cli/cmd/tui/component/prompt/ghost"

describe("prompt ghost", () => {
  test("uses live visual cursor when available", () => {
    const point = ghostCursor(
      {
        visualCursor: {
          visualRow: 0,
          visualCol: 12,
          offset: 42,
        },
      },
      {
        row: 1,
        col: 0,
        offset: 41,
      },
    )

    expect(point).toEqual({
      row: 0,
      col: 12,
      offset: 42,
    })
  })

  test("falls back when input is unavailable", () => {
    const point = ghostCursor(undefined, {
      row: 2,
      col: 3,
      offset: 15,
    })

    expect(point).toEqual({
      row: 2,
      col: 3,
      offset: 15,
    })
  })

  test("falls back when input is destroyed", () => {
    const point = ghostCursor(
      {
        isDestroyed: true,
        visualCursor: {
          visualRow: 0,
          visualCol: 0,
          offset: 0,
        },
      },
      {
        row: 3,
        col: 4,
        offset: 18,
      },
    )

    expect(point).toEqual({
      row: 3,
      col: 4,
      offset: 18,
    })
  })

  test("shows ghost when prompt is active and cursor is at end", () => {
    const visible = ghostVisible({
      ghost: " continuation",
      mode: "normal",
      disabled: false,
      historyMode: false,
      autocompleteVisible: false,
      focused: true,
      cursorOffset: 20,
      inputLength: 20,
    })

    expect(visible).toBe(true)
  })

  test("hides ghost when cursor is not at end", () => {
    const visible = ghostVisible({
      ghost: " continuation",
      mode: "normal",
      disabled: false,
      historyMode: false,
      autocompleteVisible: false,
      focused: true,
      cursorOffset: 19,
      inputLength: 20,
    })

    expect(visible).toBe(false)
  })

  test("hides ghost while autocomplete menu is visible", () => {
    const visible = ghostVisible({
      ghost: " continuation",
      mode: "normal",
      disabled: false,
      historyMode: false,
      autocompleteVisible: true,
      focused: true,
      cursorOffset: 20,
      inputLength: 20,
    })

    expect(visible).toBe(false)
  })

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
