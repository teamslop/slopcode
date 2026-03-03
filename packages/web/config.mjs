const stage = process.env.SST_STAGE || (process.env.VERCEL_ENV === "production" ? "production" : "dev")

export default {
  url: stage === "production" ? "https://slopcode.dev" : `https://${stage}.slopcode.ai`,
  console: stage === "production" ? "https://slopcode.dev/auth" : `https://${stage}.slopcode.ai/auth`,
  email: "contact@slopcode.dev",
  socialCard: "https://social-cards.sst.dev",
  github: "https://github.com/teamslop/slopcode",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs/" },
  ],
}
