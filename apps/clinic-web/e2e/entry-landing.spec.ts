import { expect, test } from './fixtures'

test('the root landing links to the existing main site', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'HAVENHUB — центр реабілітації у Львівській області',
  )
  await expect(page.locator('.entry-introduction--desktop')).toBeVisible()
  await expect(page.locator('.entry-introduction--desktop')).toHaveText(
    'Підтримка для людей та їхніх близьких. Стаціонарний центр розташований у с. Ременів, амбулаторна допомога доступна у Львові. Зв’яжіться з нами, щоб обговорити наступний крок.',
  )
  await expect(page.locator('.entry-address')).toContainText(
    'Львівська область, с. Ременів, вул. Галицька, 13.',
  )
  await expect(page.locator('.entry-introduction--mobile')).toBeHidden()
  await expect(page.locator('.entry-highlights li')).toHaveCount(3)
  await expect(page.locator('.entry-trust')).toBeVisible()
  await expect(page.locator('.entry-trust li')).toHaveText([
    'Для себе й близьких',
    'Звернення 24/7',
    'Наступний крок — після розмови',
  ])
  await expect(page.locator('.entry-phone-copy a[href^="tel:"]')).toHaveAttribute(
    'href',
    'tel:+380779742422',
  )
  await expect(page.locator('.entry-site-button--contact')).toHaveAttribute('href', '/site/')
  await expect(page.locator('.entry-site-button--mobile')).toBeHidden()
  for (const selector of [
    'a[href^="tel:"]',
    'a[href^="https://t.me/"]',
    'a[href^="https://wa.me/"]',
    'a[href^="mailto:"]',
  ]) {
    await expect(page.locator(`.footer-contacts ${selector} svg`)).toHaveCount(1)
  }

  await page.locator('.entry-site-button--contact').click()
  await expect(page).toHaveURL(/\/site\/$/)
  await expect(page.locator('#audience')).toBeVisible()
})

test('the tablet landing keeps its full content and contact CTA', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')

  await expect(page.locator('.entry-introduction--desktop')).toBeVisible()
  await expect(page.locator('.entry-introduction--mobile')).toBeHidden()
  await expect(page.locator('.entry-values')).toBeVisible()
  await expect(page.locator('.entry-highlights')).toBeVisible()
  await expect(page.locator('.entry-trust')).toBeVisible()
  await expect(page.locator('.footer-contacts')).toBeVisible()
  await expect(page.locator('.entry-site-button--mobile')).toBeHidden()
  const cta = await page.locator('.entry-site-button--contact').boundingBox()
  const contact = await page.locator('.entry-contact').boundingBox()
  expect(cta).not.toBeNull()
  expect(contact).not.toBeNull()
  expect(cta!.x).toBeGreaterThanOrEqual(contact!.x)
  expect(cta!.x + cta!.width).toBeLessThanOrEqual(contact!.x + contact!.width)
  expect(cta!.y).toBeGreaterThanOrEqual(contact!.y)
  expect(cta!.y + cta!.height).toBeLessThanOrEqual(contact!.y + contact!.height)
})

test('the neutral homepage copy keeps the reference desktop composition compact', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 986 })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)

  const hero = await page.locator('.entry-hero').boundingBox()
  expect(hero).not.toBeNull()
  expect(hero!.height).toBeLessThanOrEqual(986)
  await expect(page.locator('.entry-introduction--desktop')).toContainText(
    'Стаціонарний центр розташований у с. Ременів',
  )
  await expect(page.locator('.entry-contact a[href="https://t.me/HavenRehub"]')).toBeVisible()
  await expect(page.locator('.entry-contact a[href^="https://wa.me/"]')).toBeVisible()
  await expect(page.locator('.entry-contact a[href^="mailto:"]')).toBeVisible()
})

