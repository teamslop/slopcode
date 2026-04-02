/// <reference types="@solidjs/start/env" />

interface ImportMetaEnv {
  readonly VITE_AUTH_URL?: string
  readonly VITE_DOCS_URL?: string
  readonly VITE_SHARE_URL?: string
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export declare module "@solidjs/start/server" {
  export type APIEvent = { request: Request }
}
