import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resolvePageSeo, resolveSeoConfig } from '../src/config/seo.mjs'

const production = {
  CLINIC_SITE_MODE: 'production',
  CLINIC_ALLOW_PRODUCTION_BUILD: 'true',
  CLINIC_CANONICAL_ORIGIN: 'https://havenhub.example',
}

test('normal and staging default to noindex without a canonical URL', () => {
  for (const mode of ['normal', 'staging']) {
    assert.deepEqual(resolveSeoConfig({ CLINIC_SITE_MODE: mode }), {
      mode,
      canonicalOrigin: null,
    })
    for (const route of ['home', 'supporting', 'closed']) {
      assert.deepEqual(resolvePageSeo(route, { CLINIC_SITE_MODE: mode }), {
        robots: 'noindex,nofollow',
        canonical: null,
        social: false,
      })
    }
  }
})

test('production requires opt-in and valid HTTPS origin, rejecting unknown/internal hosts', () => {
  for (const changes of [
    { CLINIC_ALLOW_PRODUCTION_BUILD: '' },
    { CLINIC_CANONICAL_ORIGIN: '' },
    { CLINIC_CANONICAL_ORIGIN: 'http://havenhub.example' },
    { CLINIC_CANONICAL_ORIGIN: 'https://unknown' },
    { CLINIC_CANONICAL_ORIGIN: 'https://localhost' },
    { CLINIC_CANONICAL_ORIGIN: 'https://127.0.0.1' },
    { CLINIC_CANONICAL_ORIGIN: 'https://havenhub.example/extra/' },
    { CLINIC_CANONICAL_ORIGIN: 'https://havenhub.example/?secret=1' },
    { CLINIC_CANONICAL_ORIGIN: 'https://user:pass@havenhub.example' },
    { CLINIC_CANONICAL_ORIGIN: 'https://havenhub.example:8443' },
  ]) {
    assert.throws(() => resolveSeoConfig({ ...production, ...changes }), /CLINIC_/)
  }
})

test('HTTPS self-canonical is normalized with trailing slash', () => {
  for (const supplied of ['https://havenhub.example', 'https://havenhub.example/']) {
    assert.deepEqual(resolveSeoConfig({ ...production, CLINIC_CANONICAL_ORIGIN: supplied }), {
      mode: 'production',
      canonicalOrigin: 'https://havenhub.example/',
    })
  }
  assert.deepEqual(resolvePageSeo('home', production), {
    robots: 'index,follow',
    canonical: 'https://havenhub.example/',
    social: true,
  })
  assert.deepEqual(resolvePageSeo('supporting', production), {
    robots: 'noindex,follow',
    canonical: null,
    social: false,
  })
  assert.deepEqual(resolvePageSeo('closed', production), {
    robots: 'noindex,nofollow',
    canonical: null,
    social: false,
  })
})
