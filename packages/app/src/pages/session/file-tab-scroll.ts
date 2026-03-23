type Input = {
  prevScrollWidth: number
  scrollWidth: number
  clientWidth: number
  prevContextOpen: boolean
  contextOpen: boolean
}

type Box = {
  left: number
  right: number
}

export const nextTabListScrollLeft = (input: Input) => {
  if (input.scrollWidth <= input.prevScrollWidth) return
  if (!input.prevContextOpen && input.contextOpen) return 0
  if (input.scrollWidth <= input.clientWidth) return
  return input.scrollWidth - input.clientWidth
}

export const nextTabListDividerLeft = (input: { list: Box; tabs: Box[] }) => {
  const tab = input.tabs.find((tab) => tab.right > input.list.left)
  if (!tab) return
  return Math.max(tab.left - input.list.left, 0)
}

const syncLeadingDivider = (el: HTMLDivElement) => {
  const divider = el.parentElement?.querySelector<HTMLElement>('[data-slot="tabs-leading-divider"]')
  if (!divider) return

  const list = el.getBoundingClientRect()
  const left = nextTabListDividerLeft({
    list,
    tabs: Array.from(el.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger-wrapper"]'))
      .map((tab) => tab.getBoundingClientRect())
      .filter((tab) => tab.width > 0 && tab.left < list.right && tab.right > list.left),
  })

  divider.toggleAttribute("data-hidden", left === undefined)
  if (left === undefined) return
  divider.style.left = `${left}px`
}

export const createFileTabListSync = (input: { el: HTMLDivElement; contextOpen: () => boolean }) => {
  let frame: number | undefined
  let prevScrollWidth = input.el.scrollWidth
  let prevContextOpen = input.contextOpen()

  const update = () => {
    const scrollWidth = input.el.scrollWidth
    const clientWidth = input.el.clientWidth
    const contextOpen = input.contextOpen()
    const left = nextTabListScrollLeft({
      prevScrollWidth,
      scrollWidth,
      clientWidth,
      prevContextOpen,
      contextOpen,
    })

    if (left !== undefined) {
      input.el.scrollTo({
        left,
        behavior: "smooth",
      })
    }

    syncLeadingDivider(input.el)
    prevScrollWidth = scrollWidth
    prevContextOpen = contextOpen
  }

  const schedule = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      frame = undefined
      update()
    })
  }

  const onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
    input.el.scrollLeft += e.deltaY > 0 ? 50 : -50
    e.preventDefault()
  }

  input.el.addEventListener("wheel", onWheel, { passive: false })
  input.el.addEventListener("scroll", schedule, { passive: true })
  const observer = new MutationObserver(schedule)
  observer.observe(input.el, { childList: true, subtree: true, characterData: true })
  const resize = new ResizeObserver(schedule)
  resize.observe(input.el)
  schedule()

  return () => {
    input.el.removeEventListener("wheel", onWheel)
    input.el.removeEventListener("scroll", schedule)
    observer.disconnect()
    resize.disconnect()
    if (frame !== undefined) cancelAnimationFrame(frame)
  }
}
