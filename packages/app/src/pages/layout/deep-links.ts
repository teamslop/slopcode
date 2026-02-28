export const deepLinkEvent = "slopcode:deep-link"

export const parseDeepLink = (input: string) => {
  if (!input.startsWith("slopcode://")) return
  if (typeof URL.canParse === "function" && !URL.canParse(input)) return
  const url = (() => {
    try {
      return new URL(input)
    } catch {
      return undefined
    }
  })()
  if (!url) return
  if (url.hostname !== "open-project") return
  const directory = url.searchParams.get("directory")
  if (!directory) return
  return directory
}

export const collectOpenProjectDeepLinks = (urls: string[]) =>
  urls.map(parseDeepLink).filter((directory): directory is string => !!directory)

type SlopCodeWindow = Window & {
  __SLOPCODE__?: {
    deepLinks?: string[]
  }
}

export const drainPendingDeepLinks = (target: SlopCodeWindow) => {
  const pending = target.__SLOPCODE__?.deepLinks ?? []
  if (pending.length === 0) return []
  if (target.__SLOPCODE__) target.__SLOPCODE__.deepLinks = []
  return pending
}
