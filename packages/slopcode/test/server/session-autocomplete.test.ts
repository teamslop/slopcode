import { describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { Server } from "../../src/server/server"
import { Log } from "../../src/util/log"
import { Provider } from "../../src/provider/provider"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

describe("session.autocomplete endpoint", () => {
  test("returns empty completion when disabled", async () => {
    await using tmp = await tmpdir({
      config: {
        autocomplete: {
          enabled: false,
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const model = await Provider.defaultModel()
        const session = await Session.create({})
        const app = Server.App()
        const response = await app.request(`/session/${session.id}/autocomplete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            prefix: "write a",
          }),
        })

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.completion).toBe("")
      },
    })
  })

  test("returns empty completion for short prefixes", async () => {
    await using tmp = await tmpdir({
      config: {
        autocomplete: {
          min_prefix_chars: 20,
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const model = await Provider.defaultModel()
        const session = await Session.create({})
        const app = Server.App()
        const response = await app.request(`/session/${session.id}/autocomplete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            prefix: "short",
          }),
        })

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.completion).toBe("")
      },
    })
  })

  test("returns empty completion for blank prefixes", async () => {
    await using tmp = await tmpdir({
      config: {
        autocomplete: {
          min_prefix_chars: 0,
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const model = await Provider.defaultModel()
        const session = await Session.create({})
        const app = Server.App()
        const response = await app.request(`/session/${session.id}/autocomplete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            prefix: "   ",
          }),
        })

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.completion).toBe("")
      },
    })
  })
})
