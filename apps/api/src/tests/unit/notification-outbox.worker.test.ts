import { beforeEach, describe, expect, it, vi } from 'vitest'

import { calculateRetryDelay } from '@/constants/config/retry-config.const'
import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { NotificationRecipientsService } from '@/services/config/notification-recipients.service'
import { NotificationOutboxWorker } from '@/services/coordinators/notification-outbox.worker'

const { providerSend } = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'
  process.env.ADMIN_EMAIL = 'a@example.test'
  process.env.SMTP_HOST = 'smtp.example.test'
  process.env.SMTP_PASS = 'test-pass'
  process.env.SMTP_USER = 'sender@example.test'
  process.env.ENABLED_PROVIDERS = 'EMAIL'
  process.env.TELEGRAM_MASTER_ID = ''
  process.env.TELEGRAM_NOTIFY_IDS = ''
  return { providerSend: vi.fn() }
})

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }))

vi.mock('node:fs/promises', () => ({ readFile }))

vi.mock('@/core/factories/notification.factory', () => ({
  NotificationFactory: { getProvider: () => ({ send: providerSend }) },
}))
vi.mock('@/config/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const lead = {
  name: 'Test',
  phone: '+380000000000',
  district: '',
  services: [],
  timestamp: new Date(),
}

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    leadId: 7,
    provider: NotificationProvider.EMAIL,
    recipient: 'a@example.test',
    status: 'pending' as const,
    attemptCount: 0,
    nextAttemptAt: Date.now(),
    lastError: null,
    ...overrides,
  }
}

function makeStorage(rows = [row()]) {
  return {
    getDueNotifications: vi.fn().mockResolvedValue(rows),
    claimNotification: vi.fn().mockResolvedValue(true),
    getLeadById: vi.fn().mockResolvedValue(lead),
    markNotificationDelivered: vi.fn().mockResolvedValue(undefined),
    markNotificationCancelled: vi.fn().mockResolvedValue(undefined),
    markNotificationPending: vi.fn().mockResolvedValue(undefined),
    markNotificationFailed: vi.fn().mockResolvedValue(undefined),
    recoverProcessing: vi.fn().mockResolvedValue(undefined),
  }
}

