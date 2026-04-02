function trim(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

export function domain(stage: string) {
  if (stage === "production") return "slopcode.dev"
  if (stage === "dev") return "dev.slopcode.ai"
  return `${stage}.dev.slopcode.ai`
}

export function urls(stage: string) {
  const host = domain(stage)
  return {
    site: `https://${host}`,
    docs: `https://docs.${host}`,
    auth: `https://auth.${host}`,
    share: `https://share.${host}`,
  }
}

export function site() {
  if (import.meta.env.VITE_SITE_URL) return trim(import.meta.env.VITE_SITE_URL)
  if (!import.meta.env.SSR && globalThis.location) return globalThis.location.origin
  if (import.meta.env.VITE_AUTH_URL) return trim(import.meta.env.VITE_AUTH_URL).replace("://auth.", "://")
  return urls("production").site
}
