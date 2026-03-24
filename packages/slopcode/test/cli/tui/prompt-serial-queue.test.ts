import { describe, expect, test } from "bun:test"
import { createSerialQueue } from "@slopcode-ai/util/serial-queue"

const eventually = async (check: () => boolean | Promise<boolean>, timeout = 2000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await check()) return
    await Bun.sleep(10)
  }
  throw new Error("condition not met")
}

describe("serial prompt queue", () => {
  test("drains one queued prompt at a time", async () => {
    const done = {
      first: false,
      second: false,
    }
    const calls: string[] = []
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
      run: async () => {
        calls.push("first")
      },
    })
    queue.push({
      key: "ses_1",
      ready: () => true,
      done: () => done.second,
      run: async () => {
        calls.push("second")
      },
    })

    await eventually(() => calls.length === 1)
    expect(calls).toEqual(["first"])

    done.first = true

    await eventually(() => calls.length === 2)
    expect(calls).toEqual(["first", "second"])

    done.second = true
    await Bun.sleep(20)
  })

  test("clears queued prompts without starting them", async () => {
    const calls: string[] = []
    const rejected: string[] = []
    const queue = createSerialQueue<{
      key: string
      ready: () => boolean
      done: () => boolean
      run: () => Promise<void>
      reject: (error: unknown) => void
    }>({ poll_ms: 5 })

    queue.push({
      key: "ses_1",
      ready: () => true,
      done: () => false,
      run: async () => {
        calls.push("first")
      },
      reject: () => {
        rejected.push("first")
      },
    })
    queue.push({
      key: "ses_1",
      ready: () => false,
      done: () => false,
      run: async () => {
        calls.push("second")
      },
      reject: () => {
        rejected.push("second")
      },
    })

    await eventually(() => calls.length === 1)

    queue.clear("ses_1", { active: true })
    await Bun.sleep(20)

    expect(calls).toEqual(["first"])
    expect(rejected).toEqual(["second"])
    expect(queue.busy("ses_1")).toBe(false)
  })
})
