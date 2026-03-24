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

  test("publishes queue snapshots for rendering", async () => {
    const done = {
      first: false,
      second: false,
    }
    const seen: Array<{ active?: string; paused?: string; queue: string[] }> = []
    const queue = createSerialQueue<{
      key: string
      label: string
      ready: () => boolean
      done: () => boolean
      run: () => Promise<void>
    }>({ poll_ms: 5 })

    const off = queue.subscribe(
      (
        key: string,
        snapshot: { active?: { label: string }; paused?: { label: string }; queue: Array<{ label: string }> },
      ) => {
        if (key !== "ses_1") return
        seen.push({
          active: snapshot.active?.label,
          paused: snapshot.paused?.label,
          queue: snapshot.queue.map((item) => item.label),
        })
      },
    )

    queue.push({
      key: "ses_1",
      label: "first",
      ready: () => true,
      done: () => done.first,
      run: async () => {},
    })
    queue.push({
      key: "ses_1",
      label: "second",
      ready: () => true,
      done: () => done.second,
      run: async () => {},
    })

    await eventually(() => {
      const snapshot = queue.snapshot("ses_1")
      return snapshot.active?.label === "first" && snapshot.queue[0]?.label === "second"
    })

    expect(seen.some((item) => item.active === "first" && item.queue[0] === "second")).toBe(true)

    done.first = true

    await eventually(() => queue.snapshot("ses_1").active?.label === "second")

    done.second = true

    await eventually(() => !queue.busy("ses_1"))
    off()
  })

  test("clears queued items without dropping the active snapshot", async () => {
    const done = {
      first: false,
      second: false,
    }
    const queue = createSerialQueue<{
      key: string
      label: string
      ready: () => boolean
      done: () => boolean
      run: () => Promise<void>
    }>({ poll_ms: 5 })

    queue.push({
      key: "ses_1",
      label: "first",
      ready: () => true,
      done: () => done.first,
      run: async () => {},
    })
    queue.push({
      key: "ses_1",
      label: "second",
      ready: () => true,
      done: () => done.second,
      run: async () => {},
    })

    await eventually(() => queue.snapshot("ses_1").queue.length === 1)

    queue.clear("ses_1")

    const snapshot = queue.snapshot("ses_1")
    expect(snapshot.active?.label).toBe("first")
    expect(snapshot.queue).toHaveLength(0)

    done.first = true
    await eventually(() => !queue.busy("ses_1"))
  })

  test("removes one queued item without affecting the rest", async () => {
    const done = {
      first: false,
      second: false,
      third: false,
    }
    const queue = createSerialQueue<{
      key: string
      id: string
      label: string
      ready: () => boolean
      done: () => boolean
      run: () => Promise<void>
    }>({ poll_ms: 5 })

    queue.push({
      key: "ses_1",
      id: "first",
      label: "first",
      ready: () => true,
      done: () => done.first,
      run: async () => {},
    })
    queue.push({
      key: "ses_1",
      id: "second",
      label: "second",
      ready: () => true,
      done: () => done.second,
      run: async () => {},
    })
    queue.push({
      key: "ses_1",
      id: "third",
      label: "third",
      ready: () => true,
      done: () => done.third,
      run: async () => {},
    })

    await eventually(() => queue.snapshot("ses_1").queue.length === 2)

    queue.remove("ses_1", (item) => item.id === "second")

    const snapshot = queue.snapshot("ses_1")
    expect(snapshot.active?.id).toBe("first")
    expect(snapshot.queue.map((item) => item.id)).toEqual(["third"])

    done.first = true
    await eventually(() => queue.snapshot("ses_1").active?.id === "third")

    done.third = true
    await eventually(() => !queue.busy("ses_1"))
  })

  test("pauses the active item without dropping queued items", async () => {
    const done = {
      first: false,
      second: false,
    }
    const queue = createSerialQueue<{
      key: string
      label: string
      ready: () => boolean
      done: () => boolean
      run: () => Promise<void>
    }>({ poll_ms: 5 })

    queue.push({
      key: "ses_1",
      label: "first",
      ready: () => true,
      done: () => done.first,
      run: async () => {},
    })
    queue.push({
      key: "ses_1",
      label: "second",
      ready: () => true,
      done: () => done.second,
      run: async () => {},
    })

    await eventually(() => queue.snapshot("ses_1").active?.label === "first")
    queue.pause("ses_1")

    const snapshot = queue.snapshot("ses_1")
    expect(snapshot.active).toBeUndefined()
    expect(snapshot.paused?.label).toBe("first")
    expect(snapshot.queue.map((item) => item.label)).toEqual(["second"])
    expect(queue.busy("ses_1")).toBe(true)

    await Bun.sleep(20)
    expect(queue.snapshot("ses_1").active).toBeUndefined()
  })

  test("resumes a paused item before the queued items", async () => {
    const done = {
      first: false,
      second: false,
    }
    const calls: string[] = []
    const queue = createSerialQueue<{
      key: string
      label: string
      ready: () => boolean
      done: () => boolean
      run: () => Promise<void>
    }>({ poll_ms: 5 })

    queue.push({
      key: "ses_1",
      label: "first",
      ready: () => true,
      done: () => done.first,
      run: async () => {
        calls.push("first")
      },
    })
    queue.push({
      key: "ses_1",
      label: "second",
      ready: () => true,
      done: () => done.second,
      run: async () => {
        calls.push("second")
      },
    })

    await eventually(() => calls.length === 1)
    queue.pause("ses_1")
    await Bun.sleep(20)
    expect(calls).toEqual(["first"])

    queue.resume("ses_1")
    expect(queue.snapshot("ses_1").active?.label).toBe("first")

    done.first = true
    await eventually(() => queue.snapshot("ses_1").active?.label === "second")
    expect(calls).toEqual(["first", "second"])

    done.second = true
    await eventually(() => !queue.busy("ses_1"))
  })

  test("runs an injected prompt before the existing queue after clearing paused", async () => {
    const done = {
      first: false,
      second: false,
      third: false,
    }
    const calls: string[] = []
    const queue = createSerialQueue<{
      key: string
      label: string
      ready: () => boolean
      done: () => boolean
      run: () => Promise<void>
    }>({ poll_ms: 5 })

    queue.push({
      key: "ses_1",
      label: "first",
      ready: () => true,
      done: () => done.first,
      run: async () => {
        calls.push("first")
      },
    })
    queue.push({
      key: "ses_1",
      label: "second",
      ready: () => true,
      done: () => done.second,
      run: async () => {
        calls.push("second")
      },
    })

    await eventually(() => calls.length === 1)
    queue.pause("ses_1")
    queue.clearPaused("ses_1")
    queue.unshift({
      key: "ses_1",
      label: "third",
      ready: () => true,
      done: () => done.third,
      run: async () => {
        calls.push("third")
      },
    })

    await eventually(() => queue.snapshot("ses_1").active?.label === "third")
    expect(queue.snapshot("ses_1").queue.map((item) => item.label)).toEqual(["second"])

    done.third = true
    await eventually(() => queue.snapshot("ses_1").active?.label === "second")
    expect(calls).toEqual(["first", "third", "second"])

    done.second = true
    await eventually(() => !queue.busy("ses_1"))
  })
})
