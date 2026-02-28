import { createSlopcodeClient } from "@slopcode-ai/sdk/v2/client"
import type { ServerConnection } from "@/context/server"

export function createSdkForServer({
  server,
  ...config
}: Omit<NonNullable<Parameters<typeof createSlopcodeClient>[0]>, "baseUrl"> & {
  server: ServerConnection.HttpBase
}) {
  const auth = (() => {
    if (!server.password) return
    return {
      Authorization: `Basic ${btoa(`${server.username ?? "slopcode"}:${server.password}`)}`,
    }
  })()

  return createSlopcodeClient({
    ...config,
    headers: { ...config.headers, ...auth },
    baseUrl: server.url,
  })
}
