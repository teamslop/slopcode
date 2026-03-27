import { describe, expect, test } from "bun:test"
import { createSerialQueue } from "@slopcode-ai/util/serial-queue"
import { createRoot } from "solid-js"
import { usePromptQueueState } from "../../../src/cli/cmd/tui/component/prompt/queue-state"

const eventually = async (check: () => boolean | Promise<boolean>, timeout = 2000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await check()) return
    await Bun.sleep(10)
  }
  throw new Error("condition not met")
}

describe("prompt queue state", () => {
  test("tracks paused state reactively", async () => {
    const done = { first: false }
    const queue = createSerialQueue<{
      key: string
      ready: () => boolean
      done: () => boolean
      run: () => Promise<void>
    }>({ poll_ms: 5 })

    queue.push({
      key: "ses_1",
      ready: () => true,
      done: () => done.first,
      run: async () => {},
    })

    await eventually(() => queue.snapshot("ses_1").active !== undefined)

    let state = { paused: false }
    const stop = createRoot((dispose) => {
      state = usePromptQueueState(queue, () => "ses_1")
      return dispose
    })

    queue.pause("ses_1")
    await eventually(() => state.paused)

    queue.resume("ses_1")
    await eventually(() => !state.paused)

    done.first = true
    await eventually(() => !queue.busy("ses_1"))
    stop()
  })
})
