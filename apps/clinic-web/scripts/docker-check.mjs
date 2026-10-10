import assert from 'node:assert/strict'

import { chromium } from '@playwright/test'

const origin = 'http://127.0.0.1:4323'
const get = (path, options) => fetch(new URL(path, origin), options)

const home = await get('/')
assert.equal(home.status, 200, 'home must return HTTP 200')
const html = await home.text()
assert.match(html, /<meta name="robots" content="noindex,nofollow">/)
assert.doesNotMatch(html, /<link\b[^>]*\brel=["']canonical["']/i)
assert.doesNotMatch(html, /\bhreflang\s*=/i)
assert.doesNotMatch(html, /\bog:url\b/i)
assert.doesNotMatch(html, /<form\b|id="clinic-submit"|data-clinic-ready/i)
assert.doesNotMatch(html, /__havenhub_staging_media__|img-0905|img-0907/i)
assert.match(html, /<main\b[^>]*id="content"[^>]*tabindex="-1"/)

const favicon = await get('/favicon.svg')
assert.equal(favicon.status, 200, 'favicon must return HTTP 200')
assert.match(favicon.headers.get('content-type') ?? '', /image\/svg\+xml/)

for (const path of [
  '/programa/',
  '/umovy/',
  '/rodyni/',
  '/napriamy/',
  '/unknown-clinic-route/',
  '/preview/services/template-demo/',
  '/api/leads/submit',
  '/sitemap.xml',
]) {
  assert.equal((await get(path)).status, 404, `${path} must return HTTP 404`)
}

const browser = await chromium.launch()
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []
    const requests = []
    const assets = new Set()

    await page.route('**/*', (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (
        !['GET', 'HEAD'].includes(request.method()) ||
        url.origin !== origin ||
        url.pathname.startsWith('/api/')
      ) {
        requests.push(`${request.method()} ${url.pathname}`)
        return route.abort()
      }
      return route.continue()
    })
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('response', (response) => {
      const url = new URL(response.url())
      if (url.origin === origin && /\.(css|js|png|svg|woff2)$/.test(url.pathname)) {
        if (!response.ok()) errors.push(`asset HTTP ${response.status()}: ${url.pathname}`)
        assets.add(url.pathname.split('.').at(-1))
      }
    })

    await page.goto(origin)
    assert.equal(await page.evaluate(() => window.innerWidth), width)
    assert.equal(await page.locator('h1').count(), 1)
    assert.equal(await page.locator('main > section').count(), 9)
    assert.equal(await page.locator('form, #clinic-submit').count(), 0)
    assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), '/favicon.svg')

    for (const target of ['tel:+380779742422', 'https://t.me/HavenRehub']) {
      assert.equal(await page.locator(`#contact a[href="${target}"]`).count(), 1)
    }

    if (width === 390) {
      const toggle = page.locator('#mobile-menu-toggle')
      const navigation = page.locator('#mobile-navigation')
      assert.equal(await toggle.getAttribute('aria-controls'), 'mobile-navigation')
      await toggle.focus()
      await page.keyboard.press('Enter')
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
      assert.equal(await navigation.isVisible(), true)
      await page.keyboard.press('Escape')
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
      assert.equal(await navigation.isHidden(), true)
      assert.equal(await toggle.evaluate((element) => element === document.activeElement), true)
    } else if (width === 1440) {
      assert.equal(await page.locator('#mobile-menu-toggle').isHidden(), true)
      assert.equal(
        await page.getByRole('navigation', { name: 'Основна навігація' }).isVisible(),
        true,
      )
    }

    for (const href of await page
      .locator('.desktop-nav a[href^="#"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')))) {
      assert.equal(await page.locator(href).count(), 1, `navigation target ${href} must exist`)
    }
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `horizontal overflow at ${width}px`,
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
      'auto',
    )
    // Favicon is verified with an explicit HTTP fetch above: headless Chromium may not request it.
    assert.ok(assets.has('css'), 'stylesheet must load')
    assert.deepEqual(requests, [], 'browser must not send API or external requests')
    assert.deepEqual(errors, [], `browser errors at ${width}px`)
    console.log(`browser ${width}px PASS; ${assets.size} asset types; no API request`)
    await page.close()
  }
} finally {
  await browser.close()
}

console.log('clinic Docker HTTP, metadata, closed forms, assets and browser smoke PASS')
