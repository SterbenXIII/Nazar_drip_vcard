import AxeBuilder from '@axe-core/playwright'

import { expect, test } from './fixtures'

test('renders the approved prototype landmarks and navigation', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('HAVENHUB — інформація про заклад')
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  await expect(page.locator('meta[name="description"]')).toHaveCount(0)
  await expect(page.locator('meta[property^="og:"]')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Основна навігація' })).toBeVisible()
  expect(
    await page
      .locator('main > section')
      .evaluateAll((sections) => sections.map((item) => item.className)),
  ).toEqual(['hero', 'services', 'about', 'process', 'faq', 'contact'])
  await expect(page.getByText('Візуальний матеріал після погодження')).toHaveCount(0)
  await expect(page.getByText('Статичний макет чинного набору полів без надсилання')).toHaveCount(0)
  for (const href of await page
    .locator('a[href]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')!))) {
    if (href.startsWith('#')) {
      expect(await page.locator(href).count()).toBeGreaterThan(0)
    } else {
      const target = new URL(href, page.url())
      expect(target.origin).toBe(new URL(page.url()).origin)
      const response = await page.request.get(target.href)
      expect(response.ok()).toBe(true)
    }
  }
  const favicon = await page.locator('link[rel="icon"]').getAttribute('href')
  expect(favicon).toBe('/favicon.svg')
  expect((await page.request.get(favicon!)).ok()).toBe(true)
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')
})

test('opens the keyboard-operable mobile menu', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  const toggle = page.getByRole('button', { name: 'Меню навігації' })
  const navigation = page.getByRole('navigation', { name: 'Мобільна навігація' })
  const navigationById = page.locator('#mobile-navigation')
  await expect(toggle).toHaveAttribute('aria-controls', 'mobile-navigation')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toHaveCSS('width', '44px')
  await expect(toggle).toHaveCSS('height', '44px')
  await toggle.focus()
  await expect(toggle).toBeFocused()
  await expect(toggle).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'Запитання' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('homepage-mobile-menu.png') })
  await page.keyboard.press('Escape')
  await expect(navigationById).toBeHidden()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toBeFocused()
  const focusRemainsInHiddenNavigation = await navigationById.evaluate((element) =>
    element.contains(document.activeElement),
  )
  expect(focusRemainsInHiddenNavigation).toBe(false)
})

test('keeps every mobile menu item reachable in a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 360 })
  await page.goto('/')

  await page.getByRole('button', { name: 'Меню навігації' }).click()
  const navigation = page.getByRole('navigation', { name: 'Мобільна навігація' })
  const scrolls = await navigation.evaluate(
    (element) => element.scrollHeight > element.clientHeight,
  )
  expect(scrolls).toBe(true)
  await navigation.evaluate((element) => (element.scrollTop = element.scrollHeight))
  await expect(navigation.getByRole('link', { name: 'Звернення' })).toBeInViewport()
})

test('resets mobile navigation and focus across the desktop breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 })
  await page.goto('/')
  const toggle = page.locator('#mobile-menu-toggle')
  const navigation = page.locator('#mobile-navigation')
  const identity = page.getByRole('link', { name: 'HAVENHUB — головна' }).first()

  await toggle.click()
  await expect(navigation).toBeVisible()
  await page.setViewportSize({ width: 1024, height: 900 })
  await expect(toggle).toBeVisible()
  await expect(navigation).toBeVisible()
  await page.setViewportSize({ width: 1120, height: 900 })
  await expect(navigation).toBeHidden()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle).toBeHidden()
  await expect(identity).toBeFocused()

  await page
    .getByRole('navigation', { name: 'Основна навігація' })
    .getByRole('link', {
      name: 'Про заклад',
    })
    .focus()
  await page.setViewportSize({ width: 820, height: 900 })
  await expect(identity).toBeFocused()
  await expect(toggle).toBeVisible()
  await expect(navigation).toBeHidden()
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
})

test('shows unavailable service actions as noninteractive statuses', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('.cards a')).toHaveCount(0)
  await expect(page.locator('.service-status')).toHaveCount(3)
  await expect(page.locator('.service-status').first()).toContainText('погодження')
})

test('sizes mobile service cards to their content', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const card = page.locator('.cards article').first()
  const metrics = await card.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      minHeight: style.minHeight,
      padding: style.padding,
      statusMarginTop: getComputedStyle(element.querySelector('.service-status')!).marginTop,
    }
  })

  expect(metrics.minHeight).toBe('0px')
  expect(metrics.padding).not.toBe('0px')
  expect(Number.parseFloat(metrics.statusMarginTop)).toBeGreaterThan(0)
})

test('keeps FAQ disclosures native and gives each summary a clear hit area', async ({ page }) => {
  await page.goto('/')
  const details = page.locator('.faq-list details').first()
  const summary = details.locator('summary')

  const height = (await summary.boundingBox())?.height ?? 0
  expect(height).toBeGreaterThanOrEqual(44)
  await expect(summary).toHaveCSS('cursor', 'pointer')
  await summary.click()
  await expect(details).toHaveAttribute('open', '')
  const indicator = await summary.evaluate(
    (element) => getComputedStyle(element, '::after').content,
  )
  expect(indicator).toBe('""')
})

test('wraps long synthetic hero titles without clipping or forced breaks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const title = page.getByRole('heading', { level: 1 })
  await title.evaluate((element) => {
    element.textContent =
      'Синтетичний довгий заголовок для перевірки адаптивної композиції клінічної сторінки'
  })
  const dimensions = await title.evaluate((element) => ({
    hasForcedBreak: Boolean(element.querySelector('br')),
    right: element.getBoundingClientRect().right,
    viewportWidth: document.documentElement.clientWidth,
  }))

  expect(dimensions.hasForcedBreak).toBe(false)
  expect(dimensions.right).toBeLessThanOrEqual(dimensions.viewportWidth)
})

for (const width of [375, 390, 768, 820, 1024, 1440]) {
  test(`has no horizontal overflow at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    expect(
      await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')
    await page.screenshot({ path: testInfo.outputPath(`homepage-${width}.png`), fullPage: true })
  })
}
