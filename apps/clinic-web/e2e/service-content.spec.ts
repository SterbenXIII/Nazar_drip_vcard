import { expect, test } from '@playwright/test'

import {
  isPublishableService,
  type ServiceContent,
  servicePreview,
  services,
  servicesForBuild,
  serviceStaticPath,
} from '../src/content/services'

const approvedFixture: ServiceContent = {
  ...servicePreview,
  approvalStatus: 'CONFIRMED',
  contentOwner: 'TEST_FIXTURE_ONLY',
  source: 'TEST_FIXTURE_ONLY — source v1',
  lastConfirmed: '2026-10-01',
  medicalReview: {
    reviewer: 'Давидок Вікторія Юріївна',
    source: 'TEST_FIXTURE_ONLY — review note',
    recordedAt: '2026-10-01',
  },
  operationalReview: {
    approver: 'Антошків Станіслав Михайлович',
    recordedAt: '2026-10-01',
  },
  publicationApproval: {
    approver: 'Антошків Станіслав Михайлович',
    recordedAt: '2026-10-01',
  },
}

test('publishes only confirmed service content with evidence and recorded approvals', () => {
  expect(isPublishableService(approvedFixture)).toBe(true)
  expect(isPublishableService({ ...approvedFixture, approvalStatus: 'PROPOSED' })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, approvalStatus: 'BLOCKED' })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, contentOwner: null })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, contentOwner: '  ' })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, source: null })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, source: '  ' })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, lastConfirmed: null })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, lastConfirmed: 'not-a-date' })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, lastConfirmed: '2026-02-30' })).toBe(false)
  expect(isPublishableService({ ...approvedFixture, medicalReview: null })).toBe(false)
  expect(
    isPublishableService({
      ...approvedFixture,
      medicalReview: { ...approvedFixture.medicalReview!, reviewer: 'TEST_FIXTURE_ONLY' },
    }),
  ).toBe(false)
  expect(
    isPublishableService({
      ...approvedFixture,
      medicalReview: { ...approvedFixture.medicalReview!, recordedAt: '2026-02-30' },
    }),
  ).toBe(false)
  expect(isPublishableService({ ...approvedFixture, operationalReview: null })).toBe(false)
  expect(
    isPublishableService({
      ...approvedFixture,
      operationalReview: { ...approvedFixture.operationalReview!, recordedAt: '2026-02-30' },
    }),
  ).toBe(false)
})

test('production requires a separate recorded public release approval', () => {
  const blocked = { ...approvedFixture, slug: 'blocked', approvalStatus: 'BLOCKED' as const }
  const incomplete = { ...approvedFixture, slug: 'incomplete', lastConfirmed: null }
  const pendingRelease = {
    ...approvedFixture,
    slug: 'pending-release',
    publicationApproval: null,
  }
  const invalidReleaseDate = {
    ...approvedFixture,
    slug: 'invalid-release-date',
    publicationApproval: { ...approvedFixture.publicationApproval!, recordedAt: '2026-02-30' },
  }

  expect(servicesForBuild('normal', [approvedFixture])).toEqual([])
  expect(
    servicesForBuild('staging', [approvedFixture, pendingRelease, blocked, incomplete]),
  ).toEqual([approvedFixture, pendingRelease])
  expect(
    servicesForBuild('production', [approvedFixture, pendingRelease, invalidReleaseDate, blocked]),
  ).toEqual([approvedFixture])
})

test('approved v1 services are distinct and remain out of production pending release approval', () => {
  expect(services.map(({ slug }) => slug)).toEqual([
    'alkoholna-zalezhnist',
    'narkotychna-zalezhnist',
    'ihrova-zalezhnist',
  ])
  expect(new Set(services.map(({ title }) => title)).size).toBe(3)
  expect(new Set(services.map(({ metaTitle }) => metaTitle)).size).toBe(3)
  expect(services.every(isPublishableService)).toBe(true)
  expect(services.every(({ publicationApproval }) => publicationApproval === null)).toBe(true)
  expect(servicesForBuild('normal')).toEqual([])
  expect(servicesForBuild('staging')).toEqual(services)
  expect(servicesForBuild('production')).toEqual([])
  expect(services.every(({ faq }) => faq.length === 0)).toBe(true)
})

test('confirmed candidates map to their exact service route props', () => {
  expect(serviceStaticPath(approvedFixture)).toEqual({
    params: { slug: 'template-demo' },
    props: { service: approvedFixture },
  })
})
