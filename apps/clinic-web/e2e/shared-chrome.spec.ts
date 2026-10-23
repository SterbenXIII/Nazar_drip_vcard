import { expect, test } from './fixtures'

const supportingRoutes = ['/programa/', '/umovy/', '/rodyni/', '/napriamy/']
const staging = process.env.CLINIC_SITE_MODE === 'staging'

test('shared navigation only links to routes present in this build', async ({ page }) => {
  await page.goto('/site/')
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
      await page.goto('/site/')
    }
  }
})

test('same-origin page changes use native transitions and retain document navigation', async ({
  page,
}) => {
  test.skip(!staging, 'supporting routes are absent in normal')
  await page.goto('/site/')

  const transitionRules = await page.evaluate(() => {
    const result: string[] = []
    const visit = (rules: CSSRuleList) => {
      for (const rule of rules) {
        result.push(rule.cssText)
        if (rule instanceof CSSGroupingRule) visit(rule.cssRules)
      }
    }
    for (const sheet of document.styleSheets) {
      try {
        visit(sheet.cssRules)
      } catch {
        // Ignore stylesheets that the browser does not expose to the page.
      }
    }
    return result
  })
  expect(transitionRules.some((rule) => rule.includes('navigation: auto'))).toBe(true)
  expect(
    transitionRules.some(
      (rule) => rule.includes('prefers-reduced-motion') && rule.includes('navigation: none'),
    ),
  ).toBe(true)

  const navigation = page.waitForNavigation()
  await page.locator('.desktop-nav a[href="/umovy/"]').click()
  await navigation
  await expect(page).toHaveURL(/\/umovy\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.type)).toBe(
    'navigate',
  )
})

test('every built page has one main landmark and a working skip link', async ({ page }) => {
  const routes = staging
    ? ['/', '/site/', '/404.html', ...supportingRoutes]
    : ['/', '/site/', '/404.html']
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
  await page.goto('/site/')
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
  await page.goto('/site/')
  await expect(page.locator('.header-action')).toHaveAttribute('href', 'tel:+380779742422')
  await expect(page.locator('.footer-contacts a[href="tel:+380779742422"]')).toBeVisible()
  await expect(page.locator('.footer-contacts a[href="https://t.me/HavenRehub"]')).toBeVisible()
})

test('all HAVENHUB pages use the same logo mark and wordmark', async ({ page }) => {
  const routes = staging
    ? ['/', '/site/', '/404.html', ...supportingRoutes]
    : ['/', '/site/', '/404.html']
  for (const route of routes) {
    await page.goto(route)
    const logos = page.locator('.brand-logo')
    await expect(logos).toHaveCount(route === '/404.html' ? 1 : 2)
    for (const logo of await logos.all()) {
      await expect(logo.locator('.brand-logo-mark')).toBeVisible()
      await expect(logo.locator('.brand-logo-name')).toHaveText('HAVENHUB')
    }
  }
})
