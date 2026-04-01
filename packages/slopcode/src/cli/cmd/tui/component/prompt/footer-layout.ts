export type PromptFooterShortcut = {
  id: string
  key: string
  full: string
  short?: string
  required?: boolean
}

export type PromptFooterShortcutLayout = {
  pad: number
  width: number
  gaps: number[]
  items: Array<{
    id: string
    key: string
    label: string
    mode: "full" | "short"
    width: number
  }>
}

function text(key: string, label: string) {
  if (!label) return key
  return key + " " + label
}

function size(item: PromptFooterShortcut, label: string, pad: number) {
  return Bun.stringWidth(text(item.key, label)) + pad * 2
}

function used(items: PromptFooterShortcut[], labels: string[], pad: number, gap: number) {
  if (items.length === 0) return 0
  return items.reduce((sum, item, index) => sum + size(item, labels[index]!, pad), 0) + (items.length - 1) * gap
}

function full(items: PromptFooterShortcut[]) {
  return items.map((item) => item.full)
}

function fits(items: PromptFooterShortcut[], labels: string[], pad: number, gap: number, width: number) {
  return used(items, labels, pad, gap) <= width
}

function gaps(count: number, extra: number, gap: number) {
  if (count <= 1) return []
  const slots = count - 1
  const share = Math.floor(extra / slots)
  const rest = extra % slots
  return Array.from({ length: slots }, (_, index) => gap + share + (index < rest ? 1 : 0))
}

function build(items: PromptFooterShortcut[], labels: string[], pad: number, gap: number, width: number) {
  const base = used(items, labels, pad, gap)
  const space = Math.max(0, width - base)
  return {
    pad,
    width: items.length > 1 ? width : base,
    gaps: gaps(items.length, space, gap),
    items: items.map((item, index) => ({
      id: item.id,
      key: item.key,
      label: labels[index]!,
      mode: labels[index] === item.full ? "full" : "short",
      width: size(item, labels[index]!, pad),
    })),
  } satisfies PromptFooterShortcutLayout
}

function fit(items: PromptFooterShortcut[], pad: number, gap: number, width: number) {
  const min = items.filter((item) => item.required).length
  for (let count = items.length; count >= min; count--) {
    const visible = items.slice(0, count)
    const labels = full(visible)
    if (fits(visible, labels, pad, gap, width)) return build(visible, labels, pad, gap, width)
    for (let index = visible.length - 1; index >= 0; index--) {
      const next = visible[index]!.short ?? labels[index]!
      if (next === labels[index]) continue
      labels[index] = next
      if (fits(visible, labels, pad, gap, width)) return build(visible, labels, pad, gap, width)
    }
  }

  const visible = items.filter((item) => item.required)
  const labels = visible.map((item) => item.short ?? item.full)
  return build(visible, labels, pad, gap, Math.max(width, used(visible, labels, pad, gap)))
}

function score(layout: PromptFooterShortcutLayout) {
  return (
    layout.items.length * 1000 +
    layout.items.reduce((sum, item) => sum + (item.mode === "full" ? 10 : 1), 0) +
    layout.pad
  )
}

export function layoutPromptFooterShortcuts(input: {
  width: number
  items: PromptFooterShortcut[]
  gap?: number
  pads?: number[]
}) {
  const pads = input.pads ?? [1, 0]
  const gap = input.gap ?? 1
  return pads
    .map((pad) => fit(input.items, pad, gap, input.width))
    .reduce((best, next) => {
      if (!best) return next
      if (score(next) > score(best)) return next
      return best
    }, undefined as PromptFooterShortcutLayout | undefined) ?? {
    pad: 0,
    width: 0,
    gaps: [],
    items: [],
  }
}
