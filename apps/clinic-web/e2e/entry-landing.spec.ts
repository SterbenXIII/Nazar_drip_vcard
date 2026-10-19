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
  await expect(page.locator('.entry-visual')).toHaveCSS('grid-column-start', '2')
  await expect(page.locator('.entry-contact')).toBeVisible()
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
