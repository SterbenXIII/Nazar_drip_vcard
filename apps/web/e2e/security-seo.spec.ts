import { expect, test } from '@playwright/test'

import { REPRESENTATIVE_URLS, type RepresentativeUrl } from './fixtures'

// ---------------------------------------------------------------------------
// Security & SEO Headers Audit
// ---------------------------------------------------------------------------

test.describe('Security Headers', () => {
  const homeUrl: RepresentativeUrl = REPRESENTATIVE_URLS[0]

  test('Content-Security-Policy meta tag is present', async ({ page }) => {
    await page.goto(homeUrl.path, { waitUntil: 'domcontentloaded' })

    const csp = page.locator('meta[http-equiv="Content-Security-Policy"]')
    await expect(csp).toBeAttached()

    const content = await csp.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content).toContain('default-src')
    expect(content).toContain('script-src')
  })

  test('External links have rel="noopener noreferrer"', async ({ page }) => {
    await page.goto(homeUrl.path, { waitUntil: 'domcontentloaded' })

    // Get all <a> with target="_blank"
    const blanks = page.locator('a[target="_blank"]')
    const count = await blanks.count()

    for (let i = 0; i < count; i++) {
      const link = blanks.nth(i)
      const rel = await link.getAttribute('rel')
      const href = await link.getAttribute('href')

      expect(rel, `Link "${href}" has target="_blank" but missing rel attribute`).toBeTruthy()

      expect(rel, `Link "${href}" needs noopener in rel`).toContain('noopener')
    }
  })

  test('No internal links open in new tab', async ({ page }) => {
    await page.goto(homeUrl.path, { waitUntil: 'domcontentloaded' })

    const allLinks = page.locator('a[href]')
    const count = await allLinks.count()

    for (let i = 0; i < count; i++) {
      const link = allLinks.nth(i)
      const href = await link.getAttribute('href')
      const target = await link.getAttribute('target')

      // Internal links: start with / or contain the site domain
      const isInternal =
        href?.startsWith('/') ||
        href?.startsWith('#') ||
        href?.includes('localhost:4321') ||
        href?.includes('krapelnytsia.lviv.ua')

      if (isInternal && target === '_blank') {
        // Internal links should not open in new tab
        expect(target, `Internal link "${href}" should not use target="_blank"`).not.toBe('_blank')
      }
    }
  })
})

// ---------------------------------------------------------------------------
// SEO Integrity
// ---------------------------------------------------------------------------

test.describe('SEO Integrity', () => {
  for (const url of REPRESENTATIVE_URLS) {
    test(`[${url.label}] lang="${url.lang}" matches og:locale="${url.ogLocale}"`, async ({
      page,
    }) => {
      await page.goto(url.path, { waitUntil: 'domcontentloaded' })

      // Verify <html lang>
      const htmlLang = await page.locator('html').getAttribute('lang')
      expect(htmlLang, `Expected lang="${url.lang}"`).toBe(url.lang)

      // Verify og:locale
      const ogLocale = await page.locator('meta[property="og:locale"]').getAttribute('content')
      expect(ogLocale, `Expected og:locale="${url.ogLocale}"`).toBe(url.ogLocale)

      // Cross-validate: lang prefix should match og:locale prefix
      const langPrefix = htmlLang?.substring(0, 2)
      const ogPrefix = ogLocale?.substring(0, 2)
      expect(langPrefix, 'lang and og:locale language prefix mismatch').toBe(ogPrefix)
    })
  }

  test('Canonical URL is absolute and well-formed', async ({ page }) => {
    const url = REPRESENTATIVE_URLS[2] // Base Service UK
    await page.goto(url.path, { waitUntil: 'domcontentloaded' })

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBeTruthy()
    expect(canonical).toMatch(/^https?:\/\//)
    // Should not contain double slashes (except after protocol)
    expect(canonical?.replace('://', '')).not.toContain('//')
  })

  test('Every page has a unique title', async ({ page }) => {
    const titles: string[] = []

    for (const url of REPRESENTATIVE_URLS) {
      await page.goto(url.path, { waitUntil: 'domcontentloaded' })
      const title = await page.title()
      expect(title.length, `Empty title on ${url.path}`).toBeGreaterThan(0)
      expect(title.length, `Title too long on ${url.path}: ${title}`).toBeLessThanOrEqual(70)
      titles.push(title)
    }

    // Check uniqueness (allow Home UK and Home RU to differ)
    const uniqueTitles = new Set(titles)
    expect(uniqueTitles.size, `Duplicate titles found: ${JSON.stringify(titles)}`).toBe(
      titles.length,
    )
  })

  test('Meta description exists and is within bounds', async ({ page }) => {
    for (const url of REPRESENTATIVE_URLS) {
      await page.goto(url.path, { waitUntil: 'domcontentloaded' })

      const desc = await page.locator('meta[name="description"]').getAttribute('content')
      expect(desc, `Missing meta description on ${url.path}`).toBeTruthy()
      expect(
        desc!.length,
        `Description too short on ${url.path}: "${desc}"`,
      ).toBeGreaterThanOrEqual(50)
      expect(
        desc!.length,
        `Description too long on ${url.path}: ${desc!.length} chars`,
      ).toBeLessThanOrEqual(160)
    }
  })

  test('Single H1 per page', async ({ page }) => {
    for (const url of REPRESENTATIVE_URLS) {
      await page.goto(url.path, { waitUntil: 'domcontentloaded' })

      const h1Count = await page.locator('h1').count()
      expect(h1Count, `Expected exactly 1 <h1> on ${url.path}, found ${h1Count}`).toBe(1)
    }
  })
})
