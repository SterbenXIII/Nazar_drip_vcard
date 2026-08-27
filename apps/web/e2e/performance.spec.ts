import { expect, test } from '@playwright/test'

import { PERF_URLS } from './fixtures'

// ---------------------------------------------------------------------------
// Core Web Vitals under simulated throttling (CDP)
// ---------------------------------------------------------------------------

/** Slow 4G network emulation parameters */
const SLOW_4G = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
  uploadThroughput: (750 * 1024) / 8, // 750 Kbps
  latency: 150, // 150ms RTT
} as const

/** CPU throttle factor (4× = mid-tier mobile) */
const CPU_THROTTLE_RATE = 4

/** LCP budget (ms) */
const LCP_BUDGET_MS = 2500

/** CLS budget */
const CLS_BUDGET = 0.1

test.describe('Core Web Vitals (Throttled)', () => {
  // Each perf test gets extra time
  test.setTimeout(60_000)

  for (const url of PERF_URLS) {
    test(`[${url.label}] LCP < ${LCP_BUDGET_MS}ms under Slow 4G + 4× CPU`, async ({ page }) => {
      // Connect to Chrome DevTools Protocol
      const client = await page.context().newCDPSession(page)

      // Enable throttling
      await client.send('Network.enable')
      await client.send('Network.emulateNetworkConditions', SLOW_4G)
      await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE })

      // Inject LCP observer BEFORE navigation
      await page.addInitScript(() => {
        ;(window as unknown as { __LCP__: number }).__LCP__ = 0
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const last = entries[entries.length - 1]
          if (last) {
            ;(window as unknown as { __LCP__: number }).__LCP__ = last.startTime
          }
        })
        observer.observe({ type: 'largest-contentful-paint', buffered: true })
      })

      await page.goto(url.path, { waitUntil: 'load' })

      // Give LCP observer time to fire
      await page.waitForTimeout(1000)

      const lcp = await page.evaluate(() => (window as unknown as { __LCP__: number }).__LCP__)

      // Disable throttling
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
      await client.send('Network.disable')

      expect(lcp, `LCP = ${lcp.toFixed(0)}ms (budget: ${LCP_BUDGET_MS}ms)`).toBeLessThan(
        LCP_BUDGET_MS,
      )
    })

    test(`[${url.label}] CLS < ${CLS_BUDGET} under Slow 4G + 4× CPU`, async ({ page }) => {
      const client = await page.context().newCDPSession(page)

      await client.send('Network.enable')
      await client.send('Network.emulateNetworkConditions', SLOW_4G)
      await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE })

      // Inject CLS observer BEFORE navigation
      await page.addInitScript(() => {
        ;(window as unknown as { __CLS__: number }).__CLS__ = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as PerformanceEntry & {
              hadRecentInput: boolean
              value: number
            }
            if (!layoutShift.hadRecentInput) {
              ;(window as unknown as { __CLS__: number }).__CLS__ += layoutShift.value
            }
          }
        })
        observer.observe({ type: 'layout-shift', buffered: true })
      })

      await page.goto(url.path, { waitUntil: 'load' })

      // Scroll to trigger any lazy-loaded layout shifts
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1500)

      const cls = await page.evaluate(() => (window as unknown as { __CLS__: number }).__CLS__)

      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
      await client.send('Network.disable')

      expect(cls, `CLS = ${cls.toFixed(4)} (budget: ${CLS_BUDGET})`).toBeLessThan(CLS_BUDGET)
    })
  }
})
