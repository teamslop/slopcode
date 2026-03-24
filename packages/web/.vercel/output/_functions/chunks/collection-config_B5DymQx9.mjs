let userCollections
try {
  userCollections = (await import("./content.config_DjNHV70O.mjs")).collections
} catch {}
const collections = userCollections

export { collections }
