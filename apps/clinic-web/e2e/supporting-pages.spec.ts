import { expect, test } from './fixtures'

const pages = [
  {
    path: '/programa/',
    h1: 'Зрозумілий шлях до підтримки',
    sections: [
      'Від першого звернення — до наступного кроку',
      'Три теми для розмови про подальший шлях',
    ],
  },
  {
    path: '/umovy/',
    h1: 'Місце, де можна зосередитися на наступному кроці',
    sections: [
      'Починаємо з розмови',
      'Щоденні умови',
      'У Львівській області',
      'Уточніть те, що важливо саме вам',
    ],
  },
  {
    path: '/rodyni/',
    h1: 'Коли хвилюєтеся за близьку людину',
    sections: [
      'Звернення може початися з простої розмови',
      'Два прості кроки',
      'Ви теж можете звернутися по підтримку',
      'Про що можна запитати?',
    ],
  },
  {
    path: '/napriamy/',
    h1: 'Напрями та формати допомоги',
    sections: ['З якими залежностями працюємо', 'Формати допомоги'],
  },
] as const

test('conditions page follows the section design and keeps approved contact links', async ({
  page,
}) => {
  await page.goto('/umovy/')

  await expect(page.locator('.support-page-conditions')).toBeVisible()
  await expect(page.locator('.desktop-nav a[href="/programa/"]')).toBeVisible()
  await expect(page.locator('.conditions-list > li')).toHaveCount(3)
  await expect(page.locator('.support-conditions-number')).toHaveText(['01', '02', '03'])
  await expect(page.locator('.support-conditions-approach .support-items > li')).toHaveCount(2)
  await expect(page.locator('.support-page-conditions section[id]:not(#contact)')).toHaveCount(4)
  await expect(page.locator('.conditions-photo-gallery figure')).toHaveCount(6)
  await expect(page.locator('.conditions-photo-gallery img[alt]:not([alt=""])')).toHaveCount(6)
  await expect(page.locator('.support-page-conditions a[href="#conditions"]')).toBeVisible()
  await expect(page.locator('.support-contact a[href="tel:+380779742422"]')).toBeVisible()
  await expect(page.locator('.support-contact a[href="https://t.me/HavenRehub"]')).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/Наші фахівці|Перша первинна консультація/)
})

test('conditions gallery loads unique photos with responsive layout', async ({ page }) => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/umovy/')
    const gallery = page.locator('.conditions-photo-gallery')
    await expect(gallery.locator('figure')).toHaveCount(6)
    const sources = await gallery
      .locator('img')
      .evaluateAll((images) => images.map((image) => (image as HTMLImageElement).src))
    expect(new Set(sources).size).toBe(6)
    for (const image of await gallery.locator('img').all()) {
      await image.scrollIntoViewIfNeeded()
      await expect
        .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0)
      const box = await image.boundingBox()
      expect(box!.width / box!.height).toBeCloseTo(4 / 3, 1)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false)
  }
})

test('conditions page anchors, menu and layout work at narrow widths', async ({ page }) => {
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/umovy/')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    await page.locator('.support-page-conditions a[href="#conditions"]').click()
    await expect(page).toHaveURL(/#conditions$/)
  }

  await page.locator('#mobile-menu-toggle').click()
  await expect(page.locator('#mobile-menu-toggle')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#mobile-navigation')).toBeVisible()
})

test('conditions contact actions remain reachable at 200% text size', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 450 })
  await page.goto('/umovy/')
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await expect(page.locator('#contact a[href="tel:+380779742422"]')).toBeVisible()
  await expect(page.locator('#contact a[href="https://t.me/HavenRehub"]')).toBeVisible()
})

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

test('program page follows the design sections and keeps the contact actions', async ({ page }) => {
  await page.goto('/programa/')

  await expect(page.locator('.support-program-cards > .support-program-card')).toHaveCount(4)
  await expect(page.locator('.support-program-card h3')).toHaveText([
    'Перший контакт',
    'Індивідуальна та групова робота',
    'Підтримка близьких',
    'Підходи в роботі',
  ])
  await expect(page.locator('.support-program-stages li')).toHaveCount(3)
  await expect(page.locator('.support-program-stages li p')).toHaveText([
    'Запитайте, які цілі має цей етап і що входить до щоденної програми підтримки.',
    'Уточніть, як програма допомагає готуватися до повернення у звичне середовище.',
    'Обговоріть, яку підтримку передбачено для подальшого життя та спілкування.',
  ])
  await expect(page.locator('.support-contact-actions a[href^="tel:"]')).toBeVisible()
  await expect(page.locator('.support-contact-actions a[href*="t.me/"]')).toBeVisible()
})

test('program page has no horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/programa/')

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)

  const stages = page.locator('.support-program-stages .support-items')
  const lastStage = stages.locator('li').last()
  const gridWidth = await stages.evaluate((element) => element.getBoundingClientRect().width)
  const cardWidth = await lastStage.evaluate((element) => element.getBoundingClientRect().width)

  expect(cardWidth).toBeGreaterThan(gridWidth * 0.9)
})

