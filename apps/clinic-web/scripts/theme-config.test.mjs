import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resolveTheme } from '../src/config/theme.mjs'

test('unset theme uses the forest build-time design', () => {
  assert.equal(resolveTheme(undefined), 'forest')
})

test('the documented token systems are accepted without aliases', () => {
  assert.equal(resolveTheme('forest'), 'forest')
  assert.equal(resolveTheme('burgundy'), 'burgundy')
  assert.equal(resolveTheme('navy-teal'), 'navy-teal')
})

test('unexpected theme values fail closed instead of silently changing designs', () => {
  for (const invalid of ['', 'navy', 'Forest', 'forest ', 'burgundy ', 'auto', 'dark']) {
    assert.throws(() => resolveTheme(invalid), /HAVENHUB_THEME/)
  }
})
