import { type ConsoleMessage, expect, type Page, test } from '@playwright/test'

test.describe('UX & Interactive Performance', () => {
  test('Table of Contents: Scrolling and Hash Update', async ({ page }: { page: Page }) => {
    // Visit a page with content (base service page usually has ToC)
    await page.goto('/vyvedennya-iz-zapoyu')

    const toc = page.locator('nav[aria-label="Зміст"], nav[aria-label="Содержание"]')
    await expect(toc).toBeVisible()

    const firstLink = toc.locator('a').first()
    const href = await firstLink.getAttribute('href')

    if (href?.startsWith('#')) {
      await firstLink.click()
      await page.waitForTimeout(500) // Wait for scroll animation

      const url = page.url()
      expect(url).toContain(href)

      // Check if target is in viewport or at top
      const target = page.locator(href)
      await expect(target).toBeInViewport()
    }
  })

  test('Colloquial Terms Visibility', async ({ page }: { page: Page }) => {
    await page.goto('/vyvedennya-iz-zapoyu')

    // Check for colloquial terms aside
    const colloquial = page.locator('aside[aria-labelledby="colloquial-heading"]')
    // It might be below the fold, but should be in DOM
    await expect(colloquial).toBeAttached()

    const heading = colloquial.locator('#colloquial-heading')
    await expect(heading).toBeVisible()
  })

  test('Partytown & GTM Initialization', async ({ page }: { page: Page }) => {
    await page.goto('/')

    // Evaluate window.dataLayer
    const dataLayer = await page.evaluate(
      () => (globalThis as unknown as { dataLayer: Array<{ event?: string }> }).dataLayer,
    )

    expect(dataLayer).toBeDefined()
    expect(Array.isArray(dataLayer)).toBe(true)

    // Check if GTM initialized (usually has 'gtm.js' event)
    const hasGtmInit = dataLayer.some((item: { event?: string }) => item.event === 'gtm.js')
    expect(hasGtmInit).toBe(true)

    // Check console for Partytown errors
    const logs: string[] = []
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error' && msg.text().includes('partytown')) {
        logs.push(msg.text())
      }
    })

    await page.reload()
    expect(logs).toHaveLength(0)
  })
})
