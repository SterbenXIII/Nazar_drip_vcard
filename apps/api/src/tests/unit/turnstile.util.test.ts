import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

vi.mock('@/config/logger', () => ({
  logger: { error: vi.fn() },
}))

import { verifyTurnstileToken } from '@/utils/turnstile.util'

const successResponse = () =>
  new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('verifyTurnstileToken', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts a successful verification response', async () => {
    fetchMock.mockResolvedValue(successResponse())

    await expect(verifyTurnstileToken('synthetic-secret', 'synthetic-token')).resolves.toEqual({
      success: true,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('rejects an invalid token response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await expect(
      verifyTurnstileToken('synthetic-secret', 'synthetic-token'),
    ).resolves.toMatchObject({
      success: false,
    })
  })

  it('rejects a non-success HTTP status even when the body says success', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 503 }))

    await expect(
      verifyTurnstileToken('synthetic-secret', 'synthetic-token'),
    ).resolves.toMatchObject({
      success: false,
    })
  })

  it('rejects malformed responses', async () => {
    fetchMock.mockResolvedValue(new Response('{not-json', { status: 200 }))

    await expect(
      verifyTurnstileToken('synthetic-secret', 'synthetic-token'),
    ).resolves.toMatchObject({
      success: false,
    })
  })

  it('rejects a timed-out verification', async () => {
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort())
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (!init?.signal) {
        return Promise.resolve(successResponse())
      }

      return Promise.reject(new DOMException('timeout', 'AbortError'))
    })

    await expect(
      verifyTurnstileToken('synthetic-secret', 'synthetic-token'),
    ).resolves.toMatchObject({
      success: false,
    })
    expect(AbortSignal.timeout).toHaveBeenCalledWith(5000)
  })

  it('rejects network failures', async () => {
    fetchMock.mockRejectedValue(new Error('synthetic network failure'))

    await expect(
      verifyTurnstileToken('synthetic-secret', 'synthetic-token'),
    ).resolves.toMatchObject({
      success: false,
    })
  })
})
