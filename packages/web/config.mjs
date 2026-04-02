const stage = process.env.SST_STAGE || (process.env.VERCEL_ENV === "production" ? "production" : "dev")

function domain(stage) {
  if (stage === "production") return "slopcode.dev"
  if (stage === "dev") return "dev.slopcode.ai"
  return `${stage}.dev.slopcode.ai`
}

const host = domain(stage)
const url = `https://${host}`

export default {
  url,
  console: `${url}/auth`,
  share: `https://share.${host}`,
  email: "contact@slopcode.dev",
  socialCard: "https://social-cards.sst.dev",
  github: "https://github.com/teamslop/slopcode",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs/" },
  ],
}
