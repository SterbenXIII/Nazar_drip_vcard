import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config with project-based suites:
 *   - default: existing tests (schema, seo-matrix, ux-performance)
 *   - a11y:    WCAG 2.1 AA accessibility audit (axe-core)
 *   - perf:    Core Web Vitals under CDP throttling
 *   - seo:     Security headers + SEO integrity
 *
 * Run all:        pnpm test:e2e
 * Run one suite:  pnpm exec playwright test --project a11y
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },

  projects: [
    // ── Existing tests (default) ──────────────────────────
    {
      name: 'chromium',
      testMatch: [
        'schema.spec.ts',
        'seo-matrix.spec.ts',
        'ux-performance.spec.ts',
        'contact-form.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Accessibility (WCAG 2.1 AA) ──────────────────────
    {
      name: 'a11y',
      testMatch: 'a11y.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Core Web Vitals (CDP throttle) ───────────────────
    {
      name: 'perf',
      testMatch: 'performance.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Extra timeout for throttled tests
        actionTimeout: 30_000,
      },
      timeout: 60_000,
    },

    // ── Security & SEO Headers ───────────────────────────
    {
      name: 'seo',
      testMatch: 'security-seo.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm build && pnpm preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
  },
})
