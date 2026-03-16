import { createSlopcodeClient, type Session, type Workspace } from "@slopcode-ai/sdk/v2"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useRoute } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { createMemo, createSignal, onMount } from "solid-js"
import { useSDK } from "../context/sdk"
import { useToast } from "../ui/toast"
import { useKeybind } from "../context/keybind"
import { DialogWorkspaceSessionList } from "./workspace/dialog-session-list"

function workspaceID() {
  return `wrk_${Date.now().toString(16)}${Math.random().toString(36).slice(2, 8)}`
}

export function DialogWorkspaceList() {
  const dialog = useDialog()
  const route = useRoute()
  const sync = useSync()
  const sdk = useSDK()
  const toast = useToast()
  const keybind = useKeybind()
  const [toDelete, setToDelete] = createSignal<string>()
  const [creating, setCreating] = createSignal(false)

  const localDirectory = createMemo(() => sdk.baseDirectory ?? sdk.directory ?? sync.data.path.directory)

  const createClient = (directory: string) =>
    createSlopcodeClient({
      baseUrl: sdk.url,
      fetch: sdk.fetch,
      directory,
    })

  const rootSessionCount = createMemo(() => {
    const counts: Record<string, number> = {}
    for (const session of sync.data.session) {
      if (session.parentID) continue
      counts[session.directory] = (counts[session.directory] ?? 0) + 1
    }
    return counts
  })

  const currentWorkspace = createMemo(() => {
    const activeDirectory = sdk.directory
    if (!activeDirectory) return "__local__"
    const match = sync.data.workspaceList.find((workspace) => workspace.config.directory === activeDirectory)
    if (!match) return "__local__"
    return match.id
  })

  function cacheSession(session: Session) {
    sync.set(
      "session",
      [...sync.data.session.filter((item) => item.id !== session.id), session].toSorted((a, b) =>
        a.id.localeCompare(b.id),
      ),
    )
  }

  async function openSessionForDirectory(directory: string) {
    sdk.setDirectory(directory)
    const client = createClient(directory)

    const listed = await client.session.list({ roots: true, limit: 1 }).catch(() => undefined)
    const existing = listed?.data?.[0]
    if (existing?.id) {
      cacheSession(existing)
      route.navigate({
        type: "session",
        sessionID: existing.id,
      })
      dialog.clear()
      return
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const created = await client.session.create({}).catch(() => undefined)
      if (!created) {
        await Bun.sleep(250)
        continue
      }
      if (created.response.status >= 500 && created.response.status < 600) {
        await Bun.sleep(500)
        continue
      }
      if (!created.data) {
        toast.show({
          message: "Failed to open workspace",
          variant: "error",
        })
        return
      }

      cacheSession(created.data)
      route.navigate({
        type: "session",
        sessionID: created.data.id,
      })
      dialog.clear()
      return
    }

    toast.show({
      message: "Failed to open workspace",
      variant: "error",
    })
  }

  async function openWorkspace(workspace: Workspace) {
    const directory = workspace.config.directory
    if (!directory) {
      toast.show({
        message: "Workspace has no directory",
        variant: "error",
      })
      return
    }

    sdk.setDirectory(directory)

    const hasSessions = await createClient(directory)
      .session.list({ roots: true, limit: 1 })
      .then((result) => (result.data?.length ?? 0) > 0)
      .catch(() => false)

    if (hasSessions) {
      dialog.replace(() => <DialogWorkspaceSessionList directory={directory} title={`Workspace ${workspace.id} Sessions`} />)
      return
    }

    await openSessionForDirectory(directory)
  }

  async function createWorkspace() {
    const directory = localDirectory()
    if (!directory || creating()) return

    setCreating(true)
    try {
      const client = createClient(directory)
      const created = await client.experimental.workspace
        .create({
          id: workspaceID(),
          branch: null,
          config: {
            type: "worktree",
            directory,
          },
        })
        .catch(() => undefined)

      if (!created?.data) {
        toast.show({
          message: "Failed to create workspace",
          variant: "error",
        })
        return
      }

      await sync.workspace.sync()
      await openWorkspace(created.data)
    } finally {
      setCreating(false)
    }
  }

  const localCount = createMemo(() => {
    const directory = localDirectory()
    if (!directory) return 0
    return rootSessionCount()[directory] ?? 0
  })

  const options = createMemo(() => {
    const counts = rootSessionCount()
    return [
      {
        title: "Local",
        value: "__local__",
        category: "Workspace",
        description: "Use the local project directory",
        footer: `${localCount()} session${localCount() === 1 ? "" : "s"}`,
      },
      ...sync.data.workspaceList
        .toSorted((a, b) => a.id.localeCompare(b.id))
        .map((workspace) => {
          const deleting = toDelete() === workspace.id
          const count = counts[workspace.config.directory] ?? 0
          return {
            title: deleting ? `Delete ${workspace.id}? Press ${keybind.print("session_delete")} again` : workspace.id,
            value: workspace.id,
            category: workspace.config.type,
            description: workspace.branch ? `Branch ${workspace.branch}` : workspace.config.directory,
            footer: `${count} session${count === 1 ? "" : "s"}`,
          }
        }),
      {
        title: creating() ? "Creating workspace..." : "+ New workspace",
        value: "__create__",
        category: "Actions",
        description: "Create a new worktree workspace",
      },
    ]
  })

  onMount(() => {
    dialog.setSize("large")
    void sync.workspace.sync()
  })

  return (
    <DialogSelect
      title="Workspaces"
      skipFilter={true}
      options={options()}
      current={currentWorkspace()}
      onMove={() => {
        setToDelete(undefined)
      }}
      onSelect={(option) => {
        setToDelete(undefined)
        if (option.value === "__create__") {
          void createWorkspace()
          return
        }

        if (option.value === "__local__") {
          const directory = localDirectory()
          if (!directory) return
          sdk.setDirectory(directory)
          if (localCount() > 0) {
            dialog.replace(() => <DialogWorkspaceSessionList directory={directory} title="Local Sessions" />)
            return
          }
          route.navigate({
            type: "home",
          })
          dialog.clear()
          return
        }

        const workspace = sync.workspace.get(option.value)
        if (!workspace) return
        void openWorkspace(workspace)
      }}
      keybind={[
        {
          keybind: keybind.all.session_delete?.[0],
          title: "delete",
          onTrigger: async (option) => {
            if (option.value === "__create__" || option.value === "__local__") return
            if (toDelete() !== option.value) {
              setToDelete(option.value)
              return
            }

            const removed = await sdk.client.experimental.workspace.remove({ id: option.value }).catch(() => undefined)
            setToDelete(undefined)
            if (!removed?.data) {
              toast.show({
                message: "Failed to delete workspace",
                variant: "error",
              })
              return
            }

            const local = localDirectory()
            if (local && currentWorkspace() === option.value) {
              sdk.setDirectory(local)
              route.navigate({ type: "home" })
            }
            await sync.workspace.sync()
          },
        },
      ]}
    />
  )
}
