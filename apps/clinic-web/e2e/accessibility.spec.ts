import AxeBuilder from '@axe-core/playwright'

import { expect, test } from './fixtures'

const isStaging = process.env.CLINIC_SITE_MODE === 'staging'
const routes = ['/', '/programa/', '/umovy/', '/rodyni/', '/napriamy/'] as const

for (const route of routes) {
  test(`${route} supports axe, skip-to-main, and 320px reflow`, async ({ page }) => {
    test.skip(route !== '/' && !isStaging, 'supporting routes are absent in normal')
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto(route)

    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.locator('main#content')).toHaveAttribute('tabindex', '-1')
    await page.keyboard.press('Tab')
    await expect(page.locator('.skip-link')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main#content')).toBeFocused()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
}

test('200%-equivalent reduced CSS viewport plus 200% text resizing retains access to contacts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 450 })
  await page.goto('/')
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('#contact a[href="tel:+380779742422"]')).toBeVisible()
  await expect(page.locator('#contact a[href="https://t.me/HavenRehub"]')).toBeVisible()
})

test('reduced-motion media disables smooth scroll and animated menu transitions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 650 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  )
  const settings = await page.evaluate(() => ({
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
    transition: getComputedStyle(document.querySelector<HTMLElement>('.menu-icon span')!)
      .transitionDuration,
  }))
  expect(settings.scroll).toBe('auto')
  expect(settings.transition.split(',').every((value) => parseFloat(value) <= 0.001)).toBe(true)
})

test('404 provides a useful home route and remains noindex', async ({ page }) => {
  await page.goto('/404.html')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Сторінку не знайдено')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
  await expect(page.getByRole('link', { name: 'На головну' })).toHaveAttribute('href', '/')
  await page.getByRole('link', { name: 'На головну' }).click()
  await expect(page).toHaveURL('/')
})
