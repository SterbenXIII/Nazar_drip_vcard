import { expect, type Request, test } from '@playwright/test'

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

  await page.goto('/', { waitUntil: 'domcontentloaded' })

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
