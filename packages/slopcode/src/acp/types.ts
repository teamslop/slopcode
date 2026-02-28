import type { McpServer } from "@agentclientprotocol/sdk"
import type { SlopcodeClient } from "@slopcode-ai/sdk/v2"

export interface ACPSessionState {
  id: string
  cwd: string
  mcpServers: McpServer[]
  createdAt: Date
  model?: {
    providerID: string
    modelID: string
  }
  variant?: string
  modeId?: string
}

export interface ACPConfig {
  sdk: SlopcodeClient
  defaultModel?: {
    providerID: string
    modelID: string
  }
}
