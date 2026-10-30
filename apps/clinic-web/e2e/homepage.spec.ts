import AxeBuilder from '@axe-core/playwright'

import { expect, test } from './fixtures'

const staging = process.env.CLINIC_SITE_MODE === 'staging'
const sectionIds = [
  'hero',
  'audience',
  'dependencies',
  'formats',
  'program',
  'process',
  'family',
  'conditions',
  'contact',
]

test('renders the complete main site in editorial order without old placeholders', async ({
  page,
}) => {
  await page.goto('/site/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Допомога людям із залежностями та їхнім близьким',
  )
  await expect(page.locator('#clinic-lead-form')).toBeVisible()
  await expect(page.locator('#hero a[href="tel:+380779742422"]')).toBeVisible()
  await expect(page.locator('#hero a[href="https://t.me/HavenRehub"]')).toBeVisible()
  expect(
    await page
      .locator('main > section')
      .evaluateAll((sections) => sections.map((section) => section.id)),
  ).toEqual(sectionIds)
  await expect(page.locator('main h2')).toHaveText([
    'Отримайте консультацію',
    'З чого почати',
    'З якими залежностями працюємо',
    'Оберіть зручний формат підтримки',
    'Що входить до програми',
    'Як звернутися',
    'Підтримка для рідних і близьких',
    'Простір і щоденні умови',
    'Поговорімо про наступний крок',
  ])
  await expect(page.locator('#faq, #about, .main-site-unavailable')).toHaveCount(0)
  await expect(
    page.getByText(/Питання 01|після погодження|Форма звернення поки недоступна/),
  ).toHaveCount(0)
})

test('keeps distinct dependency and care-format lists with sourced boundaries', async ({
  page,
}) => {
  await page.goto('/site/')
  await expect(page.locator('#dependencies li')).toHaveCount(3)
  await expect(page.locator('#formats li')).toHaveCount(3)
  await expect(page.locator('#dependencies')).toContainText('Алкогольна залежність')
  await expect(page.locator('#dependencies')).toContainText('Наркотична залежність')
  await expect(page.locator('#dependencies')).toContainText('Ігрова залежність')
  await expect(page.locator('#formats')).toContainText('Стаціонарна програма')
  await expect(page.locator('#formats')).toContainText('Амбулаторна програма')
  await expect(page.locator('#formats')).toContainText(
    'Виїзд додому у Львові та Львівській області',
  )
  await expect(page.locator('main table')).toHaveCount(0)
  await expect(page.locator('#conditions')).toContainText('Центр розташований у Львівській області')
  await expect(page.getByText(/24\/7|безкоштовн/i)).toHaveCount(0)
  await expect(page.locator('#process')).toContainText('Вартість визначають після консультації')
  await expect(page.locator('main')).not.toContainText(
    /300[–-]400|гарантоване одужання|повна анонімність/,
  )
  await expect(page.locator('#formats h3')).toHaveText([
    'Амбулаторна програма',
    'Стаціонарна програма',
    'Допомога вдома',
  ])
  await expect(page.locator('#formats img')).toHaveCount(3)
  for (const image of await page.locator('#formats img').all()) {
    await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
      .toBeGreaterThan(0)
  }
  await expect(page.locator('#formats img').nth(0)).toHaveAttribute(
    'alt',
    'Розмова чоловіка з фахівчинею під час консультації',
  )
  await expect(page.locator('#formats img').nth(1)).toHaveAttribute(
    'alt',
    'Світла кімната центру з ліжком і місцем для відпочинку',
  )
  await expect(page.locator('#formats img').nth(2)).toHaveAttribute(
    'alt',
    'Медичний фахівець із сумкою прямує до автомобіля',
  )
  const formatLinks = page.locator('#formats .format-card-copy a')
  await expect(formatLinks).toHaveText([
    'Про амбулаторну програму',
    'Про стаціонарну програму',
    'Про допомогу вдома',
  ])
  for (const [index, id] of ['outpatient', 'residential', 'home-visit'].entries()) {
    await expect(formatLinks.nth(index)).toHaveAttribute(
      'href',
      staging ? `/napriamy/#care-format-${id}` : '/site/#clinic-lead-form',
    )
  }
  await expect(page.getByRole('link', { name: 'Обговорити формати' })).toHaveAttribute(
    'href',
    '/site/#clinic-lead-form',
  )
})

test('matches the asymmetric format-card grid on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/site/')
  const geometry = await page.locator('#formats .format-cards').evaluate((grid) => {
    const [primary, upper, lower] = Array.from(grid.querySelectorAll('.format-card')).map(
      (card) => {
        const { x, y, width, height } = card.getBoundingClientRect()
        return { x, y, width, height }
      },
    )
    return { primary, upper, lower }
  })
  expect(geometry.primary.x).toBeLessThan(geometry.upper.x)
  expect(geometry.upper.y).toBeLessThan(geometry.lower.y)
  expect(Math.abs(geometry.primary.y - geometry.upper.y)).toBeLessThan(2)
  expect(
    Math.abs(
      geometry.primary.y + geometry.primary.height - (geometry.lower.y + geometry.lower.height),
    ),
  ).toBeLessThan(2)
})

