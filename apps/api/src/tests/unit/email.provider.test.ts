import { afterEach, describe, expect, it, vi } from 'vitest'

const { sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn(),
}))

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({ sendMail })),
}))

vi.mock('@/config/email.config', () => ({
  getEmailTransportConfig: vi.fn(() => ({ host: 'smtp.example.test' })),
}))

vi.mock('@/config/env.config', () => ({
  ENV: { SMTP_USER: 'sender@example.test' },
}))

vi.mock('@/config/logger', () => ({
  logger: { error: vi.fn() },
}))

import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { EmailProvider } from '@/services/providers/email.provider'

describe('EmailProvider', () => {
  afterEach(() => {
    sendMail.mockReset()
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
