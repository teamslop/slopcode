import type { KVNamespaceListOptions, KVNamespaceListResult, KVNamespacePutOptions } from "@cloudflare/workers-types"
import { Resource as ResourceBase } from "sst"
import Cloudflare from "cloudflare"

function parse(value: unknown) {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function stage() {
  if (process.env.VERCEL_ENV === "production") return "production"
  return "dev"
}

function raw(prop: string) {
  const env = globalThis as typeof globalThis & { __env__?: Record<string, unknown> }
  if (env.__env__ && prop in env.__env__) return env.__env__[prop]
  if (env.__env__ && prop === "App" && "SST_RESOURCE_App" in env.__env__) return parse(env.__env__.SST_RESOURCE_App)
  if (process.env[`SST_RESOURCE_${prop}`] !== undefined) return parse(process.env[`SST_RESOURCE_${prop}`])
  if (process.env[prop] !== undefined) return parse(process.env[prop])
  if (prop in ResourceBase) return ResourceBase[prop as keyof typeof ResourceBase]
  if (prop === "App") return { stage: stage() }
}

function secret(prop: string) {
  const value = raw(prop)
  if (!value) return
  if (typeof value === "string") return value
  if (typeof value === "object" && "value" in value) return String(value.value)
}

function kv(value: { namespaceId: string }) {
  const apiToken = secret("CLOUDFLARE_API_TOKEN")
  const accountId = secret("CLOUDFLARE_DEFAULT_ACCOUNT_ID")
  const client = new Cloudflare({ apiToken })
  return {
    get: (k: string | string[]) => {
      const isMulti = Array.isArray(k)
      return client.kv.namespaces
        .bulkGet(value.namespaceId, {
          keys: isMulti ? k : [k],
          account_id: accountId!,
        })
        .then((result) => (isMulti ? new Map(Object.entries(result?.values ?? {})) : result?.values?.[k]))
    },
    put: (k: string, v: string, opts?: KVNamespacePutOptions) =>
      client.kv.namespaces.values.update(value.namespaceId, k, {
        account_id: accountId!,
        value: v,
        expiration: opts?.expiration,
        expiration_ttl: opts?.expirationTtl,
        metadata: opts?.metadata,
      }),
    delete: (k: string) =>
      client.kv.namespaces.values.delete(value.namespaceId, k, {
        account_id: accountId!,
      }),
    list: (opts?: KVNamespaceListOptions): Promise<KVNamespaceListResult<unknown, string>> =>
      client.kv.namespaces.keys
        .list(value.namespaceId, {
          account_id: accountId!,
          prefix: opts?.prefix ?? undefined,
        })
        .then((result) => ({
          keys: result.result,
          list_complete: true,
          cacheStatus: null,
        })),
  }
}

export const waitUntil = async (promise: Promise<unknown>) => {
  await promise
}

export const Resource = new Proxy(
  {},
  {
    get(_target, prop: string) {
      const value = raw(prop)
      if (!value) {
        throw new Error(`"${prop}" is not linked in your sst.config.ts (node)`)
      }
      if (typeof value === "object" && "type" in value) {
        if (value.type === "sst.cloudflare.Bucket") {
          return {
            put: async () => {},
          }
        }
        if (value.type === "sst.cloudflare.Kv") {
          return kv(value as { namespaceId: string })
        }
      }
      return value
    },
  },
) as Record<string, any>
