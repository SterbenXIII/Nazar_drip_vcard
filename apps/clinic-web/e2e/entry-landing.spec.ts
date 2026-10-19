import { expect, test } from './fixtures'

test('the root landing links to the existing main site', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Підтримка на шляху до нового життя',
  )
  await expect(page.locator('.entry-highlights li')).toHaveCount(3)
  await expect(page.locator('.entry-phone-copy a[href^="tel:"]')).toHaveAttribute(
    'href',
    'tel:+380779742422',
  )
  await expect(page.locator('.entry-site-button')).toHaveAttribute('href', '/site/')

  await page.locator('.entry-site-button').click()
  await expect(page).toHaveURL(/\/site\/$/)
  await expect(page.locator('#audience')).toBeVisible()
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
  expect(hero).not.toBeNull()
  expect(visual).not.toBeNull()
  expect(highlights).not.toBeNull()
  expect(contact).not.toBeNull()
  expect(trust).not.toBeNull()
  expect(visual!.x).toBeCloseTo(hero!.width * 0.53, 0)
  expect(visual!.width).toBeCloseTo(hero!.width * 0.47, 0)
  expect(contact!.y).toBeGreaterThanOrEqual(highlights!.y + highlights!.height)
  expect(trust!.y).toBeGreaterThanOrEqual(contact!.y + contact!.height + 16)
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
    expect(actualWidth).toBe(shellWidth)
    expect(left).toBe((width - shellWidth) / 2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    if (width > 1080) {
      expect(visual!.x).toBeCloseTo(left + shellWidth * 0.53, 0)
      expect(visual!.width).toBeCloseTo(shellWidth * 0.47, 0)
      await expect(page.locator('.entry-content')).toHaveCSS('justify-content', 'flex-start')
      expect(
        Number.parseFloat(
          await page
            .locator('.entry-introduction')
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
  expect(highlights).not.toBeNull()
  expect(contact).not.toBeNull()
  expect(trust).not.toBeNull()
  expect(footer).not.toBeNull()
  expect(contact!.y - (highlights!.y + highlights!.height)).toBeGreaterThanOrEqual(52)
  expect(trust!.y - (contact!.y + contact!.height)).toBeGreaterThanOrEqual(32)
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
  expect(contact!.y - (highlights!.y + highlights!.height)).toBeGreaterThanOrEqual(24)
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

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    await page.keyboard.press('Tab')
    await expect(page.locator('.skip-link')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('.site-header-landing .identity')).toBeFocused()
    for (const selector of [
      '.entry-phone-copy a[href^="tel:"]',
      '.entry-telegram',
      '.entry-site-button',
    ]) {
      const link = page.locator(selector)
      await page.keyboard.press('Tab')
      await expect(link).toBeFocused()
      await expect(link).toBeInViewport({ ratio: 0.98 })
    }
  }
})

test('landing links show a visible keyboard focus indicator', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  const link = page.locator('.entry-site-button')

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
