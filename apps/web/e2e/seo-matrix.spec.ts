import { expect, type Page, test } from '@playwright/test'

const testUrls = [
  '/',
  '/ru/',
  '/vyvedennya-iz-zapoyu-lviv',
  '/ru/vyvod-iz-zapoya-lvov',
  '/lviv/syhivskyy/vyvedennya-iz-zapoyu-lviv',
  '/ru/lviv/syhivskyy/vyvod-iz-zapoya-lvov',
]

test.describe('SEO Matrix & Hreflang', () => {
  for (const url of testUrls) {
    test(`Verify SEO tags for ${url}`, async ({ page }: { page: Page }) => {
      const response = await page.goto(url)
      expect(response?.status()).toBe(200)

      // 1. Title is not empty
      const title = await page.title()
      expect(title.length).toBeGreaterThan(0)

      // 2. Hreflang tags
      const hreflangs = await page.locator('link[rel="alternate"][hreflang]')
      const count = await hreflangs.count()
      expect(count).toBeGreaterThanOrEqual(2) // uk-UA, ru-UA, x-default usually

      const ukHreflang = page.locator('link[rel="alternate"][hreflang="uk-UA"]')
      const ruHreflang = page.locator('link[rel="alternate"][hreflang="ru-UA"]')
      const xDefault = page.locator('link[rel="alternate"][hreflang="x-default"]')

      await expect(ukHreflang).toHaveAttribute('href', /.*/)
      await expect(ruHreflang).toHaveAttribute('href', /.*/)
      await expect(xDefault).toHaveAttribute('href', /.*/)

      // 3. OG Locale Alternate
      const ogLocaleAlt = page.locator('meta[property="og:locale:alternate"]')
      await expect(ogLocaleAlt).toBeAttached()
      const content = await ogLocaleAlt.getAttribute('content')
      // If current is uk, alt should be ru_UA, and vice versa
      if (url.includes('/ru/')) {
        expect(content).toBe('uk_UA')
      } else {
        expect(content).toBe('ru_UA')
      }
    })
  }
})
