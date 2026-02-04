import { Component, createEffect, createSignal, onCleanup } from "solid-js"
import { List } from "@opencode-ai/ui/list"
import { Markdown } from "@opencode-ai/ui/markdown"
import "./dialog-changelog.css"

type Release = {
  tag: string
  body: string
  date: string
}

interface ReleaseListProps {
  releases: Release[]
}

function StickyHeader(props: { tag: string; date: string }) {
  const [stuck, setStuck] = createSignal(false)
  const [header, setHeader] = createSignal<HTMLDivElement | undefined>(undefined)

  const scrollEl = document.querySelector('[data-slot="list-scroll"]') as HTMLElement | null

  createEffect(() => {
    const node = header()
    if (!scrollEl || !node) return

    const handler = () => {
      const rect = node.getBoundingClientRect()
      const scrollRect = scrollEl.getBoundingClientRect()
      setStuck(rect.top <= scrollRect.top + 1 && scrollEl.scrollTop > 0)
    }

    scrollEl.addEventListener("scroll", handler, { passive: true })
    handler()
    onCleanup(() => scrollEl.removeEventListener("scroll", handler))
  })

  return (
    <div class="dialog-changelog-header" data-slot="list-header" data-stuck={stuck()} ref={setHeader}>
      <span class="dialog-changelog-version">{props.tag}</span>
      <span class="dialog-changelog-date">{props.date}</span>
    </div>
  )
}

export const ReleaseList: Component<ReleaseListProps> = (props) => {
  return (
    <List
      items={props.releases}
      key={(x) => x.tag}
      search={false}
      emptyMessage="No releases found"
      loadingMessage="Loading..."
      class="dialog-changelog-list"
    >
      {(item) => (
        <>
          <StickyHeader tag={item.tag} date={item.date} />
          <div class="dialog-changelog-divider" />
          <div class="dialog-changelog-content">
            <Markdown text={item.body} class="dialog-changelog-markdown prose prose-sm max-w-none text-text-base" />
          </div>
        </>
      )}
    </List>
  )
}
