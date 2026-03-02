// @ts-check
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import solidJs from "@astrojs/solid-js"
import cloudflare from "@astrojs/cloudflare"
import vercel from "@astrojs/vercel"
import config from "./config.mjs"
import { rehypeHeadingIds } from "@astrojs/markdown-remark"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import { spawnSync } from "child_process"
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs"

const onVercel = process.env.VERCEL === "1"
const base = onVercel ? "/" : "/docs"
const redirects = onVercel
  ? {
      "/docs": "/",
      "/docs/[...slug]": "/[...slug]",
    }
  : undefined

/**
 * @typedef {{
 *   type?: string
 *   url?: string
 *   children?: Node[]
 * }} Node
 */

/** @param {string} url */
function link(url) {
  if (url === "/docs") return "/"
  if (url.startsWith("/docs/")) return url.slice(5)
  if (url.startsWith("/docs?") || url.startsWith("/docs#")) return `/${url.slice(6)}`
  return url
}

/**
 * @param {Node} node
 * @param {(node: Node) => void} fn
 */
function visit(node, fn) {
  fn(node)
  if (!Array.isArray(node.children)) return
  node.children.forEach((child) => visit(child, fn))
}

function rewrite() {
  /** @param {Node} tree */
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== "link" && node.type !== "definition") return
      if (typeof node.url !== "string") return
      node.url = link(node.url)
    })
  }
}

export default defineConfig({
  site: config.url,
  base,
  redirects,
  output: "server",
  adapter: onVercel
    ? vercel({})
    : cloudflare({
        imageService: "passthrough",
      }),
  devToolbar: {
    enabled: false,
  },
  server: {
    host: "0.0.0.0",
  },
  markdown: {
    remarkPlugins: onVercel ? [rewrite] : [],
    rehypePlugins: [rehypeHeadingIds, [rehypeAutolinkHeadings, { behavior: "wrap" }]],
  },
  integrations: [
    configSchema(),
    solidJs(),
    starlight({
      title: "SlopCode",
      defaultLocale: "root",
      locales: {
        root: {
          label: "English",
          lang: "en",
          dir: "ltr",
        },
      },
      favicon: "/favicon-v3.svg",
      head: [
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/favicon-v3.ico",
            sizes: "32x32",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "icon",
            type: "image/png",
            href: "/favicon-96x96-v3.png",
            sizes: "96x96",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "apple-touch-icon",
            href: "/apple-touch-icon-v3.png",
            sizes: "180x180",
          },
        },
      ],
      lastUpdated: true,
      expressiveCode: { themes: ["github-light", "github-dark"] },
      social: [{ icon: "github", label: "GitHub", href: config.github }],
      editLink: {
        baseUrl: `${config.github}/edit/dev/packages/web/`,
      },
      markdown: {
        headingLinks: false,
      },
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: true,
      },
      sidebar: ["", "cli", "config", "providers", "tools", "commands", "agents", "themes", "troubleshooting"],
    }),
  ],
})

function configSchema() {
  return {
    name: "configSchema",
    hooks: {
      "astro:build:done": async () => {
        console.log("generating config schema")
        const schema = spawnSync(
          process.env.BUN_EXECUTABLE || "bun",
          ["../slopcode/script/schema.ts", "./dist/config.json", "./dist/tui.json"],
          {
            stdio: "inherit",
          },
        )
        if (schema.error) {
          throw schema.error
        }
        if (schema.status !== 0) {
          throw new Error("failed to generate config schema")
        }

        mkdirSync("./dist/docs", { recursive: true })
        copyFileSync("./dist/config.json", "./dist/docs/config.json")
        copyFileSync("./dist/tui.json", "./dist/docs/tui.json")

        writeFileSync(
          "./dist/docs/vercel.json",
          JSON.stringify(
            {
              redirects: [
                {
                  source: "/docs/:path+/",
                  destination: "/docs/:path+",
                  permanent: false,
                },
                {
                  source: "/auth",
                  destination: "https://opencode.ai/auth",
                  permanent: false,
                },
                {
                  source: "/auth/:path*",
                  destination: "https://opencode.ai/auth/:path*",
                  permanent: false,
                },
                {
                  source: "/discord",
                  destination: "https://discord.gg/slopcode",
                  permanent: false,
                },
                {
                  source: "/discord/",
                  destination: "https://discord.gg/slopcode",
                  permanent: false,
                },
              ],
              rewrites: [
                { source: "/docs", destination: "/" },
                { source: "/docs/", destination: "/" },
                { source: "/docs/:path+", destination: "/:path*" },
              ],
            },
            null,
            2,
          ),
        )
      },
    },
  }
}
