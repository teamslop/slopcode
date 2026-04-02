export type PromptFooterTone = "text" | "muted" | "primary" | "warning" | "error"

export type PromptFooterPart = {
  id?: string
  text: string
  tone?: PromptFooterTone
  box?: boolean
}

export type PromptFooterVariant = {
  box?: boolean
  gap?: number
  parts: PromptFooterPart[]
}

export type PromptFooterItem = {
  id: string
  required?: boolean
  variants: PromptFooterVariant[]
}

export type PromptFooterLayout = {
  pad: number
  gap: number
  width: number
  gaps: number[]
  items: Array<{
    id: string
    box: boolean
    gap: number
    parts: PromptFooterPart[]
    variant: number
    width: number
  }>
}

function wide(text: string) {
  return Bun.stringWidth(text)
}

function join(parts: PromptFooterPart[], gap: number) {
  return parts.map((part) => part.text).join(" ".repeat(gap))
}

function piece(part: PromptFooterPart, pad: number) {
  return wide(part.text) + (part.box ? pad * 2 : 0)
}

function size(item: PromptFooterItem, step: number, pad: number) {
  const variant = item.variants[step]!
  const gap = variant.gap ?? 1
  if (variant.box) return wide(join(variant.parts, gap)) + pad * 2
  return variant.parts.reduce((sum, part) => sum + piece(part, pad), 0) + Math.max(0, variant.parts.length - 1) * gap
}

function used(items: PromptFooterItem[], steps: number[], pad: number, gap: number) {
  if (items.length === 0) return 0
  return items.reduce((sum, item, index) => sum + size(item, steps[index]!, pad), 0) + (items.length - 1) * gap
}

function gaps(count: number, extra: number, gap: number) {
  if (count <= 1) return []
  const slots = count - 1
  const share = Math.floor(extra / slots)
  const rest = extra % slots
  return Array.from({ length: slots }, (_, index) => gap + share + (index < rest ? 1 : 0))
}

function build(items: PromptFooterItem[], steps: number[], pad: number, gap: number, width: number) {
  const base = used(items, steps, pad, gap)
  const space = Math.max(0, width - base)
  return {
    pad,
    gap,
    width: items.length > 1 ? width : base,
    gaps: gaps(items.length, space, gap),
    items: items.map((item, index) => {
      const step = steps[index]!
      const variant = item.variants[step]!
      return {
        id: item.id,
        box: variant.box ?? false,
        gap: variant.gap ?? 1,
        parts: variant.parts,
        variant: step,
        width: size(item, step, pad),
      }
    }),
  } satisfies PromptFooterLayout
}

function windowed(items: PromptFooterItem[], count: number) {
  if (count >= items.length) return items
  let left = items.length - count
  return items
    .toReversed()
    .filter((item) => {
      if (item.required) return true
      if (left <= 0) return true
      left -= 1
      return false
    })
    .toReversed()
}

function fit(items: PromptFooterItem[], pad: number, gap: number, width: number) {
  const min = items.filter((item) => item.required).length
  for (let count = items.length; count >= min; count--) {
    const shown = windowed(items, count)
    const steps = shown.map(() => 0)
    if (used(shown, steps, pad, gap) <= width) return build(shown, steps, pad, gap, width)
    while (true) {
      const index = shown.findLastIndex((item: PromptFooterItem, offset: number) => steps[offset]! < item.variants.length - 1)
      if (index === -1) break
      steps[index] = steps[index]! + 1
      if (used(shown, steps, pad, gap) <= width) return build(shown, steps, pad, gap, width)
    }
  }

  const keep = items.filter((item) => item.required)
  const steps = keep.map((item) => Math.max(0, item.variants.length - 1))
  return build(keep, steps, pad, gap, Math.max(width, used(keep, steps, pad, gap)))
}

function score(layout: PromptFooterLayout) {
  return layout.items.length * 1000 + layout.items.reduce((sum, item) => sum + (100 - item.variant), 0) + layout.pad
}

export function layoutPromptFooter(input: {
  width: number
  items: PromptFooterItem[]
  gap?: number
  pads?: number[]
}) {
  if (input.items.length === 0) {
    return {
      pad: 0,
      gap: 0,
      width: 0,
      gaps: [],
      items: [],
    } satisfies PromptFooterLayout
  }

  const pads = input.pads ?? [1, 0]
  const gap = input.gap ?? 1
  const width = Math.max(0, input.width)
  return pads
    .map((pad) => fit(input.items, pad, gap, width))
    .reduce((best, next) => {
      if (!best) return next
      if (score(next) > score(best)) return next
      return best
    }, undefined as PromptFooterLayout | undefined)!
}
