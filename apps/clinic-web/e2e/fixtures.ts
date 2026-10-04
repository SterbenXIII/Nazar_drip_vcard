import { expect, test as base } from '@playwright/test'

export { expect }

export const test = base.extend<{ localNetworkOnly: void }>({
  localNetworkOnly: [
    async ({ context, page }, use) => {
      const baseURL = new URL(process.env.CLINIC_ACCEPTANCE_BASE_URL ?? 'http://127.0.0.1:4322')
      const violations: string[] = []
      const consoleErrors: string[] = []
      let mockedLeadFailure = false

      await context.route('**/*', async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        if (
          url.origin !== baseURL.origin ||
          !['GET', 'HEAD'].includes(request.method()) ||
          url.pathname.startsWith('/api/')
        ) {
          violations.push(`${request.method()} ${url.origin}${url.pathname}`)
          await route.abort()
          return
        }
        await route.continue()
      })

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })
      page.on('pageerror', (error) => violations.push(`page: ${error.message}`))
      page.on('response', (response) => {
        if (new URL(response.url()).pathname === '/api/leads/submit' && response.status() === 500) {
          mockedLeadFailure = true
        }
      })

      await use()
      violations.push(
        ...consoleErrors
          .filter(
            (message) =>
              !mockedLeadFailure ||
              !message.includes(
                'Failed to load resource: the server responded with a status of 500',
              ),
          )
          .map((message) => `console: ${message}`),
      )
      expect(violations).toEqual([])
    },
    { auto: true },
  ],
})
