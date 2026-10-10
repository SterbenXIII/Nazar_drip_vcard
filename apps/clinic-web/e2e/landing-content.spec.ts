import { expect, test } from '@playwright/test'

import { claimRegister } from '../src/content/claims'
import { careFormats, dependencyTypes } from '../src/content/customer-materials'
import { landingSections } from '../src/content/landing'

test('keeps the landing copy within confirmed service and publication boundaries', () => {
  expect(dependencyTypes).toEqual([
    'Алкогольна залежність',
    'Ігрова залежність',
    'Наркотична залежність',
  ])
  expect(careFormats).toEqual(['Стаціонарна програма', 'Амбулаторна програма', 'Виїзд додому'])

  const copy = landingSections.flatMap((section) => [
    section.title,
    section.introduction,
    ...section.items.flatMap((item) => [item.title, item.description]),
  ])
  const publicCopy = copy.join(' ')

  expect(landingSections.map(({ id }) => id)).toEqual([
    'hero',
    'audience',
    'dependencies',
    'formats',
    'program',
    'first-contact',
    'family',
    'conditions',
    'contact',
  ])
  expect(landingSections[0].title).toBe('Допомога людям із залежностями та їхнім близьким')
  expect(landingSections[0].items[0].title).toBe('Гаряча лінія 24/7')
  expect(landingSections[0].items[0].description).toEqual([
    'Перша первинна консультація безкоштовна.',
  ])
  expect(publicCopy).toContain('Гаряча лінія 24/7')
  expect(publicCopy).toContain('Перша первинна консультація безкоштовна')
  expect(publicCopy).toContain('Вартість визначають після консультації')
  expect(publicCopy).toContain('Центр розташований у Львівській області')
  expect(publicCopy).toContain('у Львові та Львівській області')
  expect(publicCopy).not.toMatch(/по всій Україні|адрес[аи]:|точна адреса/i)
  expect(publicCopy).not.toMatch(/препарат|медикамент|детоксикац|ЕКГ|8 консультац/i)
  expect(publicCopy).not.toMatch(/гарантован|повна анонімність|абсолютна безпека|одужан/i)

  const formats = landingSections.find(({ id }) => id === 'formats')!
  expect(formats.items.map(({ title }) => title)).toEqual(careFormats)
  expect(formats.items.map(({ description }) => description.join(' '))).toContain(
    'Виїзд додому у Львові та Львівській області.',
  )
  expect(formats.items.some(({ description }) => description.join(' ').includes('місяць'))).toBe(
    false,
  )
})

test('tracks source receipt, service currentness, and production approval separately', () => {
  for (const format of ['home-visit', 'outpatient', 'residential']) {
    const claim = claimRegister.find(({ id }) => id === `source-${format}`)
    expect(claim).toMatchObject({
      evidenceReceived: true,
      currentness: 'UNVERIFIED',
      productionApproval: 'PENDING',
    })
  }

  expect(claimRegister.find(({ id }) => id === 'hotline-availability')).toMatchObject({
    evidenceReceived: true,
    currentness: 'OWNER_CONFIRMED_FOR_DRAFT',
    productionApproval: 'PENDING',
  })
  expect(claimRegister.find(({ id }) => id === 'free-first-consultation')).toMatchObject({
    evidenceReceived: true,
    currentness: 'OWNER_CONFIRMED_FOR_DRAFT',
    productionApproval: 'PENDING',
  })

  for (const claim of claimRegister.filter(({ status }) => status === 'PENDING_VERIFICATION')) {
    expect(claim.publicDraft).toBeNull()
  }
})

test('renders only the confirmed center location and home-visit coverage', async ({ page }) => {
  await page.goto('/')

  const formats = page.locator('.services')
  await expect(formats).toContainText('Центр розташований у Львівській області')
  await expect(formats).toContainText('Виїзд додому — у Львові та Львівській області')
  await expect(formats).not.toContainText('по всій Україні')
  await expect(formats).not.toContainText('Адреса:')
})
