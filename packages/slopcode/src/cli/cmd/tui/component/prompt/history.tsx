import path from "path"
import { Global } from "@/global"
import { Filesystem } from "@/util/filesystem"
import { onMount } from "solid-js"
import { createStore, produce, unwrap } from "solid-js/store"
import { createSimpleContext } from "../../context/helper"
import { appendFile, writeFile } from "fs/promises"
import type { AgentPart, FilePart, TextPart } from "@slopcode-ai/sdk/v2"

export type PromptInfo = {
  input: string
  mode?: "normal" | "shell"
  parts: (
    | Omit<FilePart, "id" | "messageID" | "sessionID">
    | Omit<AgentPart, "id" | "messageID" | "sessionID">
    | (Omit<TextPart, "id" | "messageID" | "sessionID"> & {
        source?: {
          text: {
            start: number
            end: number
            value: string
          }
        }
      })
  )[]
}

const MAX_HISTORY_ENTRIES = 50

export const { use: usePromptHistory, provider: PromptHistoryProvider } = createSimpleContext({
  name: "PromptHistory",
  init: () => {
    const historyPath = path.join(Global.Path.state, "prompt-history.jsonl")
    onMount(async () => {
      const text = await Filesystem.readText(historyPath).catch(() => "")
      const lines = text
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter((line): line is PromptInfo => line !== null)
        .slice(-MAX_HISTORY_ENTRIES)

      setStore("history", lines)

      // Rewrite file with only valid entries to self-heal corruption
      if (lines.length > 0) {
        const content = lines.map((line) => JSON.stringify(line)).join("\n") + "\n"
        writeFile(historyPath, content).catch(() => {})
      }
    })

    const [store, setStore] = createStore({
      index: 0,
      draft: {
        input: "",
        parts: [],
        mode: "normal",
      } as PromptInfo,
      history: [] as PromptInfo[],
    })

    return {
      has() {
        return store.history.length > 0
      },
      move(direction: 1 | -1, item: PromptInfo) {
        if (!store.history.length) return undefined

        const current = store.history.at(store.index)
        const match =
          current &&
          current.input === item.input &&
          current.mode === item.mode &&
          Bun.deepEquals(current.parts, item.parts)

        if (direction === -1) {
          if (!match) {
            setStore("draft", structuredClone(unwrap(item)))
            setStore("index", -1)
            return store.history.at(-1)
          }

          const next = Math.max(-store.history.length, store.index - 1)
          if (next === store.index) return store.history.at(store.index)
          setStore("index", next)
          return store.history.at(next)
        }

        if (store.index === 0) return undefined
        const next = Math.min(0, store.index + 1)
        setStore("index", next)
        if (next === 0) return store.draft
        return store.history.at(next)
      },
      append(item: PromptInfo) {
        const entry = structuredClone(unwrap(item))
        let trimmed = false
        setStore(
          produce((draft) => {
            draft.history.push(entry)
            if (draft.history.length > MAX_HISTORY_ENTRIES) {
              draft.history = draft.history.slice(-MAX_HISTORY_ENTRIES)
              trimmed = true
            }
            draft.draft = {
              input: "",
              parts: [],
              mode: "normal",
            }
            draft.index = 0
          }),
        )

        if (trimmed) {
          const content = store.history.map((line) => JSON.stringify(line)).join("\n") + "\n"
          writeFile(historyPath, content).catch(() => {})
          return
        }

        appendFile(historyPath, JSON.stringify(entry) + "\n").catch(() => {})
      },
    }
  },
})
