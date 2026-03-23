import { useTerminalDimensions } from "@opentui/solid"
import { TextAttributes, type RGBA } from "@opentui/core"
import { createMemo, createSignal, For, Show } from "solid-js"
import { useSessionTabs } from "@tui/context/session-tabs"
import { useTheme } from "@tui/context/theme"
import { Locale } from "@/util/locale"
import {
  layoutSessionStrip,
  sessionStripTabClose,
  sessionStripTabLabel,
  SessionStripText,
  type SessionStripTab,
} from "./session-strip-layout"

const MAX_TITLE = 15
const HORIZONTAL_PADDING = 4

type SessionStripViewProps = {
  tabs: SessionStripTab[]
  active?: string
  hidden: number
  underline: string
  colors: {
    accent: RGBA
    edge: RGBA
    hover: RGBA
    panel: RGBA
    text: RGBA
    muted: RGBA
  }
  open(id: string): void
  close(id: string): void
}

export function SessionStripView(props: SessionStripViewProps) {
  const [hover, setHover] = createSignal<string>()
  const bg = (id: string) => (hover() === id ? props.colors.hover : props.colors.panel)
  const closeVisible = (id: string) => hover() === id
  const closeFg = (id: string) => (closeVisible(id) ? props.colors.text : props.colors.muted)

  return (
    <box flexShrink={0} flexDirection="column" backgroundColor={props.colors.panel}>
      <box height={1} flexDirection="row" paddingLeft={2} paddingRight={2}>
        <For each={props.tabs}>
          {(tab) => {
            const active = () => props.active === tab.id
            const fg = () => {
              if (active()) return props.colors.accent
              if (hover() === tab.id) return props.colors.text
              return props.colors.muted
            }
            return (
              <>
                <box
                  flexDirection="row"
                  backgroundColor={bg(tab.id)}
                  onMouseOver={() => setHover(tab.id)}
                  onMouseOut={() => setHover(undefined)}
                >
                  <box onMouseUp={() => props.open(tab.id)}>
                    <text fg={fg()} attributes={active() ? TextAttributes.BOLD : undefined} wrapMode="none">
                      {sessionStripTabLabel(tab, active())}
                    </text>
                  </box>
                  <box
                    onMouseUp={
                      closeVisible(tab.id)
                        ? (evt) => {
                            evt.stopPropagation()
                            setHover(undefined)
                            props.close(tab.id)
                          }
                        : undefined
                    }
                  >
                    <text fg={closeFg(tab.id)} wrapMode="none">
                      {sessionStripTabClose(closeVisible(tab.id))}
                    </text>
                  </box>
                </box>
                <text fg={props.colors.edge}>{SessionStripText.SEP}</text>
              </>
            )
          }}
        </For>
        <Show when={props.hidden > 0}>
          <text fg={props.colors.muted}>{`+${props.hidden}`}</text>
        </Show>
      </box>
      <box height={1} paddingLeft={2} paddingRight={2}>
        <text fg={props.colors.edge} wrapMode="none">
          {props.underline}
        </text>
      </box>
    </box>
  )
}

export function SessionStrip() {
  const tabs = useSessionTabs()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
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
  const colors = createMemo(() => ({
    accent: theme.accent,
    edge: theme.border,
    hover: theme.backgroundElement,
    panel: theme.backgroundPanel,
    text: theme.text,
    muted: theme.textMuted,
  }))

  return (
    <Show when={tabs.visible()}>
      <SessionStripView
        tabs={layout().tabs}
        active={tabs.active()}
        hidden={layout().hidden}
        underline={layout().underline}
        colors={colors()}
        open={(id) => tabs.open(id)}
        close={(id) => tabs.close(id)}
      />
    </Show>
  )
}
