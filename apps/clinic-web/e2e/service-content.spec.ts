import { expect, test } from '@playwright/test'

import { isPublishableService, type ServiceContent, servicePreview } from '../src/content/services'

const approvedFixture: ServiceContent = {
  ...servicePreview,
  approvalStatus: 'CONFIRMED',
  contentOwner: 'TEST_FIXTURE_ONLY',
  source: 'TEST_FIXTURE_ONLY — source v1',
  lastConfirmed: '2026-10-01',
}

test('publishes only confirmed service content with owner, source and a real date', () => {
  expect(isPublishableService(approvedFixture)).toBe(true)
  expect(isPublishableService({ ...approvedFixture, approvalStatus: 'PROPOSED' })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, contentOwner: null })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, contentOwner: '  ' })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, source: '  ' })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, lastConfirmed: 'not-a-date' })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, lastConfirmed: '2026-02-30' })).toBe(false)
})
