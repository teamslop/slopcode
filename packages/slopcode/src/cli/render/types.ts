export type RichSegment =
  | {
      kind: "markdown"
      text: string
    }
  | {
      kind: "code"
      text: string
      filetype: string
    }
  | {
      kind: "plain"
      text: string
    }