test('the compact visiting card keeps its main actions visible on narrow screens', async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')

    const cta = page.getByRole('link', { name: 'Перейти на основний сайт' })
    await expect(cta).toHaveCount(1)
    await expect(cta).toHaveAttribute('href', '/site/')
    await expect(cta).toBeInViewport({ ratio: 1 })
    await expect(page.locator('.entry-site-button--mobile')).toBeVisible()
    await expect(page.locator('.entry-site-button--contact')).toBeHidden()
    await expect(page.locator('.entry-introduction--mobile')).toContainText(
      'Підтримка для людей та їхніх близьких',
    )
    await expect(page.locator('.entry-introduction--mobile')).toContainText(
      'Львівська обл., с. Ременів, вул. Галицька, 13.',
    )
    await expect(page.locator('.entry-introduction--desktop')).toBeHidden()
    await expect(page.locator('.entry-values')).toBeHidden()
    await expect(page.locator('.entry-highlights')).toBeHidden()
    await expect(page.locator('.entry-trust')).toBeHidden()
    const phoneIcon = page.locator('.entry-contact a.entry-phone-icon[href^="tel:"]')
    const phone = page.locator('.entry-phone-copy a[href^="tel:"]')
    const telegram = page.locator('.entry-contact').getByRole('link', { name: 'Telegram HAVENHUB' })
    const footer = await page.locator('.footer').boundingBox()
    expect(footer).not.toBeNull()
    if (viewport.width === 390 && (await page.locator('.footer-navigation').count()) === 0) {
      expect(Math.abs(footer!.y + footer!.height - viewport.height)).toBeLessThanOrEqual(1)
    }
    await expect(phoneIcon).toBeVisible()
    await expect(phoneIcon).toHaveAttribute('href', 'tel:+380779742422')
    await expect(phone).toBeVisible()
    await expect(phone).toHaveCSS('min-height', '44px')
    await expect(telegram).toBeVisible()
    await expect(telegram).toHaveCSS('min-height', '44px')
    await expect(page.locator('.footer-contacts')).toBeHidden()
    await expect(page.locator('.entry-highlights a')).toHaveCount(0)
    await expect(page.getByText('Наші фахівці', { exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
  }
})

test('the landing keeps its split layout on short landscape screens', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/')

  await expect(page.locator('.entry-hero')).toHaveCSS('display', 'grid')
  await expect(page.locator('.entry-contact')).toBeVisible()
  const hero = await page.locator('.entry-hero').boundingBox()
  const visual = await page.locator('.entry-visual').boundingBox()
  const highlights = await page.locator('.entry-highlights').boundingBox()
  const contact = await page.locator('.entry-contact').boundingBox()
  const trust = await page.locator('.entry-trust').boundingBox()
  const footer = await page.locator('.footer').boundingBox()
  expect(hero).not.toBeNull()
  expect(visual).not.toBeNull()
  expect(highlights).not.toBeNull()
  expect(contact).not.toBeNull()
  expect(trust).not.toBeNull()
  expect(footer).not.toBeNull()
  await expect(page.locator('.entry-hero')).toHaveCSS('min-height', '0px')
  expect(visual!.x).toBeCloseTo(hero!.width * 0.53, 0)
  expect(visual!.width).toBeCloseTo(hero!.width * 0.47, 0)
  expect(trust!.x + trust!.width).toBeLessThanOrEqual(hero!.x + hero!.width * 0.53)
  expect(contact!.y).toBeGreaterThanOrEqual(highlights!.y + highlights!.height)
  expect(trust!.y).toBeGreaterThanOrEqual(contact!.y + contact!.height + 16)
  expect(footer!.y - (trust!.y + trust!.height)).toBeGreaterThanOrEqual(24)
})

test('the landing stacks cleanly in a narrow landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 })
  await page.goto('/')

  await expect(page.locator('.entry-hero')).toHaveCSS('display', 'flex')
  await expect(page.locator('.entry-contact')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(960)
})

test('the landing shell scales up and stays centered on wide displays', async ({ page }) => {
  const cases = [
    { width: 960, height: 540, shellWidth: 960 },
    { width: 1920, height: 1080, shellWidth: 1920 },
    { width: 2560, height: 1440, shellWidth: 2176 },
    { width: 3584, height: 2240, shellWidth: 2560 },
  ]

  for (const { width, height, shellWidth } of cases) {
    await page.setViewportSize({ width, height })
    await page.goto('/')

    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(6, 43, 38)')

    const { left, width: actualWidth } = await page.locator('.entry-hero').evaluate((element) => {
      const { left, width } = element.getBoundingClientRect()
      return { left, width }
    })
    const visual = await page.locator('.entry-visual').boundingBox()
    const trust = await page.locator('.entry-trust').boundingBox()
    expect(actualWidth).toBe(shellWidth)
    expect(left).toBe((width - shellWidth) / 2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    if (width > 1080) {
      expect(visual!.x).toBeCloseTo(left + shellWidth * 0.53, 0)
      expect(visual!.width).toBeCloseTo(shellWidth * 0.47, 0)
      expect(trust!.x + trust!.width).toBeLessThanOrEqual(left + shellWidth * 0.53)
      await expect(page.locator('.entry-content')).toHaveCSS('justify-content', 'flex-start')
      expect(
        Number.parseFloat(
          await page
            .locator('.entry-introduction--desktop')
            .evaluate((node) => getComputedStyle(node).fontSize),
        ),
      ).toBeGreaterThanOrEqual(24)
    }
  }
})

test('wide landing keeps a clear gap between guidance and contact actions', async ({ page }) => {
  await page.setViewportSize({ width: 1792, height: 1120 })
  await page.goto('/')

  const highlights = await page.locator('.entry-highlights').boundingBox()
  const contact = await page.locator('.entry-contact').boundingBox()
  const trust = await page.locator('.entry-trust').boundingBox()
  const footer = await page.locator('.footer').boundingBox()
  const hero = await page.locator('.entry-hero').boundingBox()
  expect(highlights).not.toBeNull()
  expect(contact).not.toBeNull()
  expect(trust).not.toBeNull()
  expect(footer).not.toBeNull()
  expect(hero).not.toBeNull()
  expect(contact!.y - (highlights!.y + highlights!.height)).toBeGreaterThanOrEqual(68)
  expect(trust!.y - (contact!.y + contact!.height)).toBeGreaterThanOrEqual(32)
  expect(trust!.x + trust!.width).toBeLessThanOrEqual(hero!.x + hero!.width * 0.53)
  expect(footer!.y - (trust!.y + trust!.height)).toBeGreaterThanOrEqual(24)
  expect(footer!.y - (trust!.y + trust!.height)).toBeLessThanOrEqual(32)
})

test('mid-size tall landing keeps the headline and telephone on clean lines', async ({ page }) => {
  await page.setViewportSize({ width: 1524, height: 1764 })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)

  const heading = page.getByRole('heading', { level: 1 })
  const headingHeight = (await heading.boundingBox())?.height
  const highlights = await page.locator('.entry-highlights').boundingBox()
  const contact = await page.locator('.entry-contact').boundingBox()
  const trust = await page.locator('.entry-trust').boundingBox()
  expect(headingHeight).toBeDefined()
  expect(headingHeight).toBeLessThanOrEqual(140)
  expect(highlights).not.toBeNull()
  expect(contact).not.toBeNull()
  expect(trust).not.toBeNull()
  expect(contact!.y - (highlights!.y + highlights!.height)).toBeGreaterThanOrEqual(48)
  expect(trust!.y - (contact!.y + contact!.height)).toBeGreaterThanOrEqual(24)
  await expect(page.locator('.entry-phone-copy span')).toHaveCSS('white-space', 'nowrap')
  await expect(page.locator('.entry-phone-copy a[href^="tel:"]')).toHaveCSS('white-space', 'nowrap')
})

