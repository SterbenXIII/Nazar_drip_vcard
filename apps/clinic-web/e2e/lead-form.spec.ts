import { expect, test } from './fixtures'

test('submits a consultation request to the API and confirms receipt', async ({ page }) => {
  let submitted: unknown
  await page.route('**/api/leads/submit', async (route) => {
    submitted = route.request().postDataJSON()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.goto('/site/')
  const form = page.locator('#clinic-lead-form')
  await expect(form).toBeVisible()
  await expect(form.locator('input[name="name"]')).toBeEnabled()
  await expect(form.locator('input[name="phone"]')).toBeEnabled()
  await expect(page.locator('#hero a[href="tel:+380779742422"]')).toBeVisible()
  await expect(page.locator('#hero a[href="https://t.me/HavenRehub"]')).toBeVisible()

  await form.getByLabel('Ваше ім’я').fill('Олена Тестова')
  await form.getByLabel('Номер телефону').fill('+380671234567')
  await form.getByRole('button', { name: 'Надіслати звернення' }).click()

  await expect(page.locator('#clinic-request-status')).toHaveText('Звернення надіслано.')
  expect(submitted).toEqual({
    name: 'Олена Тестова',
    phone: '+380671234567',
    district: '',
    services: [],
    source: 'clinic-web',
  })
})

test('keeps entered contact details and offers retry when the API rejects a request', async ({
  page,
}) => {
  await page.route('**/api/leads/submit', async (route) => {
    await route.fulfill({ status: 503, body: 'Unavailable' })
  })

  await page.goto('/site/')
  const form = page.locator('#clinic-lead-form')
  const phone = form.getByLabel('Номер телефону')
  await form.getByLabel('Ваше ім’я').fill('Олена Тестова')
  await phone.fill('+380671234567')
  await form.getByRole('button', { name: 'Надіслати звернення' }).click()

  await expect(page.locator('#clinic-request-status')).toHaveText(
    'Не вдалося надіслати звернення. Спробуйте ще раз.',
  )
  await expect(phone).toHaveValue('+380671234567')
  await expect(form.getByRole('button', { name: 'Надіслати звернення' })).toBeEnabled()
})

test('blocks an invalid phone number before sending the request', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/api/leads/submit')) requests.push(request.url())
  })

  await page.goto('/site/')
  const form = page.locator('#clinic-lead-form')
  const phone = form.getByLabel('Номер телефону')
  await form.getByLabel('Ваше ім’я').fill('Олена Тестова')
  await phone.fill('123')
  await form.getByRole('button', { name: 'Надіслати звернення' }).click()

  await expect(phone).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#phone-error')).toHaveText('Невірний формат номера (+380...)')
  expect(requests).toEqual([])
})

test('shows field validation after blur and keeps invalid values from being submitted', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/api/leads/submit')) requests.push(request.url())
  })

  await page.goto('/site/')
  const form = page.locator('#clinic-lead-form')
  const name = form.getByLabel('Ваше ім’я')
  const phone = form.getByLabel('Номер телефону')

  await name.fill('234234')
  await name.press('Tab')
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#name-error')).toHaveText(
    'Ім’я може містити лише літери, пробіли, дефіс, апостроф або крапку',
  )

  await phone.fill('sdfasf')
  await phone.press('Tab')
  await expect(phone).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#phone-error')).toHaveText('Невірний формат номера (+380...)')

  await form.getByRole('button', { name: 'Надіслати звернення' }).click()
  expect(requests).toEqual([])
})

test('removes letters from phone input and caps its formatted length', async ({ page }) => {
  await page.goto('/site/')
  const phone = page.locator('#clinic-lead-form').getByLabel('Номер телефону')

  await expect(phone).toHaveAttribute('maxlength', '19')
  await phone.fill('+380abc671234567')
  await expect(phone).toHaveValue('+380671234567')

  await phone.fill('+380 (67) 123-45-6789')
  await expect(phone).toHaveValue('+380 (67) 123-45-67')
})

test('shows accessible inline errors for required fields', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/api/leads/submit')) requests.push(request.url())
  })

  await page.goto('/site/')
  const form = page.locator('#clinic-lead-form')
  const name = form.getByLabel('Ваше ім’я')
  const phone = form.getByLabel('Номер телефону')
  await form.getByRole('button', { name: 'Надіслати звернення' }).click()

  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(phone).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#name-error')).not.toBeEmpty()
  await expect(page.locator('#phone-error')).not.toBeEmpty()
  expect(requests).toEqual([])
})

test('rejects whitespace-only names and clears the field error when corrected', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/api/leads/submit')) requests.push(request.url())
  })

  await page.goto('/site/')
  const form = page.locator('#clinic-lead-form')
  const name = form.getByLabel('Ваше ім’я')
  await name.fill('   ')
  await form.getByLabel('Номер телефону').fill('+380671234567')
  await form.getByRole('button', { name: 'Надіслати звернення' }).click()

  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#name-error')).toHaveText("Ім'я надто коротке")
  expect(requests).toEqual([])

  await name.fill('Олена')
  await expect(name).not.toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#name-error')).toBeEmpty()
})

test('accepts a formatted Ukrainian phone and submits its normalized value', async ({ page }) => {
  let submitted: unknown
  await page.route('**/api/leads/submit', async (route) => {
    submitted = route.request().postDataJSON()
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{"success":true}' })
  })

  await page.goto('/site/')
  const form = page.locator('#clinic-lead-form')
  await form.getByLabel('Ваше ім’я').fill('Олена Тестова')
  await form.getByLabel('Номер телефону').fill('(067) 123-45-67')
  await form.getByRole('button', { name: 'Надіслати звернення' }).click()

  await expect(page.locator('#clinic-request-status')).toHaveText('Звернення надіслано.')
  expect(submitted).toMatchObject({ phone: '+380671234567' })
})

test('keeps the submit action reachable after scrolling on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/site/')

  const submit = page.locator('#clinic-lead-form button[type="submit"]')
  await submit.scrollIntoViewIfNeeded()
  await expect(submit).toBeInViewport({ ratio: 1 })
})
