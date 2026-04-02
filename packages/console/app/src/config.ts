import { site } from "~/lib/site"

const base = site()
const github = "https://github.com/teamslop/slopcode"
const install = `${base}/install`

/**
 * Application-wide constants and configuration
 */
export const config = {
  baseUrl: base,
  urls: {
    auth: `${base}/auth`,
    brand: `${base}/brand`,
    changelog: `${base}/changelog`,
    desktop_feedback: `${base}/desktop-feedback`,
    discord: `${base}/discord`,
    docs: `${base}/docs`,
    download: `${base}/download`,
    install,
    install_display: install.replace(/^https?:\/\//, ""),
    zen: `${base}/zen`,
  },
  github: {
    repoUrl: github,
    licenseUrl: `${github}?tab=MIT-1-ov-file#readme`,
    releasesUrl: `${github}/releases`,
    starsFormatted: {
      compact: "100K",
      full: "100,000",
    },
  },
  install: {
    apt: "curl -fsSL https://teamslop.github.io/apt-slopcode/install.sh | sudo bash",
    brew: "brew install teamslop/slopcode/slopcode",
    bun: "bun install -g slopcode",
    curl: `curl -fsSL ${install} | bash`,
    desktop_brew: "brew install --cask slopcode-desktop",
    nix: "nix profile install github:teamslop/slopcode#slopcode",
    npm: "npm i -g slopcode",
    paru: "paru -S slopcode",
  },
  social: {
    discord: "https://discord.gg/slopcode",
    twitter: "https://x.com/slopcode",
  },
  stats: {
    contributors: "700",
    commits: "9,000",
    monthlyUsers: "2.5M",
  },
} as const
