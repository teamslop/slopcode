import { createEffect, createMemo, createSignal, on } from "solid-js"
import { createSimpleContext } from "./helper"
import { useRoute } from "./route"
import { useSync } from "./sync"
import { pruneSessionTabs, visitSessionTabs, type SessionTabsState } from "./session-tabs-state"

export const { use: useSessionTabs, provider: SessionTabsProvider } = createSimpleContext({
  name: "SessionTabs",
  init: () => {
    const route = useRoute()
    const sync = useSync()
    const [state, setState] = createSignal<SessionTabsState>({ ids: [] })

    createEffect(
      on(
        () => {
          const data = route.data
          if (data.type !== "session") return
          return {
            sessionID: data.sessionID,
            source: data.source,
            parentID: sync.session.get(data.sessionID)?.parentID,
          }
        },
        (next) => {
          if (!next) return
          setState((state) =>
            visitSessionTabs(state, {
              sessionID: next.sessionID,
              source: next.source,
              root: next.source === "child" ? false : next.parentID === undefined ? undefined : !next.parentID,
            }),
          )
        },
        { defer: true },
      ),
    )

    createEffect(() => {
      const data = route.data
      const current = data.type === "session" ? data.sessionID : undefined
      const currentChild =
        data.type === "session" ? data.source === "child" || !!sync.session.get(data.sessionID)?.parentID : false
      const keep = new Set(
        state().ids.filter((id) => {
          if (id === current) return !currentChild
          const session = sync.session.get(id)
          if (!session) return false
          return !session.parentID
        }),
      )
      setState((state) => pruneSessionTabs(state, keep))
    })

    const tabs = createMemo(() =>
      state().ids.map((id) => {
        const session = sync.session.get(id)
        return {
          id,
          title: session?.title ?? id,
        }
      }),
    )

    const visible = createMemo(() => {
      const data = route.data
      if (data.type !== "session") return false
      if (data.source === "child") return false
      if (sync.session.get(data.sessionID)?.parentID) return false
      return tabs().length > 1
    })

    return {
      tabs,
      active: createMemo(() => state().active),
      visible,
      open(id: string) {
        route.navigate({
          type: "session",
          sessionID: id,
          source: "switch",
        })
      },
    }
  },
})
