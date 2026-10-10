import { expect, test } from './fixtures'

const selectedTheme = process.env.HAVENHUB_THEME ?? 'burgundy'
const expectedTokens: Record<string, { primary: string; contact: string; footer: string }> = {
  burgundy: {
    primary: '#762d46',
    contact: 'rgb(59, 35, 44)',
    footer: 'rgb(43, 29, 36)',
  },
  'navy-teal': {
    primary: '#086f73',
    contact: 'rgb(22, 56, 71)',
    footer: 'rgb(13, 41, 53)',
  },
}

test('the selected build-time token system applies to the whole page', async ({ page }) => {
  await page.goto('/')
  const expected = expectedTokens[selectedTheme]
  expect(expected, `test setup must know theme ${selectedTheme}`).toBeDefined()

  await expect(page.locator('html')).toHaveAttribute('data-theme', selectedTheme)
  const actual = await page.evaluate(() => ({
    primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
    contact: getComputedStyle(document.querySelector('.contact')!).backgroundColor,
    footer: getComputedStyle(document.querySelector('.footer')!).backgroundColor,
    hasThemePicker: document.querySelector('[data-theme-picker]') !== null,
  }))
  expect(actual).toEqual({ ...expected, hasThemePicker: false })
})

test('the theme does not break narrow reflow or CTA visibility', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await expect(page.locator('#hero a[href^="tel:"]')).toBeVisible()
  await expect(page.locator('#contact a[href^="tel:"]')).toBeVisible()
})
