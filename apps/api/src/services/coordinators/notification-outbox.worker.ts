import { logger } from '@/config/logger'
import { calculateRetryDelay, RETRY_CONFIG } from '@/constants/config/retry-config.const'
import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { formatLeadNotification } from '@/constants/messages/notification-templates.const'
import { NotificationFactory } from '@/core/factories/notification.factory'
import { NotificationRecipientsService } from '@/services/config/notification-recipients.service'
import { DatabaseService } from '@/services/database.service'
import { DatabaseStorageProvider } from '@/services/providers/storage/database-storage.provider'
import type { NotificationOutboxRecord } from '@/types/notification/notification-outbox.type'

const POLL_INTERVAL_MS = 1000

export class NotificationOutboxWorker {
  private readonly storage: DatabaseStorageProvider
  private readonly recipients: NotificationRecipientsService
  private timer: ReturnType<typeof setInterval> | undefined
  private processing: Promise<void> | undefined
  private recovery: Promise<void> | undefined
  private stopped = true
  private readonly inFlight = new Set<Promise<unknown>>()

  constructor(
    storage = new DatabaseStorageProvider(DatabaseService.getInstance().getProvider()),
    recipients = new NotificationRecipientsService(),
  ) {
    this.storage = storage
    this.recipients = recipients
  }

  public start(): void {
    if (this.timer || this.recovery) return
    this.stopped = false
    const recovery = this.storage
      .recoverProcessing(RETRY_CONFIG.MAX_RETRIES)
      .then(() => {
        if (this.stopped) return
        this.timer = setInterval(() => void this.processPending(), POLL_INTERVAL_MS)
        void this.processPending()
      })
      .catch((error: unknown) => {
        logger.error({ msg: '[NotificationOutboxWorker] startup recovery failed', error })
      })
    this.recovery = recovery
    void recovery.finally(() => {
      if (this.recovery === recovery) this.recovery = undefined
    })
  }

  public async stop(): Promise<void> {
    this.stopped = true
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    await this.recovery
    await this.processing
    await Promise.allSettled(Array.from(this.inFlight))
  }

  public async processPending(): Promise<void> {
    if (this.processing) return this.processing
    this.processing = this.processPendingInternal().finally(() => {
      this.processing = undefined
    })
    return this.processing
  }

  private async processPendingInternal(): Promise<void> {
    const rows = await this.storage.getDueNotifications(Date.now())
    for (const row of rows) {
      if (!(await this.storage.claimNotification(row.id, Date.now()))) continue
      const send = this.deliver({ ...row, attemptCount: row.attemptCount + 1 })
      this.inFlight.add(send)
      await send.finally(() => this.inFlight.delete(send))
    }
  }

  private async deliver(row: NotificationOutboxRecord): Promise<void> {
    try {
      const lead = await this.storage.getLeadById(row.leadId)
      if (!lead) throw new Error('Queued lead is unavailable')
      const recipients = await this.recipients.getFor(row.provider)
      if (row.provider === NotificationProvider.TELEGRAM && !recipients.includes(row.recipient)) {
        await this.storage.markNotificationCancelled(row.id)
        return
      }
      const provider = NotificationFactory.getProvider(row.provider)
      const result = await provider.send(row.recipient, formatLeadNotification(lead))
      if (!result.success) throw new Error(result.error || 'Provider rejected notification')
      await this.storage.markNotificationDelivered(row.id)
    } catch (_error) {
      const message = 'Notification delivery failed'
      const nextAttemptAt = Date.now() + calculateRetryDelay(row.attemptCount)
      if (row.attemptCount >= RETRY_CONFIG.MAX_RETRIES) {
        await this.storage.markNotificationFailed(row.id, message, nextAttemptAt)
      } else {
        await this.storage.markNotificationPending(row.id, message, nextAttemptAt)
      }
      logger.error({ msg: '[NotificationOutboxWorker] delivery failed', provider: row.provider })
    }
  }
}
