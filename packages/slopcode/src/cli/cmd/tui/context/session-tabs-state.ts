import { unwrap } from "solid-js/store"
import type { PromptInfo } from "../component/prompt/history"
import type { SessionRouteSource } from "./route"

export const DRAFT_TAB_ID = "__draft__"

export type SessionTab =
  | {
      type: "session"
      id: string
      pendingTitle?: boolean
    }
  | {
      type: "draft"
      id: typeof DRAFT_TAB_ID
      prompt: PromptInfo
    }

export type SessionTabsState = {
  tabs: SessionTab[]
  active?: string
}

const blank = {
  input: "",
  parts: [],
} satisfies PromptInfo

const isDraft = (tab: SessionTab): tab is Extract<SessionTab, { type: "draft" }> => tab.type === "draft"
const isSession = (tab: SessionTab): tab is Extract<SessionTab, { type: "session" }> => tab.type === "session"
const clonePrompt = (prompt?: PromptInfo) => structuredClone(unwrap(prompt ?? blank))

export function activateTab(state: SessionTabsState, id: string): SessionTabsState {
  if (state.active === id) return state
  return {
    tabs: state.tabs,
    active: id,
  }
}

export function hasDraftTab(state: SessionTabsState) {
  return state.tabs.some(isDraft)
}

export function getDraftPrompt(state: SessionTabsState) {
  return state.tabs.find(isDraft)?.prompt
}

export function openDraftTab(
  state: SessionTabsState,
  input?: {
    prompt?: PromptInfo
  },
): SessionTabsState {
  if (hasDraftTab(state)) return activateTab(state, DRAFT_TAB_ID)
  return {
    tabs: [...state.tabs, { type: "draft", id: DRAFT_TAB_ID, prompt: clonePrompt(input?.prompt) }],
    active: DRAFT_TAB_ID,
  }
}

export function saveDraftPrompt(state: SessionTabsState, prompt: PromptInfo): SessionTabsState {
  const next = clonePrompt(prompt)
  const current = getDraftPrompt(state)
  if (!current) return state
  if (Bun.deepEquals(current, next)) return state
  return {
    tabs: state.tabs.map((tab) => (isDraft(tab) ? { ...tab, prompt: next } : tab)),
    active: state.active,
  }
}

export function promoteDraftTab(
  state: SessionTabsState,
  input: {
    sessionID: string
  },
): SessionTabsState {
  const existing = state.tabs.findIndex((tab) => isSession(tab) && tab.id === input.sessionID)
  if (existing !== -1) {
    return {
      tabs: state.tabs
        .filter((tab) => !isDraft(tab))
        .map((tab) => (isSession(tab) && tab.id === input.sessionID ? { ...tab, pendingTitle: true } : tab)),
      active: input.sessionID,
    }
  }

  const index = state.tabs.findIndex(isDraft)
  if (index === -1) {
    return {
      tabs: [...state.tabs, { type: "session", id: input.sessionID, pendingTitle: true }],
      active: input.sessionID,
    }
  }

  const tabs = state.tabs.slice()
  tabs[index] = { type: "session", id: input.sessionID, pendingTitle: true }
  return {
    tabs,
    active: input.sessionID,
  }
}

export function visitSessionTabs(
  state: SessionTabsState,
  input: {
    sessionID: string
    source?: SessionRouteSource
    root?: boolean
  },
): SessionTabsState {
  if (input.source === "child") return state
  if (input.root === false) return state
  if (input.source === "new") {
    return {
      tabs: [{ type: "session", id: input.sessionID }],
      active: input.sessionID,
    }
  }
  if (state.tabs.some((tab) => isSession(tab) && tab.id === input.sessionID)) {
    return {
      tabs: state.tabs,
      active: input.sessionID,
    }
  }
  return {
    tabs: [...state.tabs, { type: "session", id: input.sessionID }],
    active: input.sessionID,
  }
}

export function pruneSessionTabs(state: SessionTabsState, keep: Set<string>): SessionTabsState {
  const tabs = state.tabs.filter((tab) => isDraft(tab) || keep.has(tab.id))
  if (tabs.length === state.tabs.length) return state
  if (state.active && tabs.some((tab) => tab.id === state.active)) {
    return {
      tabs,
      active: state.active,
    }
  }
  return {
    tabs,
    active: tabs.at(-1)?.id,
  }
}
