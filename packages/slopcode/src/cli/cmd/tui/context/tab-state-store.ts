import type { PromptInfo } from "../component/prompt/history"

export type TabModel = {
  providerID: string
  modelID: string
}

export type TabSelection = {
  agent?: string
  model: Record<string, TabModel>
  variant: Record<string, string | undefined>
}

export type TabState = {
  prompt: PromptInfo
  selection: TabSelection
}

export type TabStateStore = Record<string, TabState>

export function blankPrompt(): PromptInfo {
  return {
    input: "",
    parts: [],
    mode: "normal",
  }
}

export function blankSelection(): TabSelection {
  return {
    model: {},
    variant: {},
  }
}

export function blankTabState(): TabState {
  return {
    prompt: blankPrompt(),
    selection: blankSelection(),
  }
}

export function clonePrompt(prompt?: PromptInfo): PromptInfo {
  return structuredClone(prompt ?? blankPrompt())
}

export function cloneSelection(selection?: Partial<TabSelection>): TabSelection {
  return {
    agent: selection?.agent,
    model: structuredClone(selection?.model ?? {}),
    variant: structuredClone(selection?.variant ?? {}),
  }
}

export function cloneTabState(state?: Partial<TabState>): TabState {
  return {
    prompt: clonePrompt(state?.prompt),
    selection: cloneSelection(state?.selection),
  }
}

export function getTabState(store: TabStateStore, id: string) {
  return store[id] ?? blankTabState()
}

export function ensureTabState(store: TabStateStore, id: string) {
  store[id] ??= blankTabState()
  return store[id]
}

export function setTabPrompt(store: TabStateStore, id: string, prompt: PromptInfo) {
  const next = clonePrompt(prompt)
  const current = getTabState(store, id).prompt
  if (current.input === next.input && current.mode === next.mode && Bun.deepEquals(current.parts, next.parts)) return
  ensureTabState(store, id).prompt = next
}

export function clearTabPrompt(store: TabStateStore, id: string) {
  setTabPrompt(store, id, blankPrompt())
}

export function setTabAgent(store: TabStateStore, id: string, agent: string | undefined) {
  const selection = ensureTabState(store, id).selection
  if (selection.agent === agent) return
  selection.agent = agent
}

export function setTabModel(store: TabStateStore, id: string, agent: string, model: TabModel) {
  const selection = ensureTabState(store, id).selection
  const current = selection.model[agent]
  if (current?.providerID === model.providerID && current.modelID === model.modelID) return
  selection.model[agent] = structuredClone(model)
}

export function setTabVariant(store: TabStateStore, id: string, key: string, variant: string | undefined) {
  const selection = ensureTabState(store, id).selection
  if (selection.variant[key] === variant) return
  selection.variant[key] = variant
}

export function copyTabSelection(store: TabStateStore, sourceID: string, targetID: string) {
  ensureTabState(store, targetID).selection = cloneSelection(getTabState(store, sourceID).selection)
}

export function copyTabState(
  store: TabStateStore,
  sourceID: string,
  targetID: string,
  input?: { prompt?: "copy" | "reset" },
) {
  const source = getTabState(store, sourceID)
  ensureTabState(store, targetID).selection = cloneSelection(source.selection)
  ensureTabState(store, targetID).prompt = input?.prompt === "reset" ? blankPrompt() : clonePrompt(source.prompt)
}

export function removeTabState(store: TabStateStore, id: string) {
  delete store[id]
}
