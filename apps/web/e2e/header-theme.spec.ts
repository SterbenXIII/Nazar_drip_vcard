import { expect, test } from '@playwright/test'

test.describe('Homepage header and theme controls', () => {
  test('keeps the redesigned header spaced from the viewport and removes certificate navigation', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('vcard:welcome-dismissed', '1'))
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const header = page.locator('header.main-header')
    await expect(header).toBeVisible()
    await expect(header).toContainText('Медична детоксикація вдома у Львові')
    await expect(header.locator('a[href="/certificate"]')).toHaveCount(0)

    const marginTop = await header.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).marginTop),
    )
    expect(marginTop).toBeGreaterThanOrEqual(24)
  })

  test('toggles dark mode, updates the accessible label, and persists the choice', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('theme')
      localStorage.setItem('vcard:welcome-dismissed', '1')
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const toggle = page.locator('[data-theme-toggle]')
    await expect(toggle).toHaveAttribute('aria-label', 'Увімкнути темну тему')
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await toggle.click()

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(toggle).toHaveAttribute('aria-label', 'Увімкнути світлу тему')
    await expect(page.evaluate(() => localStorage.getItem('theme'))).resolves.toBe('dark')
  })

  test('keeps the revised Russian header copy localized', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('vcard:welcome-dismissed', '1'))
    await page.goto('/ru/', { waitUntil: 'domcontentloaded' })

    const header = page.locator('header.main-header')
    await expect(header).toContainText('Медицинская детоксикация на дому во Львове')
    await expect(header).toContainText('Львов и область · выезд 24/7')
    await expect(header.locator('a[href="/certificate"]')).toHaveCount(0)
  })
})
