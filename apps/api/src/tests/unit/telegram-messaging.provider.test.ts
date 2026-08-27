import { afterEach, describe, expect, it, vi } from 'vitest'

import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { TelegramMessagingProvider } from '@/services/providers/messaging/telegram-messaging.provider'

vi.mock('@/config/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

const telegramUrl = 'https://api.telegram.org/bottest-token/sendMessage'
const telegramPayload = {
  chat_id: '123456789',
  text: '<b>Test lead</b>',
  parse_mode: 'HTML',
}

function createProvider(): TelegramMessagingProvider {
  return new TelegramMessagingProvider({
    apiBaseUrl: 'https://api.telegram.org',
    token: 'test-token',
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TelegramMessagingProvider', () => {
  it('sends a Telegram message through the configured API transport', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await createProvider().send({
      recipient: '123456789',
      content: '<b>Test lead</b>',
    })

    expect(fetchMock).toHaveBeenCalledWith(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload),
    })
    expect(result).toEqual({ success: true, provider: NotificationProvider.TELEGRAM })
  })

  it('returns a Telegram API error when the transport receives a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })))

    const result = await createProvider().send({
      recipient: '123456789',
      content: '<b>Test lead</b>',
    })

    expect(result).toMatchObject({
      success: false,
      provider: NotificationProvider.TELEGRAM,
      error: expect.stringContaining('Telegram API error'),
    })
  })
})
