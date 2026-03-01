import type { Hooks } from "@slopcode-ai/plugin"
import childProcess from "child_process"
import crypto from "crypto"
import path from "path"
import { Global } from "../global"
import { Filesystem } from "../util/filesystem"
import { Log } from "../util/log"

const log = Log.create({ service: "plugin.gitlab" })

const clientId =
  process.env.GITLAB_OAUTH_CLIENT_ID || "1d89f9fdb23ee96d4e603201f6861dab6e143c5c3c00469a018a2d94bdc03d4e"
const callbackHost = "127.0.0.1"
const callbackPort = 8080
const callbackTimeout = 120_000
const refreshBuffer = 5 * 60 * 1000
const defaultInstance = "https://gitlab.com"
const scopes = "api"
const authPath = path.join(Global.Path.data, "auth.json")

type OAuthInfo = {
  type: "oauth"
  access: string
  refresh: string
  expires: number
  enterpriseUrl?: string
}

type ApiInfo = {
  type: "api"
  key: string
}

type Info = OAuthInfo | ApiInfo

let refresh: Promise<void> | undefined

function isOAuthInfo(value: unknown): value is OAuthInfo {
  if (typeof value !== "object" || !value) return false
  if (!("type" in value) || value.type !== "oauth") return false
  if (!("access" in value) || typeof value.access !== "string") return false
  if (!("refresh" in value) || typeof value.refresh !== "string") return false
  if (!("expires" in value) || typeof value.expires !== "number") return false
  if (!("enterpriseUrl" in value) || value.enterpriseUrl === undefined) return true
  return typeof value.enterpriseUrl === "string"
}

function isApiInfo(value: unknown): value is ApiInfo {
  if (typeof value !== "object" || !value) return false
  if (!("type" in value) || value.type !== "api") return false
  return "key" in value && typeof value.key === "string"
}

function parse(input: string) {
  const url = new URL(input)
  return `${url.protocol}//${url.host}`
}

