import { useParams } from "@solidjs/router"
import { Button } from "@slopcode-ai/ui/button"
import { DockTray } from "@slopcode-ai/ui/dock-surface"
import { IconButton } from "@slopcode-ai/ui/icon-button"
import { For, Show, createEffect, createMemo, on, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { useSDK } from "@/context/sdk"
import { promptQueue, promptQueueKey, type PromptQueueItem } from "./queue"

type Row = {
  id: string
  label: string
  summary: string
  detail?: string
}

const LIMIT = 4

export function PromptQueueDock() {
  const params = useParams()
  const sdk = useSDK()
  const [store, setStore] = createStore({
    active: undefined as PromptQueueItem | undefined,
    queue: [] as PromptQueueItem[],
    collapsed: false,
  })

  const key = createMemo(() => {
    if (!params.id) return
    return promptQueueKey(sdk.directory, params.id)
  })

  const sync = () => {
    const current = key()
    if (!current) {
      setStore("active", undefined)
      setStore("queue", [])
      return
    }
    const next = promptQueue.snapshot(current)
    setStore("active", next.active)
    setStore("queue", next.queue)
  }

  createEffect(on(key, sync))

  const off = promptQueue.subscribe((next: string) => {
    if (next !== key()) return
    sync()
  })

  onCleanup(off)

  const rows = createMemo<Row[]>(() => {
    const active = store.active
      ? [
          {
            id: store.active.id,
            label: "Sending",
            summary: store.active.summary,
            detail: store.active.detail,
          },
        ]
      : []

    return [
      ...active,
      ...store.queue.map((item: PromptQueueItem) => ({
        id: item.id,
        label: "Queued",
        summary: item.summary,
        detail: item.detail,
      })),
    ]
  })

  const visible = createMemo(() => rows().slice(0, LIMIT))
  const hidden = createMemo(() => Math.max(0, rows().length - LIMIT))
  const status = createMemo(() => {
    const sending = store.active ? 1 : 0
    const queued = store.queue.length
    return [sending ? `${sending} sending` : undefined, queued ? `${queued} queued` : undefined]
      .filter((item): item is string => !!item)
      .join(" - ")
  })
  const preview = createMemo(() => store.active?.summary ?? store.queue[0]?.summary ?? "")
  const clearable = createMemo(() => store.queue.length > 0)

  const toggle = () => setStore("collapsed", (value) => !value)

  const clear = () => {
    const current = key()
    if (!current) return
    promptQueue.clear(current)
  }

  const remove = (id: string) => {
    const current = key()
    if (!current) return
    promptQueue.remove(current, (item) => item.id === id)
  }

  return (
    <Show when={rows().length > 0}>
      <DockTray
        data-component="prompt-queue-dock"
        class="mb-2"
        classList={{
          "h-[74px]": store.collapsed,
        }}
      >
        <div
          data-action="prompt-queue-toggle"
          class="pl-3 pr-2 py-2 flex items-center gap-2"
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return
            event.preventDefault()
            toggle()
          }}
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-13-medium text-text-strong shrink-0">Prompt queue</span>
            <Show when={store.collapsed && preview()}>
              <div class="min-w-0 flex-1">
                <div class="text-13-regular text-text-base truncate">{preview()}</div>
              </div>
            </Show>
          </div>
          <Show when={status()}>
            <span class="text-12-regular text-text-weak shrink-0">{status()}</span>
          </Show>
          <div class="ml-auto flex items-center gap-1">
            <Show when={clearable()}>
              <Button
                type="button"
                variant="ghost"
                size="small"
                class="h-7 px-2 text-12-medium"
                onMouseDown={(event: MouseEvent) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onClick={(event: MouseEvent) => {
                  event.stopPropagation()
                  clear()
                }}
              >
                Clear queued
              </Button>
            </Show>
            <IconButton
              data-action="prompt-queue-toggle-button"
              icon="chevron-down"
              size="normal"
              variant="ghost"
              classList={{ "rotate-180": store.collapsed }}
              onMouseDown={(event: MouseEvent) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onClick={(event: MouseEvent) => {
                event.stopPropagation()
                toggle()
              }}
              aria-label={store.collapsed ? "Expand prompt queue" : "Collapse prompt queue"}
            />
          </div>
        </div>

        <div data-slot="prompt-queue-list" hidden={store.collapsed} class="border-t border-border-weak-base px-3 py-2 flex flex-col gap-2">
          <For each={visible()}>
            {(item: Row) => (
              <div class="flex items-start gap-2 min-w-0">
                <span
                  classList={{
                    "shrink-0 rounded-[6px] px-1.5 py-0.5 text-11-medium": true,
                    "bg-surface-info-base text-text-info-base": item.label === "Sending",
                    "bg-background-stronger text-text-weak": item.label !== "Sending",
                  }}
                >
                  {item.label}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="text-13-regular text-text-strong truncate">{item.summary}</div>
                  <Show when={item.detail}>
                    <div class="text-12-regular text-text-weak truncate">{item.detail}</div>
                  </Show>
                </div>
                <Show when={item.label === "Queued"}>
                  <IconButton
                    icon="close-small"
                    size="normal"
                    variant="ghost"
                    class="size-6 shrink-0"
                    onMouseDown={(event: MouseEvent) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation()
                      remove(item.id)
                    }}
                    aria-label="Remove queued prompt"
                  />
                </Show>
              </div>
            )}
          </For>
          <Show when={hidden() > 0}>
            <div class="text-12-regular text-text-weak">... {hidden()} more</div>
          </Show>
        </div>
      </DockTray>
    </Show>
  )
}
