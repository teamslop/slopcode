import { createSlopcodeClient, type Event } from "@slopcode-ai/sdk/v2"
import { createSimpleContext } from "./helper"
import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { batch, onCleanup, onMount } from "solid-js"

export type EventSource = {
  on: (handler: (event: Event) => void) => () => void
  setDirectory?: (directory?: string) => void
}

export const { use: useSDK, provider: SDKProvider } = createSimpleContext({
  name: "SDK",
  init: (props: {
    url: string
    directory?: string
    fetch?: typeof fetch
    headers?: RequestInit["headers"]
    events?: EventSource
  }) => {
    const abort = new AbortController()
    const baseDirectory = props.directory
    let directory = props.directory
    let sseAbort: AbortController | undefined

    function createSDK(nextDirectory: string | undefined) {
      return createSlopcodeClient({
        baseUrl: props.url,
        signal: abort.signal,
        directory: nextDirectory,
        fetch: props.fetch,
        headers: props.headers,
      })
    }

    let sdk = createSDK(directory)

    const emitter = createGlobalEmitter<{
      [key in Event["type"]]: Extract<Event, { type: key }>
    }>()

    let queue: Event[] = []
    let timer: Timer | undefined
    let last = 0

    const flush = () => {
      if (queue.length === 0) return
      const events = queue
      queue = []
      timer = undefined
      last = Date.now()
      batch(() => {
        for (const event of events) {
          emitter.emit(event.type, event)
        }
      })
    }

    const handleEvent = (event: Event) => {
      queue.push(event)
      const elapsed = Date.now() - last

      if (timer) return
      if (elapsed < 16) {
        timer = setTimeout(flush, 16)
        return
      }
      flush()
    }

    function startSSE() {
      sseAbort?.abort()
      const ctrl = new AbortController()
      sseAbort = ctrl
      ;(async () => {
        while (true) {
          if (abort.signal.aborted || ctrl.signal.aborted) break
          const events = await sdk.event
            .subscribe(
              {},
              {
                signal: ctrl.signal,
              },
            )
            .catch(() => undefined)
          if (!events) {
            await Bun.sleep(250)
            continue
          }

          for await (const event of events.stream) {
            if (ctrl.signal.aborted) break
            handleEvent(event)
          }

          if (timer) clearTimeout(timer)
          if (queue.length > 0) flush()
        }
      })().catch(() => {})
    }

    onMount(() => {
      if (props.events) {
        const unsub = props.events.on(handleEvent)
        onCleanup(unsub)
      } else {
        startSSE()
      }
    })

    onCleanup(() => {
      abort.abort()
      sseAbort?.abort()
      if (timer) clearTimeout(timer)
    })

    return {
      get client() {
        return sdk
      },
      get directory() {
        return directory
      },
      get baseDirectory() {
        return baseDirectory
      },
      event: emitter,
      fetch: props.fetch ?? fetch,
      setDirectory(next?: string) {
        const target = next ?? baseDirectory
        if (target === directory) return
        directory = target
        sdk = createSDK(target)
        props.events?.setDirectory?.(target)
        if (!props.events) startSSE()
      },
      url: props.url,
    }
  },
})
