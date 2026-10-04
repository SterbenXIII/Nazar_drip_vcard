import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'

let unexpectedPosts: string[] = []

test.beforeEach(async ({ page }) => {
  unexpectedPosts = []
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      unexpectedPosts.push(new URL(request.url()).pathname)
      await route.abort()
      return
    }
    await route.continue()
  })
})

test.afterEach(() => {
  expect(unexpectedPosts).toEqual([])
})

const enableTestFixture = async (page: Page, turnstileToken?: string, timeoutMs?: number) => {
  await page.evaluate(
    ({ timeout, token }) => {
      const form = document.querySelector<HTMLFormElement>('#clinic-lead-form')!
      const fieldset = form.querySelector('fieldset')!
      const district = form.querySelector<HTMLSelectElement>('select[name="district"]')!
      const emptyState = fieldset.querySelector('.empty-state, .unavailable-option')!
      const label = document.createElement('label')
      const service = document.createElement('input')
      const text = document.createElement('span')

      label.className = 'service-option'
      service.id = 'test-clinic-service'
      service.name = 'services'
      service.type = 'checkbox'
      service.value = 'TEST_FIXTURE_ONLY — не використовувати у production'
      text.textContent = service.value
      label.append(service, text)
      emptyState.replaceWith(label)
      form.dataset.clinicReady = 'true'
      if (timeout) form.dataset.requestTimeoutMs = String(timeout)
      district.disabled = false
      district.innerHTML = '<option value="Центр">TEST_FIXTURE_ONLY</option>'
      form.querySelector<HTMLButtonElement>('#clinic-submit')!.disabled = false
      form.querySelector<HTMLElement>('#clinic-product-status')!.hidden = true
      form.querySelector<HTMLButtonElement>('#clinic-submit')!.removeAttribute('aria-describedby')
      if (token) {
        const input = document.createElement('input')
        input.name = 'cf-turnstile-response'
        input.value = token
        form.append(input)
      }
    },
    { token: turnstileToken, timeout: timeoutMs },
  )
  await page.getByLabel("Ваше ім'я").fill('Тестова заявка')
  await page.getByLabel('Номер телефону').fill('+380630000001')
  await page.getByText('TEST_FIXTURE_ONLY — не використовувати у production').click()
  await expect(page.locator('input[name="services"]')).toBeChecked()
  await page.locator('select[name="district"]').selectOption('Центр')
}

test('keeps unapproved product controls unavailable and does not request the API', async ({
  page,
}) => {
  let requests = 0
  await page.route('**/api/leads/submit', async (route) => {
    requests += 1
    await route.fulfill({ status: 201 })
  })
  await page.goto('/')

  await expect(page.locator('input[name="services"]')).toHaveCount(0)
  await expect(page.locator('.empty-state')).toContainText('погодження')
  await expect(page.getByLabel('Територія звернення')).toBeDisabled()
  const submit = page.getByRole('button', { name: 'Надіслати звернення' })
  await expect(submit).toBeDisabled()
  await expect(submit).toHaveAttribute('aria-describedby', 'clinic-product-status')
  await expect(page.locator('.cf-turnstile')).toHaveCount(0)
  await expect(page.locator('#clinic-product-status')).toContainText(
    'потрібні погоджені напрями та територія',
  )
  await page.evaluate(() =>
    document.querySelector<HTMLFormElement>('#clinic-lead-form')!.requestSubmit(),
  )

  await expect(page.locator('#clinic-request-status')).toBeEmpty()
  expect(requests).toBe(0)
})

test('uses a compact clickable label for an available synthetic service checkbox', async ({
  page,
}) => {
  await page.goto('/')
  await enableTestFixture(page)

  const service = page.locator('input[name="services"]')
  const dimensions = await service.evaluate((input) => {
    const style = getComputedStyle(input)
    const rect = input.getBoundingClientRect()
    return { width: rect.width, height: rect.height, padding: style.padding }
  })

  expect(dimensions.width).toBeLessThanOrEqual(24)
  expect(dimensions.height).toBeLessThanOrEqual(24)
  expect(dimensions.padding).toBe('0px')
  await expect(service).toBeChecked()
})

test('validates the shared payload before requesting the API', async ({ page }) => {
  let requests = 0
  await page.route('**/api/leads/submit', async (route) => {
    requests += 1
    await route.fulfill({ status: 201 })
  })
  await page.goto('/')
  await enableTestFixture(page)
  await page.getByLabel("Ваше ім'я").fill('')

  await page.getByRole('button', { name: 'Надіслати звернення' }).click()

  await expect(page.locator('#name-error')).not.toBeEmpty()
  await expect(page.getByLabel("Ваше ім'я")).toBeFocused()
  expect(requests).toBe(0)
})

