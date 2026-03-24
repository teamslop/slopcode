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

export function createSerialQueue<T extends Item>(input?: { poll_ms?: number }) {
  const poll = input?.poll_ms ?? 32
  const state = new Map<string, Entry<T>>()
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

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
          if (entry.active === current) entry.active = undefined
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
        await next.run().catch((error) => {
          if (entry.active === next) entry.active = undefined
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
      void drain(item.key)
    },
    clear(key: string, input?: { active?: boolean; error?: unknown }) {
      const entry = state.get(key)
      if (!entry) return [] as T[]
      const error = input?.error ?? new DOMException("Aborted", "AbortError")
      const removed = entry.queue.splice(0)
      if (input?.active) entry.active = undefined
      reject(removed, error)
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
  }
}
