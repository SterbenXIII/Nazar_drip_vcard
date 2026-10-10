import type { Locale } from '../i18n/ui'

export const PRICE_KEYS = [
  'intoxication',
  'intoxication-price',
  'hangover',
  'binge',
  'narcologist',
  'vitamin',
] as const

export type PriceKey = (typeof PRICE_KEYS)[number]

export interface ServicePrice {
  amount: number
  uk: string
  ru: string
}

export const SERVICE_PRICES: Record<PriceKey, ServicePrice> = {
  intoxication: { amount: 5000, uk: 'від 5000 грн', ru: 'от 5000 грн' },
  'intoxication-price': { amount: 5000, uk: 'від 5000 грн', ru: 'от 5000 грн' },
  hangover: { amount: 5000, uk: 'від 5000 грн', ru: 'от 5000 грн' },
  binge: { amount: 5000, uk: 'від 5000 грн', ru: 'от 5000 грн' },
  narcologist: { amount: 5000, uk: 'від 5000 грн', ru: 'от 5000 грн' },
  vitamin: { amount: 1111, uk: 'від 1111 грн', ru: 'от 1111 грн' },
}

export function formatServicePrice(key: PriceKey, locale: Locale): string {
  return SERVICE_PRICES[key][locale]
}

export function formatPriceText(text: string, key: PriceKey, locale: Locale): string {
  return text.replaceAll('{price}', formatServicePrice(key, locale))
}
