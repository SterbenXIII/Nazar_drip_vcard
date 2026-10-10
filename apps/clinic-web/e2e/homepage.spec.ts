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

test('renders the complete landing in editorial order without old placeholders', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Допомога людям із залежностями та їхнім близьким',
  )
  expect(
    await page
      .locator('main > section')
      .evaluateAll((sections) => sections.map((section) => section.id)),
  ).toEqual(sectionIds)
  await expect(page.locator('main h2')).toHaveText([
    'З чого почати',
    'З якими залежностями працюємо',
    'Формати допомоги',
    'Що входить до програми',
    'Як звернутися',
    'Підтримка для рідних і близьких',
    'Простір і щоденні умови',
    'Поговорімо про наступний крок',
  ])
  await expect(page.locator('#faq, #about, .main-site-unavailable, form')).toHaveCount(0)
  await expect(
    page.getByText(/Питання 01|після погодження|Форма звернення поки недоступна/),
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Надіслати звернення/ })).toHaveCount(0)
})

test('keeps distinct dependency and care-format lists with sourced boundaries', async ({
  page,
}) => {
  await page.goto('/')
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
  await expect(page.getByText('Гаряча лінія 24/7')).toBeVisible()
  await expect(page.getByText('Перша первинна консультація безкоштовна.').first()).toBeVisible()
  await expect(page.locator('#process')).toContainText('Вартість визначають після консультації')
  await expect(page.locator('main')).not.toContainText(
    /300[–-]400|гарантоване одужання|повна анонімність/,
  )
})

test('shows phone and Telegram actions and only links to built detail routes', async ({ page }) => {
  await page.goto('/')
  for (const section of ['hero', 'contact']) {
    await expect(page.locator(`#${section} a[href="tel:+380779742422"]`)).toBeVisible()
    await expect(page.locator(`#${section} a[href="https://t.me/HavenRehub"]`)).toBeVisible()
  }
  for (const route of ['/programa/', '/umovy/', '/rodyni/', '/napriamy/']) {
    await expect(page.locator(`main a[href="${route}"]`)).toHaveCount(
      staging ? (route === '/rodyni/' ? 2 : 1) : 0,
    )
  }
  await expect(page.locator('#contact')).toContainText('Перша первинна консультація безкоштовна')
})

test('keeps one landmark, usable links, and no critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/')
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

for (const width of [320, 390, 768, 1440]) {
  test(`landing fits ${width}px without horizontal scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await expect(page.locator('#program')).toBeVisible()
    await expect(page.locator('#contact')).toBeVisible()
  })
}