test('the landing keeps contact actions reachable at 150% and 200% equivalent viewports', async ({
  page,
}) => {
  for (const { width, height } of [
    { width: 853, height: 480 },
    { width: 640, height: 360 },
  ]) {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    await page.keyboard.press('Tab')
    await expect(page.locator('.skip-link')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('.site-header-landing .identity')).toBeFocused()
    const contact = page.locator('.entry-contact')
    const contactMessagingLinks = [
      contact.getByRole('link', { name: 'Telegram HAVENHUB' }),
      contact.getByRole('link', { name: 'Написати в WhatsApp HAVENHUB' }),
      contact.getByRole('link', { name: 'Написати на email HAVENHUB' }),
    ]
    const actionLinks =
      width <= 700
        ? [
            page.locator('.entry-site-button--mobile'),
            page.locator('.entry-contact a.entry-phone-icon[href^="tel:"]'),
            page.locator('.entry-phone-copy a[href^="tel:"]'),
            ...contactMessagingLinks,
          ]
        : [
            page.locator('.entry-contact a.entry-phone-icon[href^="tel:"]'),
            page.locator('.entry-phone-copy a[href^="tel:"]'),
            ...contactMessagingLinks,
            page.locator('.entry-site-button--contact'),
          ]
    for (const link of actionLinks) {
      await page.keyboard.press('Tab')
      await expect(link).toBeFocused()
      let previousScrollY: number | undefined
      let stableVisibleSamples = 0
      await expect
        .poll(async () => {
          const { scrollY, visible } = await page.evaluate(() => {
            const rect = document.activeElement?.getBoundingClientRect()
            return {
              scrollY: window.scrollY,
              visible: Boolean(rect && rect.top >= 0 && rect.bottom <= window.innerHeight),
            }
          })
          stableVisibleSamples =
            visible && scrollY === previousScrollY ? stableVisibleSamples + 1 : 0
          previousScrollY = scrollY
          return stableVisibleSamples
        })
        .toBeGreaterThanOrEqual(2)
      await expect(link).toBeInViewport({ ratio: 0.98 })
    }
  }
})

test('landing links show a visible keyboard focus indicator', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  const link = page.locator('.entry-site-button--contact')

  await link.focus()
  await expect(link).toBeFocused()
  await expect(link).toHaveCSS('outline-style', 'solid')
  await expect(link).toHaveCSS('outline-width', '3px')
  await expect(link).toHaveCSS('outline-color', 'rgb(164, 225, 233)')
  const contrast = await link.evaluate((element) => {
    const luminance = (color: string) => {
      const [red, green, blue] = color
        .match(/\d+/g)!
        .map(Number)
        .map((value) => {
          const channel = value / 255
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        })
      return red * 0.2126 + green * 0.7152 + blue * 0.0722
    }
    const foreground = luminance(getComputedStyle(element).outlineColor)
    const background = luminance(
      getComputedStyle(document.querySelector('.entry-hero')!).backgroundColor,
    )
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
  })
  expect(contrast).toBeGreaterThanOrEqual(3)
})

test('the existing main site remains directly accessible but is not indexable', async ({
  page,
}) => {
  await page.goto('/site/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Допомога людям із залежностями та їхнім близьким',
  )
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
})
