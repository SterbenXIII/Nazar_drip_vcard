import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.CLINIC_ACCEPTANCE_PORT ?? '4322')
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  // Publication rebuilds the shared dist/ tree. Never run it alongside browser tests.
  testIgnore: [
    ...(process.env.CLINIC_PUBLICATION_MATRIX === 'true' ? [] : ['**/publication.spec.ts']),
    ...(process.env.CLINIC_SITE_MODE === 'staging' ? [] : ['**/supporting-pages.spec.ts']),
  ],
  outputDir: process.env.CLINIC_ACCEPTANCE_ARTIFACT_DIR ?? './test-results',
  use: { baseURL, serviceWorkers: 'block', ...devices['Desktop Chrome'] },
  webServer: {
    command: `${process.env.CLINIC_ACCEPTANCE_USE_BUILD === 'true' ? '' : 'pnpm build && '}pnpm exec vite dist --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
})
