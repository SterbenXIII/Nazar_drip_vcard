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
    } else if (href.startsWith('tel:')) {
      expect(href).toBe('tel:+380779742422')
    } else {
      const target = new URL(href, page.url())
      if (target.origin !== new URL(page.url()).origin) {
        expect(href).toBe('https://t.me/HavenRehub')
        continue
      }
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

test('shows proposed service names and contact routes without fake site links', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.locator('.dependency-types')).toBeVisible()
  await expect(page.locator('.care-formats')).toBeVisible()

  const heroActions = page.locator('.hero-actions')
  const consultation = heroActions.getByRole('link', {
    name: 'Зателефонувати на гарячу лінію',
  })
  await expect(consultation).toHaveText('Зателефонувати')
  await expect(consultation).toHaveAttribute('href', 'tel:+380779742422')
  await expect(heroActions).not.toContainText('Безкоштовна консультація')
  await expect(heroActions).not.toContainText('Підтвердіть безкоштовність')

  const headerAction = page.locator('.site-header .header-action')
  await expect(headerAction).toHaveText('Зателефонувати')
  await expect(headerAction).toHaveAttribute('aria-label', 'Зателефонувати на гарячу лінію')
  await expect(headerAction).toHaveAttribute('href', 'tel:+380779742422')
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(headerAction).toBeVisible()
  await expect(headerAction).toHaveText('Зателефонувати')

  const mainSite = heroActions.locator('.main-site-unavailable')
  await expect(mainSite).toHaveText('Перейти на основний сайт')
  await expect(mainSite).not.toHaveAttribute('href', /./)
  expect(await mainSite.evaluate((element) => (element as HTMLElement).tabIndex)).toBe(-1)
  await expect(heroActions.getByText('Адреса основного сайту очікує підтвердження.')).toBeVisible()

  const contact = page.locator('#contact')
  await expect(contact.getByText('+380 77 974 24 22')).toBeVisible()
  await expect(
    contact.getByRole('link', { name: 'Зателефонувати на гарячу лінію: +380 77 974 24 22' }),
  ).toHaveAttribute('href', 'tel:+380779742422')
  await expect(contact.getByRole('link', { name: 'Telegram HAVENHUB' })).toHaveAttribute(
    'href',
    'https://t.me/HavenRehub',
  )

  await expect(page.getByRole('button', { name: 'Надіслати звернення' })).toBeDisabled()
  await expect(page.locator('#clinic-lead-form')).toHaveAttribute('data-clinic-ready', 'false')
})

test('keeps dependency types separate from care formats', async ({ page }) => {
  await page.goto('/')

  const dependencyTypes = page.locator('.dependency-types')
  await expect(dependencyTypes).toContainText('Напрями залежності')
  await expect(dependencyTypes).toContainText('Алкогольна залежність')
  await expect(dependencyTypes).toContainText('Ігрова залежність')
  await expect(dependencyTypes).toContainText('Наркотична залежність')
  await expect(dependencyTypes.locator('a')).toHaveCount(0)

  const careFormats = page.locator('.care-formats')
  await expect(careFormats).toContainText('Формати допомоги')
  await expect(careFormats).toContainText('Стаціонарна програма')
  await expect(careFormats).toContainText('Амбулаторна програма')
  await expect(careFormats).toContainText('Виїзд додому')
  await expect(careFormats.locator('a')).toHaveCount(0)

  await expect(page.locator('.main-site-unavailable')).not.toHaveAttribute('href', /./)
  await expect(page.locator('a[href^="/services/"], a[href*="/city/"]')).toHaveCount(0)
  await expect(page.locator('.services')).not.toContainText('Адреса')
})

test('limits hotline hours and free consultation', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Гаряча лінія 24/7')).toBeVisible()
  await expect(page.getByText('Перша первинна консультація безкоштовна').first()).toBeVisible()
  await expect(page.getByText('Безкоштовне лікування')).toHaveCount(0)

  await expect(page.locator('.site-header .header-action')).toHaveAttribute(
    'href',
    'tel:+380779742422',
  )
  await expect(
    page.locator('.hero-actions').getByRole('link', { name: 'Зателефонувати на гарячу лінію' }),
  ).toHaveAttribute('href', 'tel:+380779742422')

  const process = page.locator('#process')
  await expect(process).toContainText('гарячу лінію')
  await expect(process).toContainText('Telegram')
  await expect(process).toContainText('Форма звернення поки недоступна')
  await expect(process.locator('a[href="#clinic-lead-form"]')).toHaveCount(0)

  const contact = page.locator('#contact')
  await expect(contact.getByRole('link', { name: 'Telegram HAVENHUB' })).toHaveAttribute(
    'href',
    'https://t.me/HavenRehub',
  )
  await expect(contact).toContainText('Форма звернення поки недоступна')
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

test('keeps the layout inside a narrow zoomed viewport', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 422 })
  await page.goto('/')

  const width = await page.evaluate(() => window.innerWidth)
  const documentWidth = await page.locator('html').evaluate((element) => element.scrollWidth)
  expect(documentWidth).toBeLessThanOrEqual(width)
  const menu = await page.locator('#mobile-menu-toggle').boundingBox()
  expect(menu).not.toBeNull()
  expect(menu!.x + menu!.width).toBeLessThanOrEqual(width)
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

  await expect(page.locator('.dependency-types a, .care-formats a')).toHaveCount(0)
  await expect(page.locator('.dependency-types button, .care-formats button')).toHaveCount(0)
  await expect(page.locator('.dependency-types, .care-formats')).toHaveCount(2)
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
      headingMarginBottom: getComputedStyle(element.querySelector('h4')!).marginBottom,
    }
  })

  expect(metrics.minHeight).toBe('0px')
  expect(metrics.padding).not.toBe('0px')
  expect(Number.parseFloat(metrics.headingMarginBottom)).toBeGreaterThan(0)
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