test('program intro art stays clear of the text on tablet', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/programa/')

  const textClearsArt = await page.evaluate(() => {
    const intro = document.querySelector('.support-intro')!
    const description = intro.querySelector('.support-description')!.getBoundingClientRect()
    const artStyle = getComputedStyle(intro, '::after')
    const introBox = intro.getBoundingClientRect()
    const artLeft =
      introBox.right - Number.parseFloat(artStyle.right) - Number.parseFloat(artStyle.width)

    return description.right <= artLeft
  })

  expect(textClearsArt).toBe(true)
})

test('family page avoids absolute confidentiality promises', async ({ page }) => {
  await page.goto('/rodyni/')

  await expect(page.locator('body')).not.toContainText(
    /гарантуємо повну анонімність|абсолютн\w* конфіденційн\w*|100\s*%/,
  )
})

test('family page follows the design sections and keeps contact paths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/rodyni/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Коли хвилюєтеся за близьку людину',
  )
  await expect(page.locator('main h2')).toHaveText([
    'Звернення може початися з простої розмови',
    'Два прості кроки',
    'Ви теж можете звернутися по підтримку',
    'Про що можна запитати?',
    'Обговорімо наступний крок',
  ])
  await expect(
    page.getByText('Ваше звернення по інформацію не означає', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('.support-family-steps li')).toHaveCount(2)
  await expect(page.locator('.support-family-questions li')).toHaveCount(4)
  await expect(page.locator('img[src="/havenhub-rodyni-family-branches.svg"]')).toBeVisible()
  await expect(page.locator('.support-contact a[href^="tel:"]')).toBeVisible()
  await expect(page.locator('.support-contact a[href*="t.me/"]')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await expect(page.locator('.support-family-steps li')).toHaveCount(2)
})

test('directions page keeps dependency types and care formats separate', async ({ page }) => {
  await page.goto('/napriamy/')

  await expect(page.getByRole('heading', { name: 'З якими залежностями працюємо' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Формати допомоги', exact: true })).toBeVisible()
  await expect(page.locator('table')).toHaveCount(0)
  await expect(page.locator('[data-service-matrix]')).toHaveCount(0)
})

test('program page renders PDF sections and keeps the home visit distinct', async ({ page }) => {
  await page.goto('/programa/')

  for (const heading of [
    'Стаціонарна програма реабілітації',
    'Амбулаторна програма відновлення',
    'Виїзд нарколога',
  ]) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  await expect(page.locator('.support-program-customer-copy .support-items > li > ul')).toHaveCount(
    3,
  )
  await expect(page.locator('.support-program-customer-copy')).toContainText(
    'якщо така послуга доступна у вашому регіоні',
  )
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  }
  await page.setViewportSize({ width: 640, height: 450 })
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await expect(page.locator('.support-contact a[href^="tel:"]')).toBeVisible()
  await expect(page.locator('.support-contact a[href*="t.me/"]')).toBeVisible()

  await page.goto('/napriamy/')
  await expect(page.locator('.support-section-care-formats')).toContainText(
    'Виїзд додому доступний у Львові та Львівській області.',
  )
})

test('directions page renders PDF dependency details and retains its format section', async ({
  page,
}) => {
  await page.goto('/napriamy/')

  await expect(page.locator('.support-page-directions')).toContainText(
    'У HAVENHUB ми поєднуємо медичний супровід, психотерапію та реабілітаційну підтримку',
  )
  await expect(page.locator('.support-items-dependency-types h3')).toHaveText([
    'Допомога при алкогольній залежності',
    'Допомога при наркотичній залежності',
    'Допомога при ігровій залежності',
  ])
  await expect(
    page.locator('.support-items-dependency-types > li > .support-item-details'),
  ).toHaveCount(3)
  await expect(page.locator('.support-items-dependency-types')).toContainText(
    'при тривалому або інтенсивному вживанні алкоголю різке припинення може спричинити небезпечний синдром відміни',
  )
  await expect(page.getByRole('heading', { name: 'Формати допомоги', exact: true })).toBeVisible()
  await expect(page.locator('.support-items-care-formats')).toContainText(
    'Виїзд додому доступний у Львові та Львівській області.',
  )

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  }
  await page.setViewportSize({ width: 640, height: 450 })
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await expect(page.locator('.support-contact a[href^="tel:"]')).toBeVisible()
  await expect(page.locator('.support-contact a[href*="t.me/"]')).toBeVisible()
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

  await page.goto('/site/')
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

  const homeResponse = await page.goto('/site/')
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

  await page.goto('/site/')
  const illustration = page.locator('#conditions [data-staging-illustration="IMG_0905"]')
  await illustration.locator('img').scrollIntoViewIfNeeded()
  await expect(illustration).toHaveCount(0)
  await expect(page.locator('#conditions')).toContainText('Центр розташований у Львівській області')
})
