import { expect, type Page, type Request, test } from '@playwright/test'

const waitForAstroPageLoad = (page: Page) =>
  page.waitForFunction(() => (window as Window & { __vcardPageLoaded?: boolean }).__vcardPageLoaded)

const preparePageLoad = async (page: Page, welcomeDismissed = false) => {
  await page.addInitScript((dismissed) => {
    if (dismissed) localStorage.setItem('vcard:welcome-dismissed', '1')
    else localStorage.removeItem('vcard:welcome-dismissed')
    document.addEventListener(
      'astro:page-load',
      () => {
        ;(window as Window & { __vcardPageLoaded?: boolean }).__vcardPageLoaded = true
      },
      { once: true },
    )
  }, welcomeDismissed)
}

const contrastRatio = (foreground: string, background: string) => {
  const luminance = (color: string) => {
    const channels = color
      .match(/\d+(?:\.\d+)?/g)
      ?.slice(0, 3)
      .map(Number)
    if (!channels) throw new Error(`Unsupported color: ${color}`)

    const [red, green, blue] = channels.map((channel) => {
      const value = channel / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }

  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

test('welcome dialog moves focus to its close control and closes with Escape', async ({ page }) => {
  await preparePageLoad(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await waitForAstroPageLoad(page)

  const welcomeModal = page.getByRole('dialog', { name: 'Вітаємо у Krapelnytsia!' })
  const closeButton = welcomeModal.getByRole('button', { name: 'Продовжити перегляд' })

  await expect(welcomeModal).toBeVisible({ timeout: 3_000 })
  await expect(closeButton).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(welcomeModal).toBeHidden()
})

test('welcome dialog traps Tab in both directions and restores focus after backdrop close', async ({
  page,
}) => {
  await preparePageLoad(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await waitForAstroPageLoad(page)

  const skipLink = page.locator('.skip-link')
  const welcomeModal = page.getByRole('dialog', { name: 'Вітаємо у Krapelnytsia!' })
  const callLink = welcomeModal.getByRole('link', { name: /Зателефонувати/ })
  const closeButton = welcomeModal.getByRole('button', { name: 'Продовжити перегляд' })

  await skipLink.focus()
  await expect(welcomeModal).toBeVisible({ timeout: 3_000 })
  await expect(closeButton).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(callLink).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(closeButton).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(callLink).toBeFocused()

  await welcomeModal.click({ position: { x: 2, y: 2 } })
  await expect(welcomeModal).toBeHidden()
  await expect(skipLink).toBeFocused()
})

test('welcome dialog does not lock the destination after client navigation', async ({ page }) => {
  await preparePageLoad(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await waitForAstroPageLoad(page)

  await expect(page.getByRole('dialog', { name: 'Вітаємо у Krapelnytsia!' })).toBeVisible({
    timeout: 3_000,
  })
  const destination = page.locator('a.city-link').first()
  const destinationHref = await destination.getAttribute('href')
  await destination.evaluate((link) => link.click())
  await expect(page).toHaveURL(new RegExp(`${destinationHref}/?$`))

  await expect(page.locator('html')).not.toHaveClass(/has-modal/)
  await expect(page.locator('#welcome-modal')).toHaveCount(0)
})

test('skip link moves keyboard focus to main content', async ({ page }) => {
  await preparePageLoad(page, true)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await waitForAstroPageLoad(page)

  await page.locator('.skip-link').focus()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/#main-content$/)
  await expect(page.locator('#main-content')).toBeFocused()
})

test('dark welcome call-to-action meets WCAG AA text contrast', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
  await preparePageLoad(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await waitForAstroPageLoad(page)

  const callLink = page.getByRole('dialog', { name: 'Вітаємо у Krapelnytsia!' }).getByRole('link', {
    name: /Зателефонувати/,
  })
  await expect(callLink).toBeVisible({ timeout: 3_000 })
  await expect(page.locator('html')).toHaveClass(/dark/)

  const colors = await callLink.evaluate((element) => {
    const styles = getComputedStyle(element)
    return { background: styles.backgroundColor, color: styles.color }
  })
  expect(contrastRatio(colors.color, colors.background)).toBeGreaterThanOrEqual(4.5)
})

test('form fields expose validation errors to assistive technology', async ({ page }) => {
  await preparePageLoad(page, true)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await waitForAstroPageLoad(page)

  const nameInput = page.getByLabel("Ваше ім'я")
  const submitButton = page.getByRole('button', { name: 'Підтвердити запис' })

  await expect(nameInput).toHaveAttribute('aria-describedby', 'name-error')
  await submitButton.click()
  await expect(nameInput).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#name-error')).toBeVisible()
})

test('form marks the first invalid service checkbox and focuses it', async ({ page }) => {
  await preparePageLoad(page, true)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await waitForAstroPageLoad(page)

  await page.getByLabel("Ваше ім'я").fill('Тест')
  const phone = page.getByLabel('Номер телефону')
  await phone.fill('+380630000001')
  await page.getByLabel('Район Львова').selectOption({ label: 'Личаківський' })
  await page.getByRole('button', { name: 'Підтвердити запис' }).click()

  const firstService = page.locator('input[name="services"]').first()
  await expect(firstService).toHaveAttribute('aria-invalid', 'true')
  await expect(firstService).toBeFocused()
})

test('submits the contact form to the same-origin lead endpoint', async ({ page }) => {
  let releaseResponse: () => void
  const responseRelease = new Promise<void>((resolve) => {
    releaseResponse = resolve
  })
  let captureRequest: (request: Request) => void
  const submittedRequest = new Promise<Request>((resolve) => {
    captureRequest = resolve
  })

  await page.route('**/api/leads/submit', async (route) => {
    captureRequest(route.request())
    await responseRelease

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Lead received' }),
    })
  })

  await preparePageLoad(page, true)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await waitForAstroPageLoad(page)

  const welcomeModal = page.getByRole('dialog', { name: 'Вітаємо у Krapelnytsia!' })
  if (await welcomeModal.isVisible()) {
    await welcomeModal.getByRole('button', { name: 'Продовжити перегляд' }).click()
    await expect(welcomeModal).toBeHidden()
  }

  const firstService = page.locator('input[name="services"]').first()
  await firstService.check()
  await page.getByLabel("Ваше ім'я").fill('Тест Telegram 2026-07-18')
  const phoneInput = page.getByLabel('Номер телефону')
  await phoneInput.evaluate((input) => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

    valueSetter?.call(input, '+380630000001')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.getByLabel('Район Львова').selectOption({ label: 'Личаківський' })

  const successMessage = page.locator('#success-msg')
  await expect(successMessage).toBeHidden()

  const submissionResponse = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return response.request().method() === 'POST' && url.pathname === '/api/leads/submit'
  })

  await page.getByRole('button', { name: 'Підтвердити запис' }).click()

  const request = await submittedRequest
  const requestUrl = new URL(request.url())

  expect(requestUrl.origin).toBe(new URL(page.url()).origin)
  expect(requestUrl.pathname).toBe('/api/leads/submit')
  expect(request.url()).not.toContain(':8080')
  expect(request.url()).not.toContain('zhydachiv')
  expect(request.url()).not.toContain('webhook-test')
  expect(JSON.parse(request.postData() ?? '{}')).toMatchObject({
    name: 'Тест Telegram 2026-07-18',
    phone: '+380630000001',
    district: 'Личаківський',
    services: [await firstService.inputValue()],
  })
  await expect(successMessage).toBeHidden()

  releaseResponse()

  const response = await submissionResponse
  expect(response.status()).toBe(201)
  await expect(successMessage).toBeVisible()
})
