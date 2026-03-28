import { beforeEach, describe, expect, mock, test } from "bun:test"

type Rule = {
  permission: string
  pattern: string
  action: string
}

const agent = {
  name: "helper",
  mode: "subagent" as const,
  description: "helper agent",
  permission: [] as Rule[],
}

let createdPermission: Rule[] = []
let promptTools: Record<string, boolean> | undefined

mock.module("../../src/agent/agent", () => ({
  Agent: {
    list: async () => [agent],
    get: async (name: string) => (name === agent.name ? agent : undefined),
  },
}))

mock.module("../../src/session", () => ({
  Session: {
    get: async () => undefined,
    create: async (input: { permission: Rule[] }) => {
      createdPermission = input.permission
      return { id: "subtask-session" }
    },
  },
}))

mock.module("../../src/session/message-v2", () => ({
  MessageV2: {
    get: async () => ({
      info: {
        role: "assistant",
        modelID: "model-id",
        providerID: "provider-id",
      },
    }),
  },
}))

mock.module("../../src/session/prompt", () => ({
  SessionPrompt: {
    cancel: () => {},
    resolvePromptParts: async (prompt: string) => [{ type: "text", text: prompt }],
    prompt: async (input: { tools: Record<string, boolean> }) => {
      promptTools = input.tools
      return { parts: [{ type: "text", text: "done" }] }
    },
  },
}))

mock.module("../../src/config/config", () => ({
  Config: {
    get: async () => ({ experimental: {} }),
  },
}))

mock.module("../../src/tool/truncation", () => ({
  Truncate: {
    output: async (content: string) => ({ content, truncated: false }),
  },
}))

const ctx = {
  sessionID: "session",
  messageID: "message",
  agent: "primary",
  abort: AbortSignal.abort(),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

beforeEach(() => {
  agent.permission = []
  createdPermission = []
  promptTools = undefined
})

describe("tool.task todo permissions", () => {
  test("keeps todo tools enabled when the subagent can use them", async () => {
    agent.permission = [
      { permission: "todowrite", pattern: "*", action: "allow" },
      { permission: "todoread", pattern: "*", action: "allow" },
    ]

    const { TaskTool } = await import("../../src/tool/task")
    const task = await TaskTool.init()

    await task.execute({ description: "helper task", prompt: "ship it", subagent_type: "helper" }, ctx)

    expect(createdPermission.some((rule) => rule.permission === "todowrite" && rule.action === "deny")).toBe(false)
    expect(createdPermission.some((rule) => rule.permission === "todoread" && rule.action === "deny")).toBe(false)
    expect(promptTools?.todowrite).toBeUndefined()
    expect(promptTools?.todoread).toBeUndefined()
  })

  test("keeps todo tools denied by default for subagents without permission", async () => {
    const { TaskTool } = await import("../../src/tool/task")
    const task = await TaskTool.init()

    await task.execute({ description: "helper task", prompt: "ship it", subagent_type: "helper" }, ctx)

    expect(createdPermission.some((rule) => rule.permission === "todowrite" && rule.action === "deny")).toBe(true)
    expect(createdPermission.some((rule) => rule.permission === "todoread" && rule.action === "deny")).toBe(true)
    expect(promptTools?.todowrite).toBe(false)
    expect(promptTools?.todoread).toBe(false)
  })
})
