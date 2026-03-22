import { useTerminalDimensions } from "@opentui/solid"
import { TextAttributes } from "@opentui/core"
import { createMemo, createSignal, For, Show } from "solid-js"
import { useSessionTabs } from "@tui/context/session-tabs"
import { useTheme } from "@tui/context/theme"
import { Locale } from "@/util/locale"
import { layoutSessionStrip, SessionStripText } from "./session-strip-layout"

const MAX_TITLE = 15
const HORIZONTAL_PADDING = 4

export function SessionStrip() {
  const tabs = useSessionTabs()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const [hover, setHover] = createSignal<string>()
  const items = createMemo(() =>
    tabs.tabs().map((tab) => ({
      id: tab.id,
      title: Locale.truncate(tab.title, MAX_TITLE),
    })),
  )
  const layout = createMemo(() =>
    layoutSessionStrip(items(), {
      active: tabs.active(),
      width: Math.max(0, dimensions().width - HORIZONTAL_PADDING),
    }),
  )

  return (
    <Show when={tabs.visible()}>
      <box flexShrink={0} backgroundColor={theme.backgroundPanel}>
        <box flexDirection="row" paddingLeft={2} paddingRight={2}>
          <For each={layout().tabs}>
            {(tab, index) => {
              const active = () => tabs.active() === tab.id
              const fg = () => {
                if (active()) return theme.accent
                if (hover() === tab.id) return theme.text
                return theme.textMuted
              }
              return (
                <>
                  <Show when={index() > 0}>
                    <text fg={theme.textMuted}>{SessionStripText.SEP}</text>
                  </Show>
                  <box
                    onMouseOver={() => setHover(tab.id)}
                    onMouseOut={() => setHover(undefined)}
                    onMouseUp={() => tabs.open(tab.id)}
                  >
                    <text fg={fg()} attributes={active() ? TextAttributes.BOLD : undefined} wrapMode="none">
                      {active() ? SessionStripText.ACTIVE : ""}
                      {tab.title}
                    </text>
                  </box>
                </>
              )
            }}
          </For>
          <Show when={layout().hidden > 0}>
            <text
              fg={theme.textMuted}
            >{`${layout().tabs.length > 0 ? SessionStripText.SEP : ""}+${layout().hidden}`}</text>
          </Show>
        </box>
        <box paddingLeft={2} paddingRight={2}>
          <text fg={theme.border} wrapMode="none">
            {layout().underline}
          </text>
        </box>
      </box>
    </Show>
  )
}
