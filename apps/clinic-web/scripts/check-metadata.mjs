import { strict as assert } from 'node:assert'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

import { homepageTitle, homepageDescription, resolveSeoConfig } from '../src/config/seo.mjs'

const distDir = resolve(import.meta.dirname, '..', 'dist')
const artifacts = await readdir(distDir, { recursive: true })
const pages = artifacts.filter((path) => path.endsWith('.html')).sort()
const { mode, canonicalOrigin } = resolveSeoConfig()
const servicePreview = process.env.CLINIC_ENABLE_SERVICE_PREVIEW === 'true'

assert(
  !servicePreview || mode === 'normal',
  'The service preview is disabled outside normal builds',
)

const expectedPages = ['404.html', 'index.html']
if (mode !== 'normal') {
  expectedPages.push(
    'programa/index.html',
    'umovy/index.html',
    'rodyni/index.html',
    'napriamy/index.html',
  )
}
if (servicePreview) expectedPages.push('preview/services/template-demo/index.html')
expectedPages.sort()
assert.deepEqual(pages, expectedPages, 'clinic route inventory mismatch')

const titleValues = new Set()
const descriptionValues = new Set()
for (const page of pages) {
  const html = await readFile(resolve(distDir, page), 'utf8')
  const isHomepage = page === 'index.html'
  const isSupporting = expectedPages.length > 2 && !isHomepage && page !== '404.html'
  const isIndexable = mode === 'production' && isHomepage
  const robots = isIndexable
    ? 'index,follow'
    : mode === 'production' && isSupporting
      ? 'noindex,follow'
      : 'noindex,nofollow'

  assert.match(html, /<html\b[^>]*\blang="uk"/i, `missing Ukrainian lang: ${page}`)
  assert.ok(
    html.includes(`<meta name="robots" content="${robots}">`),
    `invalid robots ${page}; expected ${robots}`,
  )
  assert.doesNotMatch(html, /\bhreflang\s*=/i, `unapproved hreflang: ${page}`)
  assert.doesNotMatch(
    html,
    /<script\b[^>]*type="application\/ld\+json"/i,
    `unapproved schema: ${page}`,
  )

  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1]
  assert.ok(title?.trim(), `empty title: ${page}`)
  assert.ok(description?.trim(), `empty description: ${page}`)
  assert.ok(!titleValues.has(title), `duplicate title: ${page}`)
  assert.ok(!descriptionValues.has(description), `duplicate description: ${page}`)
  titleValues.add(title)
  descriptionValues.add(description)

  if (isIndexable) {
    assert.equal(title, homepageTitle, 'production homepage title drifted')
    assert.equal(description, homepageDescription, 'production homepage description drifted')
    assert.ok(html.includes(`<link rel="canonical" href="${canonicalOrigin}">`))
    assert.ok(html.includes(`<meta property="og:url" content="${canonicalOrigin}">`))
    assert.ok(html.includes(`<meta property="og:title" content="${title}">`))
    assert.ok(html.includes(`<meta property="og:description" content="${description}">`))
    assert.ok(html.includes('<meta name="twitter:card" content="summary">'))
    assert.ok(html.includes(`<meta name="twitter:title" content="${title}">`))
    assert.ok(html.includes(`<meta name="twitter:description" content="${description}">`))
    assert.doesNotMatch(html, /\b(?:og:image|twitter:image)\b/i)
  } else {
    assert.doesNotMatch(
      html,
      /<link\b[^>]*\brel=["']canonical["']/i,
      `unexpected canonical: ${page}`,
    )
    assert.doesNotMatch(html, /\bog:url\b/i, `unexpected og:url: ${page}`)
  }
}

const sitemapArtifacts = artifacts.filter((artifact) => artifact.includes('sitemap'))
const robotsArtifacts = artifacts.filter((artifact) => artifact === 'robots.txt')
if (mode === 'production') {
  assert.deepEqual(sitemapArtifacts, ['sitemap.xml'])
  assert.deepEqual(robotsArtifacts, ['robots.txt'])
  const sitemap = await readFile(resolve(distDir, 'sitemap.xml'), 'utf8')
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((entry) => entry[1])
  assert.deepEqual(locations, [canonicalOrigin], 'only production homepage may appear in sitemap')
  const robots = await readFile(resolve(distDir, 'robots.txt'), 'utf8')
  assert.match(robots, /^User-agent: \*\nAllow: \/\n/)
  assert.doesNotMatch(robots, /Disallow:/i, 'robots must not hide noindex pages')
  assert.ok(robots.includes(`Sitemap: ${canonicalOrigin}sitemap.xml`))
} else {
  assert.deepEqual(sitemapArtifacts, [], 'no sitemap is allowed outside production')
  assert.deepEqual(robotsArtifacts, [], 'no robots artifact is needed outside production')
}

console.log(`Clinic metadata checks passed: ${mode} (${pages.length} HTML routes)`)
