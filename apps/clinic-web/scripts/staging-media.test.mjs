import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resolveStagingIllustration } from '../src/content/staging-media.mjs'

const first = '/__havenhub_staging_media__/img-0905.webp'
const second = '/__havenhub_staging_media__/img-0907.webp'
const configured = {
  HAVENHUB_STAGING_IMG_0905_URL: first,
  HAVENHUB_STAGING_IMG_0907_URL: second,
}

test('missing staging media stays a text-only layout', () => {
  assert.equal(resolveStagingIllustration('IMG_0905', 'staging', {}), null)
  assert.equal(resolveStagingIllustration('IMG_0907', 'staging', {}), null)
})

test('media uses distinct slots only in protected staging builds', () => {
  assert.equal(resolveStagingIllustration('IMG_0905', 'staging', configured), first)
  assert.equal(resolveStagingIllustration('IMG_0907', 'staging', configured), second)
  for (const mode of ['normal', 'production']) {
    assert.equal(resolveStagingIllustration('IMG_0905', mode, configured), null)
    assert.equal(resolveStagingIllustration('IMG_0907', mode, configured), null)
  }
})

test('rejects remote, unsafe, malformed, and cross-slot paths in staging', () => {
  for (const value of [
    'https://private.example/img-0905.webp',
    '//private.example/img-0905.webp',
    'data:image/png;base64,AA==',
    '/img-0905.webp',
    '/__havenhub_staging_media__/img-0907.webp',
    '/__havenhub_staging_media__/../img-0905.webp',
    '/__havenhub_staging_media__/img-0905.webp?token=secret',
    '/__havenhub_staging_media__/img-0905.svg',
    '',
  ]) {
    assert.throws(
      () =>
        resolveStagingIllustration('IMG_0905', 'staging', {
          HAVENHUB_STAGING_IMG_0905_URL: value,
        }),
      /HAVENHUB_STAGING_IMG_0905_URL/,
      value,
    )
  }
})
