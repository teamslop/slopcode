const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://slopcode.dev" : `https://${stage}.slopcode.ai`,
  console: stage === "production" ? "https://slopcode.dev/auth" : `https://${stage}.slopcode.ai/auth`,
  email: "contact@slopcode.dev",
  socialCard: "https://social-cards.sst.dev",
  github: "http://github.com/teamslop/slopcode",
  discord: "https://discord.gg/slopcode",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs/" },
  ],
}
