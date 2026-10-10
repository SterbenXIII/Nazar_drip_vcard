import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { resolve } from 'node:path'
import process from 'node:process'

const repo = resolve(import.meta.dirname, '../..')

function listTests(mode, extraEnv = {}) {
  return execFileSync(
    'pnpm',
    [
      '--filter',
      '@vcard/clinic-web',
      'exec',
      'playwright',
      'test',
      '--config',
      'playwright.config.ts',
      '--list',
    ],
    {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, CLINIC_SITE_MODE: mode, ...extraEnv },
    },
  )
}

test('normal E2E suite excludes route-changing publication and staging-only tests', () => {
  const inventory = listTests('normal')
  assert.doesNotMatch(inventory, /publication\.spec\.ts/)
  assert.doesNotMatch(inventory, /supporting-pages\.spec\.ts/)
  assert.match(inventory, /landing-content\.spec\.ts/)
})

test('staging E2E suite includes supporting pages without concurrent publication matrix', () => {
  const inventory = listTests('staging')
  assert.match(inventory, /supporting-pages\.spec\.ts/)
  assert.doesNotMatch(inventory, /publication\.spec\.ts/)
})

test('isolated publication inventory enables only publication test when explicitly requested', () => {
  const inventory = listTests('normal', { CLINIC_PUBLICATION_MATRIX: 'true' })
  assert.match(inventory, /publication\.spec\.ts/)
})
