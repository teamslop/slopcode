export function ghostCursor(
  input:
    | {
        isDestroyed?: boolean
        visualCursor: {
          visualRow: number
          visualCol: number
          offset: number
        }
      }
    | undefined,
  fallback: {
    row: number
    col: number
    offset: number
  },
) {
  if (!input || input.isDestroyed) return fallback
  const cursor = input.visualCursor
  return {
    row: cursor.visualRow,
    col: cursor.visualCol,
    offset: cursor.offset,
  }
}

export function ghostVisible(input: {
  ghost: string
  mode: "normal" | "shell"
  disabled?: boolean
  historyMode?: boolean
  historyTarget?: "prompt" | "timeline"
  autocompleteVisible: boolean
  focused: boolean
  cursorOffset: number
  inputLength: number
}) {
  if (!input.ghost) return false
  if (input.mode !== "normal") return false
  if (input.disabled) return false
  if (input.historyMode && input.historyTarget === "timeline") return false
  if (input.autocompleteVisible || !input.focused) return false
  if (input.cursorOffset !== input.inputLength) return false
  return true
}
