import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { strict as assert } from 'node:assert'

const distDir = resolve(import.meta.dirname, '..', 'dist')
const artifacts = await readdir(distDir, { recursive: true })
const pages = artifacts.filter((path) => path.endsWith('.html')).sort()
const expectedPages = ['404.html', 'index.html']
if (process.env.CLINIC_ENABLE_SERVICE_PREVIEW === 'true') {
  expectedPages.push('preview/services/template-demo/index.html')
}
assert.deepEqual(pages, expectedPages.sort(), 'unexpected clinic routes')

for (const page of pages) {
  const html = await readFile(resolve(distDir, page), 'utf8')

  assert.match(html, /<meta name="robots" content="noindex,nofollow">/)
  assert.doesNotMatch(html, /<link\b[^>]*\brel=["']canonical["']/i)
  assert.doesNotMatch(html, /\bhreflang\s*=/i)
  assert.doesNotMatch(html, /\bog:url\b/i)
}

assert(!artifacts.some((artifact) => artifact.includes('sitemap')), 'sitemap artifact found')

console.log('Clinic metadata checks passed')
