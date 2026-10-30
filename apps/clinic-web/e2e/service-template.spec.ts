import AxeBuilder from '@axe-core/playwright'

import { expect, test } from './fixtures'

test.skip(
  process.env.CLINIC_ENABLE_SERVICE_PREVIEW !== 'true',
  'Service preview requires an explicit build flag',
)

const previewPath = '/preview/services/template-demo/'

test('renders the demonstration template with accessible links and controls', async ({ page }) => {
  await page.goto(previewPath)

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
  await expect(page).toHaveTitle('Демонстраційна сторінка послуги — HAVENHUB')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Демонстраційна сторінка послуги',
  )
  const breadcrumbs = page.getByRole('navigation', { name: 'Навігаційний ланцюжок' })
  await expect(breadcrumbs.getByRole('link', { name: 'Головна' })).toHaveAttribute('href', '/')
  await expect(breadcrumbs.getByText('Демонстраційна сторінка послуги')).toBeVisible()
  await expect(page.getByText('ДЕМО · непогоджений вміст')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Що варто знати' })).toBeVisible()
  await expect(page.getByText('Демонстраційне поле для перевіреного опису.')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  const contact = page.locator('#contact')
  await expect(contact.getByRole('link', { name: 'Зателефонувати' })).toHaveAttribute(
    'href',
    'tel:+380779742422',
  )
  await expect(contact.getByRole('link', { name: 'Telegram HAVENHUB' })).toHaveAttribute(
    'href',
    'https://t.me/HavenRehub',
  )
  await expect(contact.getByRole('link', { name: 'Написати в WhatsApp HAVENHUB' })).toHaveAttribute(
    'href',
    'https://wa.me/380779742422',
  )
  await expect(contact.getByRole('link', { name: 'Написати на email HAVENHUB' })).toHaveAttribute(
    'href',
    'mailto:havenrehub@gmail.com',
  )

  for (const href of await page
    .locator('a[href]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')!))) {
    if (href.startsWith('#')) {
      expect(await page.locator(href).count()).toBeGreaterThan(0)
    } else if (href.startsWith('tel:')) {
      expect(href).toBe('tel:+380779742422')
    } else {
      const target = new URL(href, page.url())
      if (target.origin !== new URL(page.url()).origin) {
        expect([
          'https://t.me/HavenRehub',
          'https://wa.me/380779742422',
          'mailto:havenrehub@gmail.com',
        ]).toContain(href)
        continue
      }
      const response = await page.request.get(target.href)
      expect(response.ok(), href).toBe(true)
    }
  }

  const faq = page.getByText('Це опис реальної послуги?')
  await faq.focus()
  await expect(faq).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Ні. Це демонстраційні дані')).toBeVisible()

  const contactFaq = page.getByText('Чи можна надіслати звернення з цієї сторінки?')
  await contactFaq.click()
  await expect(
    page.getByText('після окремої специфікації доставки й конфіденційності'),
  ).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

for (const width of [375, 768, 1440]) {
  test(`service preview fits ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(previewPath)
    expect(
      await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')
    await page.screenshot({
      path: testInfo.outputPath(`service-preview-${width}.png`),
      fullPage: true,
    })
  })
}
