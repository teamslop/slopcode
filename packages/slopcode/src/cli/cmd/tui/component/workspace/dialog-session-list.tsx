import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useRoute } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { createMemo, createResource, createSignal, onMount } from "solid-js"
import { Locale } from "@/util/locale"
import { useKeybind } from "../../context/keybind"
import { useTheme } from "../../context/theme"
import { useSDK } from "../../context/sdk"
import { DialogSessionRename } from "../dialog-session-rename"
import { createDebouncedSignal } from "../../util/signal"
import { Spinner } from "../spinner"
import { useToast } from "../../ui/toast"
import { createSlopcodeClient } from "@slopcode-ai/sdk/v2"

export function DialogWorkspaceSessionList(props: { directory: string; title?: string }) {
  const dialog = useDialog()
  const route = useRoute()
  const sync = useSync()
  const keybind = useKeybind()
  const { theme } = useTheme()
  const sdk = useSDK()
  const toast = useToast()
  const [toDelete, setToDelete] = createSignal<string>()
  const [search, setSearch] = createDebouncedSignal("", 150)

  const createClient = () =>
    createSlopcodeClient({
      baseUrl: sdk.url,
      fetch: sdk.fetch,
      directory: props.directory,
    })

  const [listed, listedActions] = createResource(
    () => props.directory,
    async (directory) => {
      const client = createSlopcodeClient({
        baseUrl: sdk.url,
        fetch: sdk.fetch,
        directory,
      })
      const result = await client.session.list({ roots: true }).catch(() => undefined)
      return result?.data ?? []
    },
  )

  const [searchResults] = createResource(search, async (query) => {
    if (!query) return undefined
    const result = await createClient()
      .session.list({
        roots: true,
        search: query,
        limit: 30,
      })
      .catch(() => undefined)
    return result?.data ?? []
  })

  const currentSessionID = createMemo(() => (route.data.type === "session" ? route.data.sessionID : undefined))

  const sessions = createMemo(() => {
    if (searchResults()) return searchResults()!
    if (listed()) return listed()!
    return sync.data.session.filter((session) => session.directory === props.directory)
  })

  const options = createMemo(() => {
    const today = new Date().toDateString()
    return sessions()
      .filter((session) => session.parentID === undefined)
      .toSorted((a, b) => b.time.updated - a.time.updated)
      .map((session) => {
        const date = new Date(session.time.updated)
        let category = date.toDateString()
        if (category === today) category = "Today"

        const deleting = toDelete() === session.id
        const status = sync.data.session_status?.[session.id]
        const working = status?.type === "busy"

        return {
          title: deleting ? `Press ${keybind.print("session_delete")} again to confirm` : session.title,
          bg: deleting ? theme.error : undefined,
          value: session.id,
          category,
          footer: Locale.time(session.time.updated),
          gutter: working ? <Spinner /> : undefined,
        }
      })
  })

  onMount(() => {
    dialog.setSize("large")
  })

  return (
    <DialogSelect
      title={props.title ?? "Workspace Sessions"}
      options={options()}
      skipFilter={true}
      current={currentSessionID()}
      onFilter={setSearch}
      onMove={() => {
        setToDelete(undefined)
      }}
      onSelect={(option) => {
        sdk.setDirectory(props.directory)
        route.navigate({
          type: "session",
          sessionID: option.value,
        })
        dialog.clear()
      }}
      keybind={[
        {
          keybind: keybind.all.session_delete?.[0],
          title: "delete",
          onTrigger: async (option) => {
            if (toDelete() !== option.value) {
              setToDelete(option.value)
              return
            }

            const deleted = await createClient()
              .session.delete({
                sessionID: option.value,
              })
              .then(() => true)
              .catch(() => false)

            setToDelete(undefined)
            if (!deleted) {
              toast.show({
                message: "Failed to delete session",
                variant: "error",
              })
              return
            }

            listedActions.mutate((items) => items?.filter((item) => item.id !== option.value))
            sync.set(
              "session",
              sync.data.session.filter((session) => session.id !== option.value),
            )
          },
        },
        {
          keybind: keybind.all.session_rename?.[0],
          title: "rename",
          onTrigger: async (option) => {
            sdk.setDirectory(props.directory)
            dialog.replace(() => <DialogSessionRename session={option.value} />)
          },
        },
      ]}
    />
  )
}
