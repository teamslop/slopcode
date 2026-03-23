export type SessionStripStatus = "none" | "working" | "done"

export type SessionStripTab = {
  id: string
  title: string
  status?: SessionStripStatus
}

export type SessionStripLayout = {
  tabs: SessionStripTab[]
  hidden: number
  underline: string
}

const SEP_GLYPH = "│"
const SEP = ` ${SEP_GLYPH} `
const ACTIVE = "* "
const CLOSE = "X"
const CLOSE_SLOT = ` ${CLOSE}`
const STATUS_SLOT = "⬝ "
const RULE = "─"
const JOINT = "┴"
const SEP_MARK = width(" ")

function width(text: string) {
  return Bun.stringWidth(text)
}

function item(tab: SessionStripTab, active: boolean) {
  return (active ? ACTIVE : "") + tab.title
}

export function sessionStripTabLabel(tab: SessionStripTab, active: boolean) {
  return item(tab, active) + " "
}

export function sessionStripTabClose(hovered: boolean) {
  return hovered ? CLOSE : " "
}

function tabWidth(tab: SessionStripTab, active: boolean) {
  return width(STATUS_SLOT + item(tab, active) + CLOSE_SLOT)
}

function layoutWidth(tabs: SessionStripTab[], active: string | undefined, total: number) {
  if (tabs.length === 0) {
    return {
      hidden: total,
      width: 0,
    }
  }

  const hidden = total - tabs.length
  const visible = tabs.reduce((sum, tab) => {
    return sum + tabWidth(tab, tab.id === active) + width(SEP)
  }, 0)

  return {
    hidden,
    width: visible + (hidden > 0 ? width(`+${hidden}`) : 0),
  }
}

function joints(tabs: SessionStripTab[], active: string | undefined) {
  const points: number[] = []
  let offset = 0
  for (const tab of tabs) {
    offset += tabWidth(tab, tab.id === active)
    points.push(offset + SEP_MARK)
    offset += width(SEP)
  }
  return points
}

function underline(width: number, points: number[]) {
  const set = new Set(points)
  return Array.from({ length: width }, (_, index) => (set.has(index) ? JOINT : RULE)).join("")
}

function result(tabs: SessionStripTab[], active: string | undefined, width: number, total: number): SessionStripLayout {
  const hidden = total - tabs.length
  return {
    tabs,
    hidden,
    underline: underline(width, joints(tabs, active)),
  }
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
      underline: "",
    }
  }

  const active = tabs.findIndex((tab) => tab.id === input.active)
  if (active === -1) {
    let best = tabs.slice(0, 1)
    for (let end = 0; end < tabs.length; end++) {
      const next = tabs.slice(0, end + 1)
      if (layoutWidth(next, input.active, tabs.length).width > input.width) break
      best = next
    }
    return result(best, input.active, input.width, tabs.length)
  }

  let best = [tabs[active]]
  for (let start = 0; start <= active; start++) {
    for (let end = active; end < tabs.length; end++) {
      const next = tabs.slice(start, end + 1)
      const size = layoutWidth(next, input.active, tabs.length)
      if (size.width > input.width) continue
      if (next.length > best.length) {
        best = next
        continue
      }
      if (next.length === best.length && start < tabs.indexOf(best[0]!)) {
        best = next
      }
    }
  }

  return result(best, input.active, input.width, tabs.length)
}

export const SessionStripText = {
  ACTIVE,
  CLOSE,
  SEP,
}
