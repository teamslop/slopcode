import type { SessionRouteSource } from "./route"

export type SessionTabsState = {
  ids: string[]
  active?: string
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
      ids: [input.sessionID],
      active: input.sessionID,
    }
  }
  if (state.ids.includes(input.sessionID)) {
    return {
      ids: state.ids,
      active: input.sessionID,
    }
  }
  return {
    ids: [...state.ids, input.sessionID],
    active: input.sessionID,
  }
}

export function pruneSessionTabs(state: SessionTabsState, keep: Set<string>): SessionTabsState {
  const ids = state.ids.filter((id) => keep.has(id))
  if (ids.length === state.ids.length) return state
  if (state.active && ids.includes(state.active)) {
    return {
      ids,
      active: state.active,
    }
  }
  return {
    ids,
    active: ids.at(-1),
  }
}
