import { beforeEach, describe, expect, it, vi } from 'vitest'

const { env } = vi.hoisted(() => ({
  env: {
    GMAIL_REFRESH_TOKEN: undefined as string | undefined,
    SMTP_HOST: 'mailpit',
    SMTP_PORT: 1025,
    SMTP_USER: 'sender@example.test',
    SMTP_PASS: 'synthetic-password',
  },
}))

vi.mock('@/config/env.config', () => ({ ENV: env }))

import { getEmailTransportConfig } from '@/config/email.config'

describe('getEmailTransportConfig', () => {
  beforeEach(() => {
    env.SMTP_PORT = 1025
  })

  it('uses plain SMTP with opportunistic TLS for non-465 ports', () => {
    expect(getEmailTransportConfig()).toMatchObject({
      host: 'mailpit',
      port: 1025,
      secure: false,
    })
  })

  it('uses implicit TLS on port 465', () => {
    env.SMTP_PORT = 465

    expect(getEmailTransportConfig()).toMatchObject({
      port: 465,
      secure: true,
    })
  })
})
