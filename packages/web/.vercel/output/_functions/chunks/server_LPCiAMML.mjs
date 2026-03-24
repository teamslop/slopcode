async function getMod() {
  return import("./server_BPqc5wjx.mjs")
}
const collectedLinks = []
const collectedStyles = []
const defaultMod = { __astroPropagation: true, getMod, collectedLinks, collectedStyles, collectedScripts: [] }

export { defaultMod as default }