test('format detail links reach their matching sections when routes are published', async ({
  page,
}) => {
  test.skip(!staging, 'supporting routes are published only in staging and production builds')
  await page.goto('/site/')
  for (const id of [
    'care-format-outpatient',
    'care-format-residential',
    'care-format-home-visit',
  ]) {
    await page.goto(`/napriamy/#${id}`)
    await expect(page.locator(`#${id}`)).toBeVisible()
  }
})

test('presents program details as a labelled list of informational cards', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/site/')
  const cards = page.getByRole('list', { name: 'Напрями програми підтримки' })

  await expect(cards.getByRole('listitem')).toHaveCount(3)
  await expect(cards.getByRole('heading', { level: 3 })).toHaveText([
    'Індивідуальна та групова робота',
    'Підтримка близьких',
    'Соціалізація та ресоціалізація',
  ])
  await expect(cards.getByRole('link')).toHaveCount(0)
  expect(
    await cards.evaluate((list) => getComputedStyle(list).gridTemplateColumns.split(' ').length),
  ).toBe(3)
})

test('shows phone and Telegram actions and only links to built detail routes', async ({ page }) => {
  await page.goto('/site/')
  for (const section of ['hero', 'contact']) {
    await expect(page.locator(`#${section} a[href="tel:+380779742422"]`)).toBeVisible()
    await expect(page.locator(`#${section} a[href="https://t.me/HavenRehub"]`)).toBeVisible()
  }
  for (const route of ['/programa/', '/umovy/', '/rodyni/', '/napriamy/']) {
    const links =
      route === '/napriamy/'
        ? page.locator('main a[href^="/napriamy/#"]')
        : page.locator(`main a[href="${route}"]`)
    await expect(links).toHaveCount(
      staging ? (route === '/rodyni/' ? 2 : route === '/napriamy/' ? 3 : 1) : 0,
    )
  }
  await expect(page.locator('#contact')).not.toContainText(/24\/7|безкоштовн/i)
})

test('keeps one landmark, usable links, and no critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/site/')
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.locator('.skip-link')).toHaveAttribute('href', '#content')
  for (const href of await page
    .locator('main a[href^="#"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')!))) {
    expect(await page.locator(href).count()).toBeGreaterThan(0)
  }
  const result = await new AxeBuilder({ page }).analyze()
  expect(result.violations).toEqual([])
})

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  test(`landing fits ${width}px without horizontal scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/site/')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await expect(page.locator('#program')).toBeVisible()
    await expect(page.locator('#contact')).toBeVisible()
  })
}

test('format section fits the equivalent of 200% browser zoom', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 })
  await page.goto('/site/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await expect(page.locator('#formats h2')).toBeVisible()
  await expect(page.locator('#formats .format-card')).toHaveCount(3)
  await expect(page.getByRole('link', { name: 'Обговорити формати' })).toBeVisible()
})

test('skip link transfers keyboard focus into the main content', async ({ page }) => {
  await page.goto('/site/')
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main#content')).toBeFocused()
})

test('normal navigation anchors point to sections that exist', async ({ page }) => {
  test.skip(staging, 'staging has dedicated supporting routes')
  await page.goto('/site/')
  for (const href of await page
    .locator('.desktop-nav a[href^="#"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')!))) {
    await expect(page.locator(href)).toHaveCount(1)
  }
})

test('not-found page provides a branded recovery path', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/404.html')

    await expect(page.getByRole('link', { name: 'HAVENHUB — головна' })).toHaveAttribute(
      'href',
      '/',
    )
    await expect(
      page.getByRole('heading', { level: 1, name: 'Сторінку не знайдено' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'На головну' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('link', { name: 'Перейти на основний сайт' })).toHaveAttribute(
      'href',
      '/site/',
    )
    await expect(page.locator('a[href="tel:+380779742422"]')).toBeVisible()
    await expect(page.locator('a[href="https://t.me/HavenRehub"]')).toBeVisible()
    await expect(page.locator('.not-found-art')).toHaveAttribute('src', '/hero-abstract.png')
    if (viewport.width >= 1280) {
      const title = await page.getByRole('heading', { level: 1 }).boundingBox()
      expect(title?.height).toBeLessThan(60)
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])

  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await page.keyboard.press('Tab')
  const brandLink = page.getByRole('link', { name: 'HAVENHUB — головна' })
  await expect(brandLink).toBeFocused()
  await expect(brandLink).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'На головну' })).toBeFocused()
})
