export type SessionStripStatus = "none" | "working" | "waiting" | "ready" | "done"

export type SessionStripTab = {
  id: string
  title: string
  status?: SessionStripStatus
}

export type SessionStripLayout = {
  tabs: SessionStripTab[]
  hidden: number
  before: number
  after: number
  prev?: string
  next?: string
  underline: string
}

export type SessionStripUnderlineSegment = {
  text: string
  owners: string[]
}

const SEP_GLYPH = "│"
const SEP = ` ${SEP_GLYPH} `
const ACTIVE = "* "
const CLOSE = "X"
const CLOSE_SLOT = ` ${CLOSE}`
const STATUS_SLOT = "■ "
const RULE = "─"
const JOINT = "┴"
const PREV = "<"
const NEXT = ">"
const SEP_MARK = width(" ")

type Slice = {
  start: number
  end: number
}

function width(text: string) {
  return Bun.stringWidth(text)
}

function item(tab: SessionStripTab, active: boolean) {
  return (active ? ACTIVE : "") + tab.title
}

export function sessionStripTabLabel(tab: SessionStripTab, active: boolean) {
  return item(tab, active)
}

export function sessionStripTabClose(hovered: boolean) {
  return hovered ? CLOSE : " "
}

export function sessionStripWidth(total: number, inset: number) {
  return Math.max(0, total - inset * 2)
}

function tabWidth(tab: SessionStripTab, active: boolean) {
  return width(STATUS_SLOT + item(tab, active) + CLOSE_SLOT)
}

function measure(tabs: SessionStripTab[], slice: Slice, active: string | undefined) {
  const visible = tabs.slice(slice.start, slice.end + 1)
  const before = slice.start
  const after = tabs.length - slice.end - 1
  const hidden = before + after
  const lead = before === 0 && visible.length > 0 ? width(SEP) : 0
  const body =
    lead +
    visible.reduce((sum, tab) => {
      return sum + tabWidth(tab, tab.id === active) + width(SEP)
    }, 0)
  const nav =
    (before > 0 ? width(PREV + SEP) : 0) + (hidden > 0 ? width(`+${hidden}`) : 0) + (after > 0 ? width(SEP + NEXT) : 0)
  return {
    tabs: visible,
    hidden,
    before,
    after,
    prev: before > 0 ? tabs[slice.start - 1]?.id : undefined,
    next: after > 0 ? tabs[slice.end + 1]?.id : undefined,
    width: body + nav,
  }
}

function joints(layout: Omit<SessionStripLayout, "underline">, active: string | undefined) {
  const points: number[] = []
  let offset = 0
  if (layout.before === 0 && layout.tabs.length > 0) {
    points.push(SEP_MARK)
    offset += width(SEP)
  }
  if (layout.before > 0) {
    offset += width(PREV)
    points.push(offset + SEP_MARK)
    offset += width(SEP)
  }
  for (const tab of layout.tabs) {
    offset += tabWidth(tab, tab.id === active)
    points.push(offset + SEP_MARK)
    offset += width(SEP)
  }
  if (layout.after > 0) {
    offset += width(`+${layout.hidden}`)
    points.push(offset + SEP_MARK)
  }
  return points
}

function underline(width: number, points: number[]) {
  const set = new Set(points)
  return Array.from({ length: width }, (_, index) => (set.has(index) ? JOINT : RULE)).join("")
}

function result(tabs: SessionStripTab[], slice: Slice, active: string | undefined, width: number): SessionStripLayout {
  const layout = measure(tabs, slice, active)
  return {
    tabs: layout.tabs,
    hidden: layout.hidden,
    before: layout.before,
    after: layout.after,
    prev: layout.prev,
    next: layout.next,
    underline: underline(width, joints(layout, active)),
  }
}

function better(next: Slice, best: Slice) {
  const size = next.end - next.start
  const current = best.end - best.start
  if (size !== current) return size > current
  return next.start < best.start
}

export function layoutSessionStripUnderlineSegments(
  layout: SessionStripLayout,
  input: {
    active?: string
    prevOwner?: string
    nextOwner?: string
  },
): SessionStripUnderlineSegment[] {
  const parts = [
    ...(layout.before > 0
      ? [
          { width: width(PREV), owners: input.prevOwner ? [input.prevOwner] : [] },
          { width: width(SEP), owners: [] as string[] },
        ]
      : layout.tabs.length > 0
        ? [{ width: width(SEP), owners: [] as string[] }]
        : []),
    ...layout.tabs.flatMap((tab) => [
      { width: tabWidth(tab, tab.id === input.active), owners: [tab.id] },
      { width: width(SEP), owners: [] as string[] },
    ]),
    ...(layout.hidden > 0 ? [{ width: width(`+${layout.hidden}`), owners: [] as string[] }] : []),
    ...(layout.after > 0
      ? [
          { width: width(SEP), owners: [] as string[] },
          { width: width(NEXT), owners: input.nextOwner ? [input.nextOwner] : [] },
        ]
      : []),
  ]
  const full = Array.from(layout.underline)
  const used = parts.reduce((sum, part) => sum + part.width, 0)
  const padded = used < full.length ? [...parts, { width: full.length - used, owners: [] as string[] }] : parts
  let offset = 0
  return padded.flatMap((part) => {
    if (part.width <= 0) return []
    const text = full.slice(offset, offset + part.width).join("")
    offset += part.width
    return [{ text, owners: [...new Set(part.owners)] }]
  })
}

export function layoutSessionStrip(
  tabs: SessionStripTab[],
  input: {
    active?: string
    width: number
  },
): SessionStripLayout {
  if (tabs.length === 0 || input.width <= 0) {
    return {
      tabs: [],
      hidden: tabs.length,
      before: 0,
      after: 0,
      prev: undefined,
      next: undefined,
      underline: "",
    }
  }

  const active = tabs.findIndex((tab) => tab.id === input.active)
  if (active === -1) {
    let best = { start: 0, end: 0 }
    for (let end = 0; end < tabs.length; end++) {
      const next = { start: 0, end }
      if (measure(tabs, next, input.active).width > input.width) continue
      best = next
    }
    return result(tabs, best, input.active, input.width)
  }

  let best = { start: active, end: active }
  for (let start = 0; start <= active; start++) {
    for (let end = active; end < tabs.length; end++) {
      const next = { start, end }
      if (measure(tabs, next, input.active).width > input.width) continue
      if (better(next, best)) best = next
    }
  }

  return result(tabs, best, input.active, input.width)
}

export const SessionStripText = {
  ACTIVE,
  CLOSE,
  PREV,
  NEXT,
  SEP,
}
