type Item = {
  key: string
  ready: () => boolean
  done: () => boolean
  run: () => Promise<void>
  reject?: (error: unknown) => void
}

type Entry<T extends Item> = {
  active?: T
  queue: T[]
  running: boolean
}

type Snapshot<T extends Item> = {
  active?: T
  queue: T[]
}

export function createSerialQueue<T extends Item>(input?: { poll_ms?: number }) {
  const poll = input?.poll_ms ?? 32
  const state = new Map<string, Entry<T>>()
  const listeners = new Set<(key: string, snapshot: Snapshot<T>) => void>()
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

  const read = (key: string) => {
    const match = state.get(key)
    return {
      active: match?.active,
      queue: match ? [...match.queue] : [],
    }
  }

  const notify = (key: string) => {
    const next = read(key)
    listeners.forEach((listener) => listener(key, next))
  }

  const ensure = (key: string) => {
    const match = state.get(key)
    if (match) return match
    const next: Entry<T> = {
      queue: [],
      running: false,
    }
    state.set(key, next)
    return next
  }

  const trim = (key: string) => {
    const match = state.get(key)
    if (!match || match.running || match.active || match.queue.length > 0) return
    state.delete(key)
  }

  const reject = (items: T[], error: unknown) => {
    items.forEach((item) => item.reject?.(error))
  }

  const drain = async (key: string) => {
    const entry = ensure(key)
    if (entry.running) return
    entry.running = true

    try {
      while (entry.active || entry.queue.length > 0) {
        if (entry.active) {
          const current = entry.active
          while (entry.active === current && !current.done()) {
            await sleep(poll)
          }
          if (entry.active === current) {
            entry.active = undefined
            notify(key)
          }
          continue
        }

        const next = entry.queue[0]
        if (!next) continue
        if (!next.ready()) {
          await sleep(poll)
          continue
        }

        entry.queue.shift()
        entry.active = next
        notify(key)
        await next.run().catch((error) => {
          if (entry.active === next) {
            entry.active = undefined
            notify(key)
          }
          next.reject?.(error)
        })
      }
    } finally {
      entry.running = false
      trim(key)
      if (entry.active || entry.queue.length > 0) void drain(key)
    }
  }

  return {
    push(item: T) {
      ensure(item.key).queue.push(item)
      notify(item.key)
      void drain(item.key)
    },
    clear(key: string, input?: { active?: boolean; error?: unknown }) {
      const entry = state.get(key)
      if (!entry) return [] as T[]
      const error = input?.error ?? new DOMException("Aborted", "AbortError")
      const removed = entry.queue.splice(0)
      if (input?.active) entry.active = undefined
      reject(removed, error)
      notify(key)
      trim(key)
      return removed
    },
    busy(key: string) {
      const entry = state.get(key)
      return !!entry && (!!entry.active || entry.queue.length > 0)
    },
    queued(key: string) {
      return state.get(key)?.queue.length ?? 0
    },
    snapshot(key: string) {
      return read(key)
    },
    subscribe(listener: (key: string, snapshot: Snapshot<T>) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
