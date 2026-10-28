import { afterEach, describe, expect, it, vi } from 'vitest'

const { loggerInfo, loggerError } = vi.hoisted(() => ({
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}))

import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { TelegramMessagingProvider } from '@/services/providers/messaging/telegram-messaging.provider'

vi.mock('@/config/logger', () => ({
  logger: {
    error: loggerError,
    info: loggerInfo,
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

    expect(fetchMock).toHaveBeenCalledWith(
      telegramUrl,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramPayload),
        signal: expect.any(AbortSignal),
      }),
    )
    expect(result).toEqual({ success: true, provider: NotificationProvider.TELEGRAM })
    expect(loggerInfo.mock.calls.flat().join(' ')).not.toContain('123456789')
  })

  it('aborts a pending Telegram request at 30 seconds and redacts timeout details', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('secret recipient token'), { name: 'AbortError' })),
          )
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const resultPromise = createProvider().send({ recipient: 'secret-chat', content: 'lead' })
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      signal: expect.objectContaining({ aborted: true }),
    })
    const result = await resultPromise
    vi.useRealTimers()

    expect(result.error).toBe('Telegram request timed out')
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(loggerError.mock.calls.flat().join(' ')).not.toContain('secret-chat')
    expect(loggerError.mock.calls.flat().join(' ')).not.toContain('test-token')
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
