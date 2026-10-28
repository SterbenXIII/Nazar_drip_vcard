import { afterEach, describe, expect, it, vi } from 'vitest'

const { sendMail, createTransport, loggerError } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn(() => ({ sendMail })),
  loggerError: vi.fn(),
}))

vi.mock('nodemailer', () => ({
  createTransport,
}))

vi.mock('@/config/email.config', () => ({
  getEmailTransportConfig: vi.fn(() => ({
    host: 'smtp.example.test',
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 30_000,
  })),
}))

vi.mock('@/config/env.config', () => ({
  ENV: { SMTP_USER: 'sender@example.test' },
}))

vi.mock('@/config/logger', () => ({
  logger: { error: loggerError },
}))

import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { EmailProvider } from '@/services/providers/email.provider'

describe('EmailProvider', () => {
  afterEach(() => {
    sendMail.mockReset()
    createTransport.mockClear()
    loggerError.mockClear()
  })

  it('configures 30-second SMTP setup and inactivity timeouts', async () => {
    new EmailProvider()
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: 30_000,
        greetingTimeout: 30_000,
        socketTimeout: 30_000,
      }),
    )
  })

  it('redacts provider errors from the result and logs', async () => {
    sendMail.mockRejectedValue(new Error('recipient@example.test password=secret'))
    const result = await new EmailProvider().send('recipient@example.test', '<p>Test lead</p>')
    expect(result.error).toBe('Failed to send email:')
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(loggerError.mock.calls.flat().join(' ')).not.toContain('recipient@example.test')
    expect(loggerError.mock.calls.flat().join(' ')).not.toContain('secret')
  })

  it('sends fixed HTML messages with file and URL access disabled', async () => {
    sendMail.mockResolvedValue({ messageId: 'test-message' })

    const result = await new EmailProvider().send('recipient@example.test', '<p>Test lead</p>')

    expect(sendMail).toHaveBeenCalledWith({
      from: 'sender@example.test',
      to: 'recipient@example.test',
      subject: '🚑 New Lead: Emerald Recovery',
      html: '<p>Test lead</p>',
      disableFileAccess: true,
      disableUrlAccess: true,
    })
    expect(result).toEqual({ success: true, provider: NotificationProvider.EMAIL })
  })
})
