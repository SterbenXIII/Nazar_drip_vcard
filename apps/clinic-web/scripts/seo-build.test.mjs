import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import process from 'node:process'
import { resolve } from 'node:path'
import { test } from 'node:test'

const app = resolve(import.meta.dirname, '..')
const repo = resolve(app, '../..')
const dist = resolve(app, 'dist')
const fixtureOrigin = 'https://havenhub.example/'

function build(mode, env = {}) {
  execFileSync('pnpm', ['--filter', '@vcard/clinic-web', `build:${mode}`], {
    cwd: repo,
    env: {
      ...process.env,
      CLINIC_ENABLE_SERVICE_PREVIEW: 'false',
      ...env,
    },
    stdio: 'pipe',
  })
}

test('production SEO is explicitly gated, has a single indexable canonical page and isolated sitemap', async () => {
  try {
    build('production', {
      CLINIC_ALLOW_PRODUCTION_BUILD: 'true',
      CLINIC_CANONICAL_ORIGIN: fixtureOrigin,
    })
    const home = await readFile(resolve(dist, 'index.html'), 'utf8')
    assert.match(home, /<meta name="robots" content="index,follow">/)
    assert.match(home, /<link rel="canonical" href="https:\/\/havenhub\.example\/">/)
    assert.match(home, /<meta property="og:url" content="https:\/\/havenhub\.example\/">/)
    assert.match(home, /<meta name="twitter:card" content="summary">/)
    const sitemap = await readFile(resolve(dist, 'sitemap.xml'), 'utf8')
    assert.match(sitemap, /<loc>https:\/\/havenhub\.example\/<\/loc>/)
    assert.equal((sitemap.match(/<loc>/g) ?? []).length, 1)

    for (const slug of ['programa', 'umovy', 'rodyni', 'napriamy']) {
      const html = await readFile(resolve(dist, slug, 'index.html'), 'utf8')
      assert.match(html, /<meta name="robots" content="noindex,follow">/)
      assert.doesNotMatch(html, /rel="canonical"/)
    }
    const page404 = await readFile(resolve(dist, '404.html'), 'utf8')
    assert.match(page404, /<meta name="robots" content="noindex,nofollow">/)
    const robots = await readFile(resolve(dist, 'robots.txt'), 'utf8')
    assert.doesNotMatch(robots, /Disallow:\s*\//i)
  } finally {
    build('normal', {
      CLINIC_ALLOW_PRODUCTION_BUILD: 'false',
      CLINIC_CANONICAL_ORIGIN: '',
    })
  }
  assert.deepEqual(
    (await readdir(dist)).filter((file) => file === 'sitemap.xml'),
    [],
  )
})
