import process from 'node:process'

export const themeNames = ['burgundy', 'navy-teal']

export function resolveTheme(value = process.env.HAVENHUB_THEME) {
  const theme = value ?? 'burgundy'

  if (!themeNames.includes(theme)) {
    throw new Error(`HAVENHUB_THEME must be one of: ${themeNames.join(', ')}`)
  }

  return theme
}