describe('NotificationOutboxWorker', () => {
  beforeEach(() => {
    providerSend.mockReset()
    providerSend.mockResolvedValue({ success: true, provider: NotificationProvider.EMAIL })
    readFile.mockReset()
  })

  it('delivers a claimed row and acknowledges only after provider success', async () => {
    const storage = makeStorage()
    const worker = new NotificationOutboxWorker(
      storage as never,
      { getFor: vi.fn().mockResolvedValue(['a@example.test']) } as never,
    )
    await worker.processPending()
    expect(providerSend).toHaveBeenCalledOnce()
    expect(storage.markNotificationDelivered).toHaveBeenCalledOnce()
  })

  it('schedules retries and makes the third invocation terminal', async () => {
    const storage = makeStorage([row({ attemptCount: 2 })])
    providerSend.mockResolvedValue({
      success: false,
      provider: NotificationProvider.EMAIL,
      error: 'secret recipient',
    })
    const worker = new NotificationOutboxWorker(
      storage as never,
      { getFor: vi.fn().mockResolvedValue(['a@example.test']) } as never,
    )
    await worker.processPending()
    expect(storage.markNotificationFailed).toHaveBeenCalledWith(
      1,
      'Notification delivery failed',
      expect.any(Number),
    )
    expect(storage.markNotificationPending).not.toHaveBeenCalled()
  })

  it('schedules a non-terminal retry with a generic due error', async () => {
    const storage = makeStorage([row({ attemptCount: 1 })])
    providerSend.mockResolvedValue({
      success: false,
      provider: NotificationProvider.EMAIL,
      error: 'recipient=a secret=token',
    })
    const before = Date.now()
    const worker = new NotificationOutboxWorker(
      storage as never,
      { getFor: vi.fn().mockResolvedValue(['a@example.test']) } as never,
    )
    await worker.processPending()
    const [id, error, due] = storage.markNotificationPending.mock.calls[0] as [
      number,
      string,
      number,
    ]
    expect(id).toBe(1)
    expect(error).toBe('Notification delivery failed')
    expect(due).toBeGreaterThanOrEqual(before + calculateRetryDelay(2))
    expect(JSON.stringify(storage.markNotificationPending.mock.calls[0])).not.toContain('secret')
  })

  it('isolates one failed recipient from one successful recipient', async () => {
    const storage = makeStorage([
      row({ id: 1, recipient: 'ok@example.test' }),
      row({ id: 2, recipient: 'bad@example.test' }),
    ])
    providerSend.mockImplementation((recipient: string) =>
      Promise.resolve(
        recipient.startsWith('bad')
          ? { success: false, provider: NotificationProvider.EMAIL }
          : { success: true, provider: NotificationProvider.EMAIL },
      ),
    )
    const worker = new NotificationOutboxWorker(
      storage as never,
      { getFor: vi.fn().mockResolvedValue(['ok@example.test', 'bad@example.test']) } as never,
    )
    await worker.processPending()
    expect(storage.markNotificationDelivered).toHaveBeenCalledWith(1)
    expect(storage.markNotificationPending).toHaveBeenCalledWith(
      2,
      'Notification delivery failed',
      expect.any(Number),
    )
  })

  it('cancels a Telegram row when the allowlist is unavailable and no env recipient exists', async () => {
    const storage = makeStorage([
      row({ provider: NotificationProvider.TELEGRAM, recipient: '-1001' }),
    ])
    const worker = new NotificationOutboxWorker(
      storage as never,
      { getFor: vi.fn().mockResolvedValue([]) } as never,
    )
    await worker.processPending()
    expect(providerSend).not.toHaveBeenCalled()
    expect(storage.markNotificationCancelled).toHaveBeenCalledOnce()
  })

  it('cancels a file-only Telegram recipient when allowlist refresh fails', async () => {
    readFile.mockResolvedValueOnce(JSON.stringify([-1001]))
    const recipients = new NotificationRecipientsService()
    await expect(recipients.getFor(NotificationProvider.TELEGRAM)).resolves.toContain('-1001')

    readFile.mockRejectedValueOnce(new Error('allowlist unavailable'))
    const storage = makeStorage([
      row({ provider: NotificationProvider.TELEGRAM, recipient: '-1001' }),
    ])
    const worker = new NotificationOutboxWorker(storage as never, recipients)
    await worker.processPending()

    expect(providerSend).not.toHaveBeenCalled()
    expect(storage.markNotificationCancelled).toHaveBeenCalledWith(1)
  })

  it('starts polling and recovers processing rows on start', async () => {
    const storage = makeStorage([])
    const worker = new NotificationOutboxWorker(storage as never, { getFor: vi.fn() } as never)
    await worker.processPending()
    expect(storage.getDueNotifications).toHaveBeenCalledWith(expect.any(Number))
    worker.start()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await worker.stop()
    expect(storage.recoverProcessing).toHaveBeenCalledWith(3)
  })

  it('waits for startup recovery during stop and never polls after shutdown begins', async () => {
    let releaseRecovery!: () => void
    const storage = makeStorage([])
    storage.recoverProcessing.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseRecovery = resolve
        }),
    )
    const worker = new NotificationOutboxWorker(storage as never, { getFor: vi.fn() } as never)

    worker.start()
    await Promise.resolve()
    let stopped = false
    const stopping = worker.stop().then(() => {
      stopped = true
    })
    await Promise.resolve()
    expect(stopped).toBe(false)
    releaseRecovery()
    await stopping

    expect(storage.recoverProcessing).toHaveBeenCalledOnce()
    expect(storage.getDueNotifications).not.toHaveBeenCalled()
  })

  it('arms polling only after startup recovery completes', async () => {
    vi.useFakeTimers()
    try {
      let releaseRecovery!: () => void
      const storage = makeStorage([])
      storage.recoverProcessing.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            releaseRecovery = resolve
          }),
      )
      const worker = new NotificationOutboxWorker(storage as never, { getFor: vi.fn() } as never)

      worker.start()
      worker.start()
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(2_000)
      expect(storage.recoverProcessing).toHaveBeenCalledOnce()
      expect(storage.getDueNotifications).not.toHaveBeenCalled()

      releaseRecovery()
      await Promise.resolve()
      await Promise.resolve()
      expect(storage.getDueNotifications).toHaveBeenCalledOnce()
      await worker.stop()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not poll when startup recovery fails', async () => {
    const storage = makeStorage([])
    storage.recoverProcessing.mockRejectedValueOnce(new Error('synthetic recovery failure'))
    const worker = new NotificationOutboxWorker(storage as never, { getFor: vi.fn() } as never)

    worker.start()
    await Promise.resolve()
    await Promise.resolve()

    expect(storage.getDueNotifications).not.toHaveBeenCalled()
    await worker.stop()
  })
})
