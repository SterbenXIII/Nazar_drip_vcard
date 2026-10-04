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
assert.match(html, /data-clinic-ready="false"/, 'form must remain unavailable')
assert.match(html, /<button[^>]*id="clinic-submit"[^>]*disabled/)

const favicon = await get('/favicon.svg')
assert.equal(favicon.status, 200, 'favicon must return HTTP 200')
assert.match(favicon.headers.get('content-type') ?? '', /image\/svg\+xml/)

for (const path of [
  '/unknown-clinic-route/',
  '/preview/services/template-demo/',
  '/api/leads/submit',
  '/sitemap.xml',
]) {
  assert.equal((await get(path)).status, 404, `${path} must return HTTP 404`)
}

const browser = await chromium.launch()
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []
    const requests = []
    const assets = new Set()

    await page.route('**/*', (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (
        request.method() === 'POST' ||
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
      if (url.origin === origin && /\.(css|js|png|svg)$/.test(url.pathname)) {
        if (!response.ok()) errors.push(`asset HTTP ${response.status()}: ${url.pathname}`)
        assets.add(url.pathname.split('.').at(-1))
      }
    })

    await page.goto(origin)
    assert.equal(await page.evaluate(() => window.innerWidth), width)
    assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), '/favicon.svg')
    assert.equal(
      await page.evaluate(() => fetch('/favicon.svg').then((response) => response.ok)),
      true,
    )
    const submitState = await page.locator('#clinic-submit').evaluate((button) => {
      const description = button.getAttribute('aria-describedby')
      return {
        disabled: button.disabled,
        describedByText: description
          ? document.getElementById(description)?.textContent?.trim()
          : '',
      }
    })
    assert.equal(submitState.disabled, true)
    assert.ok(submitState.describedByText)
    await page.locator('#clinic-submit').evaluate((button) => {
      button.disabled = false
    })
    await page.locator('#clinic-lead-form').evaluate((form) => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    assert.match(
      await page.locator('#clinic-request-status').innerText(),
      /Відправлення стане доступним після погодження/,
    )
    await page.locator('#clinic-submit').evaluate((button) => {
      button.disabled = true
    })

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

      const cardMetrics = await page
        .locator('.cards article')
        .first()
        .evaluate((element) => {
          const style = getComputedStyle(element)
          return {
            minHeight: style.minHeight,
            padding: style.padding,
            statusMarginTop: getComputedStyle(element.querySelector('.service-status')).marginTop,
          }
        })
      assert.equal(cardMetrics.minHeight, '0px')
      assert.notEqual(cardMetrics.padding, '0px')
      assert.ok(Number.parseFloat(cardMetrics.statusMarginTop) > 0)
    } else {
      assert.equal(await page.locator('#mobile-menu-toggle').isHidden(), true)
      assert.equal(
        await page.getByRole('navigation', { name: 'Основна навігація' }).isVisible(),
        true,
      )
    }

    assert.equal(
      await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth),
      true,
      `horizontal overflow at ${width}px`,
    )
    await page.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(
      await page.locator('html').evaluate((element) => getComputedStyle(element).scrollBehavior),
      'auto',
    )
    for (const extension of ['css', 'js', 'svg']) {
      assert(assets.has(extension), `${extension} asset must load`)
    }
    assert.deepEqual(requests, [], 'browser must not send API or external requests')
    assert.deepEqual(errors, [], `browser errors at ${width}px`)
    console.log(
      `browser ${width}px PASS; innerWidth=${width}; ${assets.size} assets loaded; no API request`,
    )
    await page.close()
  }
} finally {
  await browser.close()
}

console.log('clinic Docker HTTP, assets, metadata, form and browser checks PASS')
