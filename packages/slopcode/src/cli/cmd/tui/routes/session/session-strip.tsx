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
  const edge = () => theme.border
  const bg = (id: string) => (hover() === id ? theme.backgroundElement : undefined)
  const closeVisible = (id: string) => hover() === id
  const closeFg = (id: string) => (closeVisible(id) ? theme.text : theme.textMuted)
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
      <box flexShrink={0} flexDirection="column" backgroundColor={theme.backgroundPanel}>
        <box height={1} flexDirection="row" paddingLeft={2} paddingRight={2}>
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
                    <text fg={edge()}>{SessionStripText.SEP}</text>
                  </Show>
                  <box
                    flexDirection="row"
                    backgroundColor={bg(tab.id)}
                    onMouseOver={() => setHover(tab.id)}
                    onMouseOut={() => setHover(undefined)}
                  >
                    <box onMouseUp={() => tabs.open(tab.id)}>
                      <text fg={fg()} attributes={active() ? TextAttributes.BOLD : undefined} wrapMode="none">
                        {active() ? SessionStripText.ACTIVE : ""}
                        {tab.title}{" "}
                      </text>
                    </box>
                    <box
                      onMouseUp={
                        closeVisible(tab.id)
                          ? (evt) => {
                              evt.stopPropagation()
                              setHover(undefined)
                              tabs.close(tab.id)
                            }
                          : undefined
                      }
                    >
                      <text fg={closeFg(tab.id)} wrapMode="none">
                        {closeVisible(tab.id) ? SessionStripText.CLOSE : " "}
                      </text>
                    </box>
                  </box>
                </>
              )
            }}
          </For>
          <Show when={layout().hidden > 0}>
            <Show when={layout().tabs.length > 0}>
              <text fg={edge()}>{SessionStripText.SEP}</text>
            </Show>
            <text fg={theme.textMuted}>{`+${layout().hidden}`}</text>
          </Show>
        </box>
        <box height={1} paddingLeft={2} paddingRight={2}>
          <text fg={edge()} wrapMode="none">
            {layout().underline}
          </text>
        </box>
      </box>
    </Show>
  )
}
