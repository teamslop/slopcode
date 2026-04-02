import { Resource } from "@slopcode-ai/console-resource"
import { urls } from "~/lib/site"

function trim(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

function site() {
  if (import.meta.env.VITE_SHARE_URL) return trim(import.meta.env.VITE_SHARE_URL)
  return urls(Resource.App.stage).share
}

export function proxy(request: Request) {
  const req = request.clone()
  const url = new URL(req.url)
  return fetch(`${site()}${url.pathname}${url.search}`, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  })
}
