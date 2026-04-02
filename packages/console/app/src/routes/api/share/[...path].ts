import type { APIEvent } from "@solidjs/start/server"
import { proxy } from "~/lib/share"

function handler(evt: APIEvent) {
  return proxy(evt.request)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const OPTIONS = handler
export const PATCH = handler
