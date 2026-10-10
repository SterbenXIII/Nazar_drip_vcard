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

  test('uses the confirmed intoxication price across visible content and schema', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('body')).toContainText('2000')
    await expect(page.locator('body')).not.toContainText('1800')

    await page.goto('/krapelnytsia-vid-alkoholnoi-intoksykatsii')
    await expect(page.locator('body')).toContainText('2000')
    await expect(page.locator('body')).not.toContainText('1800')
    await expect(page.locator('meta[itemprop="price"]').first()).toHaveAttribute('content', '2000')
  })

  test('homepage contact actions use the public contact destinations', async ({ page }) => {
    await page.goto('/')

    const links = page.locator('.contact-row a')
    const hrefs = await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute('href')!),
    )
    expect(hrefs).toHaveLength(4)
    expect(hrefs.join(' ')).not.toMatch(/xxxx|30000000000/i)

    await expect(page.locator('.contact-row a[aria-label="Телефон"]')).toHaveAttribute(
      'href',
      'tel:+380634814077',
    )
    const maps = new URL(
      await page.locator('.contact-row a[aria-label="Адреса"]').getAttribute('href')!,
    )
    expect(maps.searchParams.get('query')).toBe('Львів, виїзд у всі райони')
    await expect(page.locator('.contact-row a[aria-label="Telegram"]')).toHaveAttribute(
      'href',
      'https://t.me/KostyvL',
    )
    await expect(page.locator('.contact-row a[href^="https://wa.me/"]')).toHaveAttribute(
      'href',
      'https://wa.me/380634814077',
    )
  })

  test('service FAQ JSON-LD resolves the displayed price token', async ({ page }) => {
    await page.goto('/krapelnytsia-vid-alkoholnoi-intoksykatsii')

    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(schemas.join(' ')).not.toContain('{price}')
  })

  test('certificate downloads the certificate image', async ({ page }) => {
    await page.goto('/certificate')

    const downloadUrl = await page.locator('a[download]').first().getAttribute('href')
    expect(downloadUrl).toBeTruthy()
    const image = await page.request.get(downloadUrl!)
    expect(image.ok()).toBe(true)
    expect(image.headers()['content-type']).toContain('image/png')
  })

  test('all referenced site icons are present', async ({ page }) => {
    await page.goto('/')

    for (const [path, contentType] of [
      ['/favicon.ico', /image\/(x-icon|vnd\.microsoft\.icon)/],
      ['/favicon.svg', /image\/svg\+xml/],
      ['/apple-touch-icon-180x180.png', /image\/png/],
    ]) {
      const response = await page.request.get(path)
      expect(response.ok(), path).toBe(true)
      expect(response.headers()['content-type'], path).toMatch(contentType)
    }
    await expect(page.locator('img[src="/favicon.svg"]')).toBeAttached()
  })
})