function random(size: number) {
  return crypto.randomBytes(size).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

function challenge(verifier: string) {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

async function readAuthFile(): Promise<Record<string, any>> {
  return Filesystem.readJson<Record<string, any>>(authPath).catch(() => ({}))
}

async function writeAuthFile(data: Record<string, any>) {
  await Filesystem.writeJson(authPath, data, 0o600)
}

async function saveOauthData(access: string, refresh: string, expires: number, enterpriseUrl: string) {
  const data = await readAuthFile()
  data.gitlab = {
    type: "oauth",
    access,
    refresh,
    expires,
    enterpriseUrl,
  }
  await writeAuthFile(data)
}

async function saveApiData(key: string, enterpriseUrl: string) {
  const data = await readAuthFile()
  data.gitlab = {
    type: "api",
    key,
    enterpriseUrl,
  }
  await writeAuthFile(data)
}

async function readApiInstanceUrl() {
  const data = await readAuthFile()
  const auth = data.gitlab
  if (typeof auth !== "object" || !auth) return
  if (!("type" in auth) || auth.type !== "api") return
  if (!("enterpriseUrl" in auth) || typeof auth.enterpriseUrl !== "string") return
  return auth.enterpriseUrl
}

function openBrowser(url: string) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"
  childProcess.exec(`${command} \"${url}\"`)
}

async function tokenRequest(instanceUrl: string, params: URLSearchParams) {
  const response = await fetch(`${instanceUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  })
  if (!response.ok) {
    throw new Error(`GitLab token request failed: ${response.status}`)
  }
  return response.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in?: number
  }>
}

function oauthInstance(info: OAuthInfo) {
  return info.enterpriseUrl || defaultInstance
}

function callbackServer(timeout: number) {
  let done = false
  let resolve = (_input: { code: string; state: string }) => {}
  let reject = (_err: Error) => {}

  const wait = new Promise<{ code: string; state: string }>((res, rej) => {
    resolve = res
    reject = rej
  })

  const server = Bun.serve({
    hostname: callbackHost,
    port: callbackPort,
    fetch(req) {
      const url = new URL(req.url)
      if (url.pathname !== "/callback") {
        return new Response("Not found", { status: 404 })
      }

      const error = url.searchParams.get("error")
      const code = url.searchParams.get("code")
      const state = url.searchParams.get("state")

      if (error) {
        if (!done) {
          done = true
          reject(new Error(error))
        }
        return new Response(
          "<html><body><h1>Authentication failed</h1><p>You can close this window.</p></body></html>",
          { headers: { "Content-Type": "text/html" } },
        )
      }

      if (!code || !state) {
        if (!done) {
          done = true
          reject(new Error("Missing OAuth callback parameters"))
        }
        return new Response(
          "<html><body><h1>Authentication failed</h1><p>Missing callback parameters.</p></body></html>",
          { status: 400, headers: { "Content-Type": "text/html" } },
        )
      }

      if (!done) {
        done = true
        resolve({ code, state })
      }

      return new Response(
        "<html><body><h1>Authentication successful</h1><p>You can close this window.</p></body></html>",
        { headers: { "Content-Type": "text/html" } },
      )
    },
  })

  const close = () => {
    clearTimeout(timer)
    if (done) {
      server.stop()
      return
    }
    done = true
    server.stop()
  }

  const timer = setTimeout(() => {
    if (done) return
    done = true
    reject(new Error("OAuth callback timeout"))
    server.stop()
  }, timeout)

  return {
    wait,
    close,
    callbackUrl: `http://${callbackHost}:${server.port}/callback`,
  }
}

async function refreshTokenIfNeeded(
  info: OAuthInfo,
  auth: () => Promise<{ type: string; [key: string]: unknown } | undefined>,
) {
  if (info.expires > Date.now() + refreshBuffer) {
    return {
      apiKey: info.access,
      instanceUrl: oauthInstance(info),
    }
  }

  if (refresh) {
    await refresh
    const next = await auth()
    if (isOAuthInfo(next)) {
      return {
        apiKey: next.access,
        instanceUrl: oauthInstance(next),
      }
    }
    return {
      apiKey: info.access,
      instanceUrl: oauthInstance(info),
    }
  }

  refresh = (async () => {
    const instanceUrl = oauthInstance(info)
    const tokens = await tokenRequest(
      instanceUrl,
      new URLSearchParams({
        client_id: clientId,
        refresh_token: info.refresh,
        grant_type: "refresh_token",
      }),
    )
    const expires = Date.now() + (tokens.expires_in ?? 3600) * 1000
    await saveOauthData(tokens.access_token, tokens.refresh_token, expires, instanceUrl)
  })()

  await refresh
    .catch((error) => {
      log.error("failed to refresh gitlab oauth token", {
        error: error instanceof Error ? error.message : String(error),
      })
    })
    .finally(() => {
      refresh = undefined
    })

  const next = await auth()
  if (isOAuthInfo(next)) {
    return {
      apiKey: next.access,
      instanceUrl: oauthInstance(next),
    }
  }
  return {
    apiKey: info.access,
    instanceUrl: oauthInstance(info),
  }
}

export async function GitlabAuthPlugin(): Promise<Hooks> {
  return {
    auth: {
      provider: "gitlab",
      async loader(auth) {
        const info = await auth()
        if (!info) return {}

        if (isOAuthInfo(info)) {
          const options = await refreshTokenIfNeeded(info, auth as () => Promise<Info | undefined>)
          return {
            ...options,
            clientId: clientId,
          }
        }

        if (isApiInfo(info)) {
          return {
            apiKey: info.key,
            instanceUrl: (await readApiInstanceUrl()) || process.env.GITLAB_INSTANCE_URL || defaultInstance,
          }
        }

        return {}
      },
      methods: [
        {
          type: "oauth",
          label: "GitLab OAuth",
          prompts: [
            {
              type: "text",
              key: "instanceUrl",
              message: "GitLab instance URL",
              placeholder: "https://gitlab.com",
              validate(value) {
                if (!value) return "Instance URL is required"
                try {
                  parse(value)
                  return
                } catch {
                  return "Invalid URL format"
                }
              },
            },
          ],
          async authorize(inputs) {
            const instanceUrl = parse(inputs?.instanceUrl || process.env.GITLAB_INSTANCE_URL || defaultInstance)
            const verifier = random(43)
            const state = random(32)
            const server = callbackServer(callbackTimeout)

            const authUrl = new URL(`${instanceUrl}/oauth/authorize`)
            authUrl.searchParams.set("client_id", clientId)
            authUrl.searchParams.set("redirect_uri", server.callbackUrl)
            authUrl.searchParams.set("response_type", "code")
            authUrl.searchParams.set("state", state)
            authUrl.searchParams.set("scope", scopes)
            authUrl.searchParams.set("code_challenge", challenge(verifier))
            authUrl.searchParams.set("code_challenge_method", "S256")

            openBrowser(authUrl.href)

            return {
              method: "auto" as const,
              url: authUrl.href,
              instructions:
                "Your browser will open for authentication. After approval, return to this terminal automatically.",
              callback: async () => {
                try {
                  const callback = await server.wait
                  if (callback.state !== state) {
                    return { type: "failed" as const }
                  }

                  const tokens = await tokenRequest(
                    instanceUrl,
                    new URLSearchParams({
                      client_id: clientId,
                      code: callback.code,
                      grant_type: "authorization_code",
                      redirect_uri: server.callbackUrl,
                      code_verifier: verifier,
                    }),
                  )

                  const expires = Date.now() + (tokens.expires_in ?? 3600) * 1000
                  await saveOauthData(tokens.access_token, tokens.refresh_token, expires, instanceUrl)

                  return {
                    type: "success" as const,
                    access: tokens.access_token,
                    refresh: tokens.refresh_token,
                    expires,
                    enterpriseUrl: instanceUrl,
                  }
                } catch (error) {
                  log.error("gitlab oauth callback failed", {
                    error: error instanceof Error ? error.message : String(error),
                  })
                  return { type: "failed" as const }
                } finally {
                  server.close()
                }
              },
            }
          },
        },
        {
          type: "api",
          label: "GitLab Personal Access Token",
          prompts: [
            {
              type: "text",
              key: "instanceUrl",
              message: "GitLab instance URL",
              placeholder: "https://gitlab.com",
              validate(value) {
                if (!value) return "Instance URL is required"
                try {
                  parse(value)
                  return
                } catch {
                  return "Invalid URL format"
                }
              },
            },
            {
              type: "text",
              key: "token",
              message: "Personal Access Token",
              placeholder: "glpat-xxxxxxxxxxxxxxxxxxxx",
              validate(value) {
                if (!value) return "Token is required"
                if (!value.startsWith("glpat-")) return "Token should start with glpat-"
                return
              },
            },
          ],
          async authorize(inputs) {
            const token = inputs?.token
            if (!token) {
              return { type: "failed" as const }
            }

            const instanceUrl = parse(inputs?.instanceUrl || defaultInstance)
            const response = await fetch(`${instanceUrl}/api/v4/user`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }).catch(() => undefined)

            if (!response?.ok) {
              return { type: "failed" as const }
            }

            await saveApiData(token, instanceUrl)

            return {
              type: "success" as const,
              key: token,
            }
          },
        },
      ],
    },
  }
}
