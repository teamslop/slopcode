import { expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Question } from "../../src/question"
import { Server } from "../../src/server/server"
import { tmpdir } from "../fixture/fixture"

test("server routes isolate question state by view id", async () => {
  await using tmp = await tmpdir({ git: true })
  let a!: Promise<string[][]>
  let b!: Promise<string[][]>

  await Instance.provide({
    directory: tmp.path,
    viewID: "view-a",
    fn: async () => {
      a = Question.ask({
        sessionID: "ses_a",
        questions: [
          {
            question: "Question A?",
            header: "A",
            options: [{ label: "A", description: "A" }],
          },
        ],
      })
    },
  })

  await Instance.provide({
    directory: tmp.path,
    viewID: "view-b",
    fn: async () => {
      b = Question.ask({
        sessionID: "ses_b",
        questions: [
          {
            question: "Question B?",
            header: "B",
            options: [{ label: "B", description: "B" }],
          },
        ],
      })
    },
  })

  const app = Server.App()
  const headers = (viewID: string, json = false) => ({
    "x-slopcode-directory": tmp.path,
    "x-slopcode-view-id": viewID,
    ...(json ? { "content-type": "application/json" } : {}),
  })

  const responseA = await app.request("/question", { headers: headers("view-a") })
  const responseB = await app.request("/question", { headers: headers("view-b") })
  const listA = (await responseA.json()) as Question.Request[]
  const listB = (await responseB.json()) as Question.Request[]

  expect(listA.map((item: Question.Request) => item.sessionID)).toEqual(["ses_a"])
  expect(listB.map((item: Question.Request) => item.sessionID)).toEqual(["ses_b"])

  await app.request(`/question/${listA[0]!.id}/reply?sessionID=ses_a`, {
    method: "POST",
    headers: headers("view-a", true),
    body: JSON.stringify({ answers: [["A"]] }),
  })
  await app.request(`/question/${listB[0]!.id}/reply?sessionID=ses_b`, {
    method: "POST",
    headers: headers("view-b", true),
    body: JSON.stringify({ answers: [["B"]] }),
  })

  await expect(a).resolves.toEqual([["A"]])
  await expect(b).resolves.toEqual([["B"]])
})
