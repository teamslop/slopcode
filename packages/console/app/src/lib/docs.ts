import { docs, localeFromRequest, tag } from "~/lib/language"

function trim(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

function site() {
  if (import.meta.env.VITE_DOCS_URL) return trim(import.meta.env.VITE_DOCS_URL)
  return "https://www.slopcode.dev"
}

export function proxy(request: Request, path: string) {
  const req = request.clone()
  const url = new URL(req.url)
  const locale = localeFromRequest(req)
  const headers = new Headers(req.headers)
  headers.set("accept-language", tag(locale))
  return fetch(`${site()}${docs(locale, path)}${url.search}`, {
    method: req.method,
    headers,
    body: req.body,
  })
}
