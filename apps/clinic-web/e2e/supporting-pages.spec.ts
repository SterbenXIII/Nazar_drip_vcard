import { expect, test } from './fixtures'

const pages = [
  {
    path: '/programa/',
    h1: 'Як побудована програма підтримки',
    sections: [
      'Перший контакт',
      'Індивідуальна та групова робота',
      'Підтримка близьких',
      'Підходи в роботі',
      'Соціалізація та ресоціалізація',
    ],
  },
  {
    path: '/umovy/',
    h1: 'Про центр та умови перебування',
    sections: [
      'Наш підхід',
      'Щоденні умови',
      'Команда',
      'Розташування',
      'Що уточнити перед початком',
    ],
  },
  {
    path: '/rodyni/',
    h1: 'Підтримка для рідних і близьких',
    sections: [
      'Коли ви хвилюєтеся за близьку людину',
      'Як почати розмову з центром',
      'Підтримка родини',
      'Що можна обговорити',
    ],
  },
  {
    path: '/napriamy/',
    h1: 'Напрями та формати допомоги',
    sections: ['З якими залежностями працюємо', 'Формати допомоги'],
  },
] as const

for (const route of pages) {
  test(`${route.path} renders its approved content and shared contact paths`, async ({ page }) => {
    await page.goto(route.path)

    await expect(page).toHaveTitle(/.+/)
    await expect(page.locator('h1')).toHaveText(route.h1)
    await expect(page.locator('.site-header .identity')).toHaveAttribute('href', '/')
    await expect(page.locator('a[href^="tel:"]').first()).toBeVisible()
    await expect(page.locator('.footer-contacts a[href*="t.me/"]')).toBeVisible()

    const headings = await page.locator('main h2').allTextContents()
    expect(headings).toEqual(expect.arrayContaining([...route.sections]))
    for (let index = 1; index < route.sections.length; index += 1) {
      expect(headings.indexOf(route.sections[index])).toBeGreaterThan(
        headings.indexOf(route.sections[index - 1]),
      )
    }
  })
}

test('family page avoids absolute confidentiality promises', async ({ page }) => {
  await page.goto('/rodyni/')

  await expect(page.locator('body')).not.toContainText(
    /гарантуємо повну анонімність|абсолютн\w* конфіденційн\w*|100\s*%/,
  )
})

test('directions page keeps dependency types and care formats separate', async ({ page }) => {
  await page.goto('/napriamy/')

  await expect(page.getByRole('heading', { name: 'З якими залежностями працюємо' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Формати допомоги', exact: true })).toBeVisible()
  await expect(page.locator('table')).toHaveCount(0)
  await expect(page.locator('[data-service-matrix]')).toHaveCount(0)
})

const mediaPaths = {
  IMG_0905: '/__havenhub_staging_media__/img-0905.webp',
  IMG_0907: '/__havenhub_staging_media__/img-0907.webp',
} as const

const stageWithMedia =
  process.env.CLINIC_SITE_MODE === 'staging' &&
  process.env.HAVENHUB_STAGING_IMG_0905_URL === mediaPaths.IMG_0905 &&
  process.env.HAVENHUB_STAGING_IMG_0907_URL === mediaPaths.IMG_0907

test('staging images occupy only their intended sections with clear illustrative captions', async ({
  page,
}) => {
  test.skip(!stageWithMedia, 'requires staging with both synthetic private media fixture paths')

  await page.route('**/__havenhub_staging_media__/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#cccccc"/></svg>',
    })
  })

  await page.goto('/')
  const conditions = page.locator('#conditions [data-staging-illustration="IMG_0905"]')
  await expect(conditions).toHaveCount(1)
  await expect(conditions.locator('img')).toHaveAttribute('src', mediaPaths.IMG_0905)
  await expect(conditions.locator('img')).toHaveAttribute('alt', /візуалізація|ілюстративн/i)
  await expect(conditions.locator('figcaption')).toContainText(
    'Візуалізація, не фото приміщення центру',
  )
  await conditions.locator('img').scrollIntoViewIfNeeded()
  await expect
    .poll(() => conditions.locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
  await expect(page.locator('[data-staging-illustration="IMG_0907"]')).toHaveCount(0)

  await page.goto('/programa/')
  const conversation = page
    .locator('.support-section')
    .filter({ has: page.getByRole('heading', { name: 'Індивідуальна та групова робота' }) })
    .locator('[data-staging-illustration="IMG_0907"]')
  await expect(conversation).toHaveCount(1)
  await expect(conversation.locator('img')).toHaveAttribute('src', mediaPaths.IMG_0907)
  await expect(conversation.locator('img')).toHaveAttribute('alt', /візуалізація|ілюстративн/i)
  await expect(conversation.locator('figcaption')).toContainText(
    'Візуалізація, не фото приміщення центру',
  )
  await expect(page.locator('[data-staging-illustration="IMG_0905"]')).toHaveCount(0)

  await page.goto('/umovy/')
  await expect(page.locator('[data-staging-illustration]')).toHaveCount(0)
})

test('no images or private media references appear without staging media authorization', async ({
  page,
}) => {
  const stage = process.env.CLINIC_SITE_MODE === 'staging'
  const hasHomeMedia = stage && Boolean(process.env.HAVENHUB_STAGING_IMG_0905_URL)
  const hasProgramMedia = stage && Boolean(process.env.HAVENHUB_STAGING_IMG_0907_URL)

  const homeResponse = await page.goto('/')
  const homeHtml = await homeResponse!.text()
  expect(homeHtml.includes('data-staging-illustration="IMG_0905"')).toBe(hasHomeMedia)
  expect(homeHtml).not.toContain('data-staging-illustration="IMG_0907"')
  if (!hasHomeMedia) expect(homeHtml).not.toContain('__havenhub_staging_media__')

  if (stage) {
    const programResponse = await page.goto('/programa/')
    const programHtml = await programResponse!.text()
    expect(programHtml.includes('data-staging-illustration="IMG_0907"')).toBe(hasProgramMedia)
    expect(programHtml).not.toContain('data-staging-illustration="IMG_0905"')
    if (!hasProgramMedia) expect(programHtml).not.toContain('__havenhub_staging_media__')
  }
})

test('a missing protected asset is hidden while the surrounding explanatory text remains', async ({
  page,
}) => {
  test.skip(!stageWithMedia, 'requires an intentionally unavailable private media fixture')
  await page.route('**/__havenhub_staging_media__/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/webp', body: 'invalid-image-bytes' })
  })

  await page.goto('/')
  const illustration = page.locator('#conditions [data-staging-illustration="IMG_0905"]')
  await illustration.locator('img').scrollIntoViewIfNeeded()
  await expect(illustration).toHaveCount(0)
  await expect(page.locator('#conditions')).toContainText('Центр розташований у Львівській області')
})
