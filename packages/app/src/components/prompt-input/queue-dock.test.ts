import { beforeAll, describe, expect, mock, test } from "bun:test"

let promptQueueRows: typeof import("./queue-dock").promptQueueRows
let promptQueueVisible: typeof import("./queue-dock").promptQueueVisible

beforeAll(async () => {
  mock.module("@solidjs/router", () => ({
    useNavigate: () => () => undefined,
    useParams: () => ({}),
  }))
  mock.module("@slopcode-ai/ui/button", () => ({
    Button: (props: { children?: unknown }) => props.children,
  }))
  mock.module("@slopcode-ai/ui/dock-surface", () => ({
    DockTray: (props: { children?: unknown }) => props.children,
  }))
  mock.module("@slopcode-ai/ui/icon-button", () => ({
    IconButton: () => null,
  }))
  mock.module("@/context/sdk", () => ({
    useSDK: () => ({ directory: "/repo/main" }),
  }))

  const mod = await import("./queue-dock")
  promptQueueRows = mod.promptQueueRows
  promptQueueVisible = mod.promptQueueVisible
})

describe("prompt queue dock", () => {
  test("stays hidden when only the active item exists", () => {
    expect(
      promptQueueVisible({
        queue: [],
      }),
    ).toBe(false)
  })

  test("shows when queued items exist", () => {
    expect(
      promptQueueVisible({
        queue: [
          {
            key: "session",
            id: "queued-1",
            summary: "queued prompt",
            ready: () => false,
            done: () => false,
            run: async () => undefined,
            reject: () => undefined,
          },
        ],
      }),
    ).toBe(true)
  })

  test("keeps the active item visible and relabels it as Active", () => {
    expect(
      promptQueueRows({
        active: {
          key: "session",
          id: "active-1",
          summary: "first prompt",
          ready: () => true,
          done: () => false,
          run: async () => undefined,
          reject: () => undefined,
        },
        queue: [
          {
            key: "session",
            id: "queued-1",
            summary: "second prompt",
            ready: () => false,
            done: () => false,
            run: async () => undefined,
            reject: () => undefined,
          },
        ],
      }),
    ).toEqual([
      {
        id: "active-1",
        label: "Active",
        summary: "first prompt",
        detail: undefined,
      },
      {
        id: "queued-1",
        label: "Queued",
        summary: "second prompt",
        detail: undefined,
      },
    ])
  })
})
