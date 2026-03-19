import { describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { Server } from "../../src/server/server"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

describe("session.list endpoint", () => {
  test("supports cursor pagination with x-next-cursor header", async () => {
    await using tmp = await tmpdir({ git: true })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const first = await Session.create({ title: "route-page-one" })
        await new Promise((resolve) => setTimeout(resolve, 5))
        const second = await Session.create({ title: "route-page-two" })

        const app = Server.App()
        const firstPage = await app.request(`/session?directory=${encodeURIComponent(tmp.path)}&limit=1`)
        expect(firstPage.status).toBe(200)

        const firstBody = (await firstPage.json()) as Array<{ id: string; time: { updated: number } }>
        expect(firstBody.length).toBe(1)
        expect(firstBody[0].id).toBe(second.id)

        const cursor = firstPage.headers.get("x-next-cursor")
        expect(cursor).toBe(String(second.time.updated))

        const nextPage = await app.request(
          `/session?directory=${encodeURIComponent(tmp.path)}&limit=1&cursor=${encodeURIComponent(cursor!)}`,
        )
        expect(nextPage.status).toBe(200)

        const nextBody = (await nextPage.json()) as Array<{ id: string }>
        expect(nextBody.length).toBe(1)
        expect(nextBody[0].id).toBe(first.id)
        expect(nextPage.headers.get("x-next-cursor")).toBeNull()
      },
    })
  })
})