test('sends a valid test-only payload once while pending and includes Turnstile when present', async ({
  page,
}) => {
  let requests = 0
  let releaseResponse: () => void = () => undefined
  const pendingResponse = new Promise<void>((resolve) => {
    releaseResponse = resolve
  })
  let body = ''
  await page.route('**/api/leads/submit', async (route) => {
    requests += 1
    body = route.request().postData() ?? ''
    await pendingResponse
    await route.fulfill({ status: 201, body: JSON.stringify({ success: true }) })
  })
  await page.goto('/')
  await enableTestFixture(page, 'test-turnstile-token')

  const submit = page.locator('#clinic-submit')
  await submit.click()
  await expect(submit).toBeDisabled()
  await submit.click({ force: true })
  expect(requests).toBe(1)
  expect(JSON.parse(body)).toMatchObject({
    name: 'Тестова заявка',
    phone: '+380630000001',
    district: 'Центр',
    services: ['TEST_FIXTURE_ONLY — не використовувати у production'],
    source: 'clinic-web',
    turnstileToken: 'test-turnstile-token',
  })

  releaseResponse()
  await expect(page.locator('#clinic-request-status')).toHaveText('Звернення надіслано.')
})

test('omits an absent Turnstile token and allows retry after an API failure', async ({ page }) => {
  let requests = 0
  const bodies: unknown[] = []
  await page.route('**/api/leads/submit', async (route) => {
    requests += 1
    bodies.push(JSON.parse(route.request().postData() ?? '{}'))
    await route.fulfill({ status: requests === 1 ? 500 : 201 })
  })
  await page.goto('/')
  await enableTestFixture(page)

  const submit = page.locator('#clinic-submit')
  await submit.click()
  await expect(page.locator('#clinic-request-status')).toContainText('Не вдалося')
  await expect(submit).toBeEnabled()
  await submit.click()

  expect(requests).toBe(2)
  expect(bodies[0]).not.toHaveProperty('turnstileToken')
  await expect(page.locator('#clinic-request-status')).toHaveText('Звернення надіслано.')
})

test('resets a consumed Turnstile token before retrying an API failure', async ({ page }) => {
  const bodies: unknown[] = []
  await page.route('**/api/leads/submit', async (route) => {
    bodies.push(JSON.parse(route.request().postData() ?? '{}'))
    await route.fulfill({ status: bodies.length === 1 ? 500 : 201 })
  })
  await page.goto('/')
  await enableTestFixture(page, 'single-use-test-token')
  await page.evaluate(() => {
    const testWindow = window as typeof window & {
      turnstile?: { reset: () => void }
      turnstileResetCount?: number
    }
    const input = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')!
    testWindow.turnstile = {
      reset: () => {
        input.value = ''
        testWindow.turnstileResetCount = (testWindow.turnstileResetCount ?? 0) + 1
      },
    }
  })

  const submit = page.locator('#clinic-submit')
  await submit.click()
  await expect(page.locator('#clinic-request-status')).toContainText('Не вдалося')
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { turnstileResetCount?: number }).turnstileResetCount,
      ),
    )
    .toBe(1)
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue('')
  await page.locator('input[name="cf-turnstile-response"]').evaluate((input) => {
    ;(input as HTMLInputElement).value = 'fresh-test-token'
  })
  await submit.click()

  expect(bodies.map((body) => (body as { turnstileToken: string }).turnstileToken)).toEqual([
    'single-use-test-token',
    'fresh-test-token',
  ])
  await expect(page.locator('#clinic-request-status')).toHaveText('Звернення надіслано.')
})

test('allows retry after a request timeout', async ({ page }) => {
  let requests = 0
  await page.route('**/api/leads/submit', async (route) => {
    requests += 1
    if (requests === 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.fulfill({ status: 201 }).catch(() => undefined)
      return
    }
    await route.fulfill({ status: 201 })
  })
  await page.goto('/')
  await enableTestFixture(page, undefined, 100)

  const submit = page.locator('#clinic-submit')
  await submit.click()
  await expect(page.locator('#clinic-request-status')).toContainText('Не вдалося')
  await expect(submit).toBeEnabled()
  await submit.click()

  await expect(page.locator('#clinic-request-status')).toHaveText('Звернення надіслано.')
  expect(requests).toBe(2)
})
