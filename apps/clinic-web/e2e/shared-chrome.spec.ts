import { expect, test } from './fixtures'

const supportingRoutes = ['/programa/', '/umovy/', '/rodyni/', '/napriamy/']
const staging = process.env.CLINIC_SITE_MODE === 'staging'

test('shared navigation only links to routes present in this build', async ({ page }) => {
  await page.goto('/')
  for (const route of supportingRoutes) {
    const links = page.locator(
      `.desktop-nav a[href="${route}"], .mobile-navigation a[href="${route}"], .footer a[href="${route}"]`,
    )
    await expect(links).toHaveCount(staging ? 3 : 0)
    if (staging) {
      const response = await page.request.get(route)
      expect(response.ok()).toBeTruthy()
      await page.goto(route)
      await expect(page.locator('.desktop-nav a[href="' + route + '"]')).toHaveCount(1)
      await expect(page.locator('.footer-navigation a[href="' + route + '"]')).toHaveCount(1)
      await page.goto('/')
    }
  }
})

test('every built page has one main landmark and a working skip link', async ({ page }) => {
  const routes = staging ? ['/', '/404.html', ...supportingRoutes] : ['/', '/404.html']
  for (const route of routes) {
    await page.goto(route)
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.locator('.skip-link')).toHaveAttribute('href', '#content')
    await expect(page.locator('main#content')).toHaveCount(1)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
    await expect(page.locator('meta[name="description"]')).toHaveCount(1)
  }
})

test('mobile menu supports keyboard, short viewport scrolling, Escape, and breakpoint focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 360 })
  await page.goto('/')
  const toggle = page.locator('#mobile-menu-toggle')
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const menu = page.locator('#mobile-navigation')
  await expect(menu).toBeVisible()
  expect(await menu.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  await menu.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(menu.getByRole('link', { name: /telegram/i })).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toBeFocused()
  await page.keyboard.press('Enter')
  await page.setViewportSize({ width: 1200, height: 800 })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.site-header .identity')).toBeFocused()
})

test('shared contacts use published phone and Telegram destinations', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.header-action')).toHaveAttribute('href', 'tel:+380779742422')
  await expect(page.locator('.footer-contacts a[href="tel:+380779742422"]')).toBeVisible()
  await expect(page.locator('.footer-contacts a[href="https://t.me/HavenRehub"]')).toBeVisible()
})
