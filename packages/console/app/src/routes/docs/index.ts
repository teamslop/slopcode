import type { APIEvent } from "@solidjs/start/server"
import { proxy } from "~/lib/docs"

function handler(evt: APIEvent) {
  const url = new URL(evt.request.url)
  return proxy(evt.request, url.pathname)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const OPTIONS = handler
export const PATCH = handler
