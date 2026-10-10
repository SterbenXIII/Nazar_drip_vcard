import { expect, test } from './fixtures'

test('contact offers direct links without a form, catalog, or lead requests', async ({ page }) => {
  const posts: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request.url())
  })

  await page.goto('/')
  const contact = page.locator('#contact')
  await expect(contact.getByRole('link', { name: /зателефонувати/i })).toHaveAttribute(
    'href',
    'tel:+380779742422',
  )
  await expect(contact.getByRole('link', { name: /telegram/i })).toHaveAttribute(
    'href',
    'https://t.me/HavenRehub',
  )
  await expect(page.locator('form')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /надіслати звернення/i })).toHaveCount(0)
  await expect(page.locator('input[name="services"], select[name="district"]')).toHaveCount(0)
  expect(posts).toEqual([])
})
