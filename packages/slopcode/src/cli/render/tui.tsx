import { RGBA, SyntaxStyle } from "@opentui/core"
import { For, Match, Switch } from "solid-js"
import { Flag } from "@/flag/flag"
import type { RichSegment } from "./types"

type Props = {
  conceal: boolean
  segments: RichSegment[]
  syntaxStyle: SyntaxStyle
  text: RGBA
}

export function RichSegments(props: Props) {
  return (
    <box flexDirection="column">
      <For each={props.segments}>
        {(segment) => (
          <Switch>
            <Match when={segment.kind === "markdown" && Flag.SLOPCODE_EXPERIMENTAL_MARKDOWN}>
              <markdown
                conceal={props.conceal}
                content={segment.kind === "markdown" ? segment.text : ""}
                streaming={true}
                syntaxStyle={props.syntaxStyle}
              />
            </Match>
            <Match when={segment.kind === "markdown" && !Flag.SLOPCODE_EXPERIMENTAL_MARKDOWN}>
              <code
                conceal={props.conceal}
                content={segment.kind === "markdown" ? segment.text : ""}
                drawUnstyledText={false}
                fg={props.text}
                filetype="markdown"
                streaming={true}
                syntaxStyle={props.syntaxStyle}
              />
            </Match>
            <Match when={segment.kind === "code"}>
              <code
                conceal={props.conceal}
                content={segment.kind === "code" ? segment.text : ""}
                drawUnstyledText={false}
                fg={props.text}
                filetype={segment.kind === "code" ? segment.filetype : "text"}
                streaming={true}
                syntaxStyle={props.syntaxStyle}
              />
            </Match>
            <Match when={true}>
              <text fg={props.text}>{segment.text}</text>
            </Match>
          </Switch>
        )}
      </For>
    </box>
  )
}
