import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { REPRESENTATIVE_URLS, type RepresentativeUrl } from './fixtures'

// ---------------------------------------------------------------------------
// WCAG 2.1 AA / AAA Accessibility Audit
// ---------------------------------------------------------------------------

test.describe('Accessibility (WCAG 2.1 AA)', () => {
  for (const url of REPRESENTATIVE_URLS) {
    test(`[${url.label}] Zero axe-core violations`, async ({ page }) => {
      await page.goto(url.path, { waitUntil: 'domcontentloaded' })

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .analyze()

      // Pretty-print violations for debugging
      const violationSummary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        help: v.helpUrl,
      }))

      expect(
        results.violations,
        `Found ${results.violations.length} violation(s) on ${url.path}:\n${JSON.stringify(violationSummary, null, 2)}`,
      ).toHaveLength(0)
    })
  }
})

// ---------------------------------------------------------------------------
// Custom ARIA Landmark Verification
// ---------------------------------------------------------------------------

test.describe('ARIA Landmarks', () => {
  const serviceUrl: RepresentativeUrl = REPRESENTATIVE_URLS[2] // Base Service UK

  test('Table of Contents has proper nav landmark', async ({ page }) => {
    await page.goto(serviceUrl.path, { waitUntil: 'domcontentloaded' })

    const toc = page.locator(
      'nav[aria-label="Зміст сторінки"], nav[aria-label="Содержание страницы"]',
    )
    const tocCount = await toc.count()

    // TOC may not be rendered if the page has < 2 headings
    if (tocCount > 0) {
      await expect(toc.first()).toBeAttached()
      // Verify it contains links
      const links = toc.first().locator('a')
      expect(await links.count()).toBeGreaterThan(0)
    }
  })

  test('Colloquial Terms aside has proper labelledby', async ({ page }) => {
    await page.goto(serviceUrl.path, { waitUntil: 'domcontentloaded' })

    const aside = page.locator('aside[aria-labelledby="colloquial-heading"]')
    const asideCount = await aside.count()

    if (asideCount > 0) {
      await expect(aside.first()).toBeAttached()

      // Verify the heading element referenced by aria-labelledby exists
      const heading = page.locator('#colloquial-heading')
      await expect(heading).toBeAttached()
      expect(await heading.textContent()).toBeTruthy()
    }
  })

  test('All images have alt text', async ({ page }) => {
    await page.goto(serviceUrl.path, { waitUntil: 'domcontentloaded' })

    const images = page.locator('img')
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const src = await img.getAttribute('src')
      // alt="" is valid for decorative images; only fail on missing alt
      expect(alt, `Image ${src} is missing alt attribute`).not.toBeNull()
    }
  })
})
