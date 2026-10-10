import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resolveTheme } from '../src/config/theme.mjs'

test('unset theme uses the burgundy build-time design', () => {
  assert.equal(resolveTheme(undefined), 'burgundy')
})

test('the two documented token systems are accepted without aliases', () => {
  assert.equal(resolveTheme('burgundy'), 'burgundy')
  assert.equal(resolveTheme('navy-teal'), 'navy-teal')
})

test('unexpected theme values fail closed instead of silently changing designs', () => {
  for (const invalid of ['', 'navy', 'Burgundy', 'burgundy ', 'auto', 'dark']) {
    assert.throws(() => resolveTheme(invalid), /HAVENHUB_THEME/)
  }
})
