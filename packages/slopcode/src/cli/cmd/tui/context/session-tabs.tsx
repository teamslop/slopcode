import { createEffect, createMemo, createSignal, on } from "solid-js"
import { Session as SessionApi } from "@/session"
import { createSimpleContext } from "./helper"
import { useRoute } from "./route"
import { useSync } from "./sync"
import {
  DRAFT_TAB_ID,
  activateTab,
  closeSessionTab,
  hasDraftTab,
  openDraftTab,
  promoteDraftTab,
  pruneSessionTabs,
  sessionWaiting,
  tabStatus,
  visitSessionTabs,
  type SessionTabsState,
} from "./session-tabs-state"

export const { use: useSessionTabs, provider: SessionTabsProvider } = createSimpleContext({
  name: "SessionTabs",
  init: () => {
    const route = useRoute()
    const sync = useSync()
    const [state, setState] = createSignal<SessionTabsState>({ tabs: [] })

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
      if (route.data.type !== "home") return
      if (!hasDraftTab(state())) return
      setState((state) => activateTab(state, DRAFT_TAB_ID))
    })

    createEffect(() => {
      const data = route.data
      const current = data.type === "session" ? data.sessionID : undefined
      const currentChild =
        data.type === "session" ? data.source === "child" || !!sync.session.get(data.sessionID)?.parentID : false
      const keep = new Set<string>(
        state().tabs.flatMap((tab) => {
          if (tab.type !== "session") return []
          if (tab.id === current) return currentChild ? [] : [tab.id]
          const session = sync.session.get(tab.id)
          if (!session) return []
          return session.parentID ? [] : [tab.id]
        }),
      )
      setState((state) => pruneSessionTabs(state, keep))
    })

    const tabs = createMemo(() =>
      state().tabs.map((tab) => {
        if (tab.type === "draft") {
          return {
            id: tab.id,
            title: "New Session",
            status: tabStatus({ draft: true, working: false, count: 0 }),
          }
        }

        const session = sync.session.get(tab.id)
        const current = sync.data.session_status?.[tab.id]
        const fallback = sync.session.status(tab.id)
        const waiting = sessionWaiting({
          sessionID: tab.id,
          sessions: sync.data.session,
          permission: sync.data.permission,
          question: sync.data.question,
        })
        const working = !waiting && (current ? current.type !== "idle" : fallback === "working" || fallback === "compacting")
        const count = sync.data.message[tab.id]?.length ?? 0
        const pending = tab.pendingTitle && (!session || SessionApi.isDefaultTitle(session.title))
        const status = tabStatus({ pending, waiting, working, count })
        if (pending) {
          return {
            id: tab.id,
            title: "New Session",
            status,
          }
        }

        return {
          id: tab.id,
          title: session?.title ?? tab.id,
          status,
        }
      }),
    )

    const ids = createMemo(() => state().tabs.map((tab) => tab.id))
    const hasDraft = createMemo(() => hasDraftTab(state()))
    const active = createMemo(() => state().active)
    const draftActive = createMemo(() => route.data.type === "home" && active() === DRAFT_TAB_ID)
    const visible = createMemo(() => {
      if (route.data.type === "home") return hasDraft()
      if (route.data.source === "child") return false
      if (sync.session.get(route.data.sessionID)?.parentID) return false
      return tabs().length > 1
    })

    return {
      tabs,
      ids,
      active,
      visible,
      hasDraft,
      draftActive,
      open(id: string) {
        if (id === DRAFT_TAB_ID) {
          setState((state) => activateTab(state, DRAFT_TAB_ID))
          route.navigate({ type: "home" })
          return
        }
        route.navigate({
          type: "session",
          sessionID: id,
          source: "switch",
        })
      },
      close(id: string) {
        const current = state()
        const next = closeSessionTab(current, id)
        if (next === current) return
        setState(next)
        const routeID = route.data.type === "home" ? DRAFT_TAB_ID : route.data.sessionID
        if (routeID !== id) return
        if (!next.active || next.active === DRAFT_TAB_ID) {
          route.navigate({ type: "home" })
          return
        }
        route.navigate({
          type: "session",
          sessionID: next.active,
          source: "switch",
        })
      },
      openDraft() {
        setState((state) => openDraftTab(state))
        route.navigate({ type: "home" })
      },
      promoteDraft(sessionID: string) {
        setState((state) => promoteDraftTab(state, { sessionID }))
      },
    }
  },
})
