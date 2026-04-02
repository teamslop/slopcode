import { Resource } from "@slopcode-ai/console-resource"
import { docs, localeFromRequest, tag } from "~/lib/language"
import { urls } from "~/lib/site"

function trim(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

function site() {
  if (import.meta.env.VITE_DOCS_URL) return trim(import.meta.env.VITE_DOCS_URL)
  return urls(Resource.App.stage).docs
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
