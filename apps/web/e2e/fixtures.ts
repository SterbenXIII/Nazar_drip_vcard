/**
 * Shared test fixtures: representative URL set covering every page archetype.
 * Do NOT hardcode all 126+ routes — sample one from each archetype.
 */

export interface RepresentativeUrl {
  /** Human-readable label for test output */
  label: string
  /** Relative path from baseURL */
  path: string
  /** Expected <html lang> value */
  lang: 'uk' | 'ru'
  /** Expected og:locale value */
  ogLocale: 'uk_UA' | 'ru_UA'
}

export const REPRESENTATIVE_URLS: readonly RepresentativeUrl[] = [
  { label: 'Home UK', path: '/', lang: 'uk', ogLocale: 'uk_UA' },
  { label: 'Home RU', path: '/ru/', lang: 'ru', ogLocale: 'ru_UA' },
  { label: 'Base Service UK', path: '/vyvedennya-iz-zapoyu-lviv', lang: 'uk', ogLocale: 'uk_UA' },
  { label: 'Base Service RU', path: '/ru/vyvod-iz-zapoya-lvov', lang: 'ru', ogLocale: 'ru_UA' },
  { label: 'City Hub', path: '/lviv/', lang: 'uk', ogLocale: 'uk_UA' },
  {
    label: 'District Matrix',
    path: '/lviv/syhivskyy/vyvedennya-iz-zapoyu-lviv',
    lang: 'uk',
    ogLocale: 'uk_UA',
  },
  { label: 'Certificate', path: '/certificate', lang: 'uk', ogLocale: 'uk_UA' },
] as const

/** Subset used for heavy tests (perf, full a11y) to keep runtime short */
export const PERF_URLS: readonly RepresentativeUrl[] = [
  REPRESENTATIVE_URLS[0], // Home UK
  REPRESENTATIVE_URLS[2], // Base Service UK
] as const
