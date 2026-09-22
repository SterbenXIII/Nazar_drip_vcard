import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.ADMIN_EMAIL = 'admin@example.test'
  process.env.ENABLED_PROVIDERS = 'EMAIL'
  process.env.SMTP_HOST = 'smtp.example.test'
  process.env.SMTP_PASS = 'synthetic-password'
  process.env.SMTP_USER = 'sender@example.test'
})

import { envSchema } from '@/config/env.config'

const emailConfig = {
  ADMIN_EMAIL: 'admin@example.test',
  SMTP_HOST: 'smtp.example.test',
  SMTP_PASS: 'synthetic-password',
  SMTP_USER: 'sender@example.test',
}

describe('environment provider contracts', () => {
  it('allows EMAIL to be disabled without SMTP configuration', () => {
    const result = envSchema.safeParse({
      ENABLED_PROVIDERS: 'TELEGRAM',
      TELEGRAM_BOT_TOKEN: 'synthetic-telegram-token',
    })

    expect(result.success).toBe(true)
  })

  it('allows EMAIL with complete generic SMTP configuration', () => {
    const result = envSchema.safeParse({
      ENABLED_PROVIDERS: 'EMAIL',
      ...emailConfig,
    })

    expect(result.success).toBe(true)
  })

  it('rejects EMAIL without an SMTP host', () => {
    const result = envSchema.safeParse({
      ENABLED_PROVIDERS: 'EMAIL',
      ...emailConfig,
      SMTP_HOST: '',
    })

    expect(result.success).toBe(false)
  })

  it('rejects EMAIL without SMTP credentials', () => {
    const result = envSchema.safeParse({
      ADMIN_EMAIL: emailConfig.ADMIN_EMAIL,
      ENABLED_PROVIDERS: 'EMAIL',
    })

    expect(result.success).toBe(false)
  })

  it('allows TELEGRAM with its bot token', () => {
    const result = envSchema.safeParse({
      ENABLED_PROVIDERS: 'TELEGRAM',
      TELEGRAM_BOT_TOKEN: 'synthetic-telegram-token',
    })

    expect(result.success).toBe(true)
  })
})
