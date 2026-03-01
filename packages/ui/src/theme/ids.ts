export const DEFAULT_THEME_ID = "sc-1"

export function resolveThemeId(themeId: string) {
  return themeId
}

export function isDefaultTheme(themeId: string) {
  return resolveThemeId(themeId) === DEFAULT_THEME_ID
}
