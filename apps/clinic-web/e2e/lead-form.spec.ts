import { expect, test } from './fixtures'

test('hero form stays disabled and no lead request is sent', async ({ page }) => {
  const posts: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request.url())
  })

  await page.goto('/site/')
  const form = page.locator('#clinic-lead-preview')
  await expect(form).toBeVisible()
  await expect(form.locator('input[name="name"]')).toBeDisabled()
  await expect(form.locator('input[name="phone"]')).toBeDisabled()
  await expect(form.getByRole('button', { name: /залишити заявку/i })).toBeDisabled()
  await expect(page.locator('input[name="services"], select[name="district"]')).toHaveCount(0)
  expect(posts).toEqual([])
})
