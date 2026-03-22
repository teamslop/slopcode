export type SessionStripTab = {
  id: string
  title: string
}

export type SessionStripLayout = {
  tabs: SessionStripTab[]
  hidden: number
}

const SEP = " | "
const ACTIVE = "* "

function width(text: string) {
  return Bun.stringWidth(text)
}

function tabWidth(tab: SessionStripTab, active: boolean) {
  return width((active ? ACTIVE : "") + tab.title)
}

function layoutWidth(tabs: SessionStripTab[], active: string | undefined, total: number) {
  if (tabs.length === 0) {
    return {
      hidden: total,
      width: 0,
    }
  }

  const hidden = total - tabs.length
  const visible = tabs.reduce((sum, tab, index) => {
    return sum + tabWidth(tab, tab.id === active) + (index === 0 ? 0 : width(SEP))
  }, 0)

  return {
    hidden,
    width: visible + (hidden > 0 ? width(SEP + `+${hidden}`) : 0),
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
    return {
      tabs: best,
      hidden: tabs.length - best.length,
    }
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

  return {
    tabs: best,
    hidden: tabs.length - best.length,
  }
}

export const SessionStripText = {
  ACTIVE,
  SEP,
}
