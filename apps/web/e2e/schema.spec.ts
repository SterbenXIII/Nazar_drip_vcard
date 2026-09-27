import { expect, type Page, test } from '@playwright/test'

test.describe('Schema.org Validation', () => {
  test('Base Page: MedicalTherapy and AggregateRating', async ({ page }: { page: Page }) => {
    await page.goto('/vyvedennya-iz-zapoyu-lviv')

    // Extract LD+JSON
    const scripts = await page.locator('script[type="application/ld+json"]').all()
    let foundMedicalTherapy = false
    let foundAggregateRating = false

    for (const script of scripts) {
      const content = await script.textContent()
      if (content) {
        const json = JSON.parse(content)
        const graph = json['@graph'] || [json]

        for (const item of graph) {
          if (
            item['@type'] === 'MedicalTherapy' ||
            (Array.isArray(item['@type']) && item['@type'].includes('MedicalTherapy'))
          ) {
            foundMedicalTherapy = true
          }
          if (item['@type'] === 'MedicalBusiness' || item['@type'] === 'MedicalClinic') {
            if (item.aggregateRating) foundAggregateRating = true
          }
          if (item['@type'] === 'AggregateRating') foundAggregateRating = true
        }
      }
    }

    expect(foundMedicalTherapy, 'Should have MedicalTherapy schema').toBe(true)
    expect(foundAggregateRating, 'Should have AggregateRating on base page').toBe(true)
  })

  test('District Page: MedicalTherapy present, AggregateRating ABSENT', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto('/lviv/syhivskyy/vyvedennya-iz-zapoyu-lviv')

    const scripts = await page.locator('script[type="application/ld+json"]').all()
    let foundMedicalTherapy = false
    let foundAggregateRating = false

    for (const script of scripts) {
      const content = await script.textContent()
      if (content) {
        const json = JSON.parse(content)
        const graph = json['@graph'] || [json]

        for (const item of graph) {
          if (
            item['@type'] === 'MedicalTherapy' ||
            (Array.isArray(item['@type']) && item['@type'].includes('MedicalTherapy'))
          ) {
            foundMedicalTherapy = true
          }
          if (item['@type'] === 'MedicalBusiness' || item['@type'] === 'MedicalClinic') {
            if (item.aggregateRating) foundAggregateRating = true
          }
          if (item['@type'] === 'AggregateRating') foundAggregateRating = true
        }
      }
    }

    expect(foundMedicalTherapy, 'Should have MedicalTherapy schema').toBe(true)
    expect(
      foundAggregateRating,
      'Should NOT have AggregateRating on district page (Anti-Spam)',
    ).toBe(false)
  })

  test('Hub Page: ItemList (Breadcrumbs/Services)', async ({ page }: { page: Page }) => {
    await page.goto('/lviv/')

    const scripts = await page.locator('script[type="application/ld+json"]').all()
    let foundItemList = false

    for (const script of scripts) {
      const content = await script.textContent()
      if (content) {
        const json = JSON.parse(content)
        const graph = json['@graph'] || [json]

        for (const item of graph) {
          if (item['@type'] === 'ItemList') {
            foundItemList = true
          }
        }
      }
    }

    expect(foundItemList, 'Should have ItemList schema on hub page').toBe(true)
  })
})
