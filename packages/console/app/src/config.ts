/**
 * Application-wide constants and configuration
 */
export const config = {
  // Base URL
  baseUrl: "https://slopcode.ai",

  // GitHub
  github: {
    repoUrl: "https://github.com/anomalyco/slopcode",
    starsFormatted: {
      compact: "100K",
      full: "100,000",
    },
  },

  // Social links
  social: {
    twitter: "https://x.com/slopcode",
    discord: "https://discord.gg/slopcode",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "700",
    commits: "9,000",
    monthlyUsers: "2.5M",
  },
} as const
