import { createEffect, on, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"

type Queue = {
  snapshot: (key: string) => { paused?: unknown }
  subscribe: (listener: (key: string, snapshot: { paused?: unknown }) => void) => () => void
}

export function usePromptQueueState(queue: Queue, sessionID: () => string | undefined) {
  const [store, setStore] = createStore({ paused: false })

  const sync = () => {
    const id = sessionID()
    setStore("paused", !!id && !!queue.snapshot(id).paused)
  }

  createEffect(on(sessionID, sync))

  const off = queue.subscribe((key) => {
    if (key !== sessionID()) return
    sync()
  })

  onCleanup(off)

  return store
}
