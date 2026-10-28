import { logger } from '@/config/logger'
import { type NotificationProvider } from '@/constants'
import { NotificationFactory } from '@/core/factories/notification.factory'
import { NotificationRecipientsService } from '@/services/config/notification-recipients.service'
import { DatabaseService } from '@/services/database.service'
import { DatabaseStorageProvider } from '@/services/providers/storage/database-storage.provider'
import { type LeadPayload } from '@/types/lead/lead-payload.type'
import type { QueuedNotification } from '@/types/notification/notification-outbox.type'

export class NoNotificationRecipientsError extends Error {
  public readonly provider: NotificationProvider

  constructor(provider: NotificationProvider) {
    super(`No recipients configured for ${provider}`)
    this.name = 'NoNotificationRecipientsError'
    this.provider = provider
  }
}

export class NotificationCoordinator {
  private readonly storage: DatabaseStorageProvider
  private readonly recipients = new NotificationRecipientsService()

  constructor() {
    const databaseProvider = DatabaseService.getInstance().getProvider()
    this.storage = new DatabaseStorageProvider(databaseProvider)
    logger.debug('[NotificationCoordinator] Initialized with database storage')
  }

  public async handleIncomingLead(lead: LeadPayload): Promise<void> {
    const providers = NotificationFactory.getEnabledProviders()
    const notifications: QueuedNotification[] = []
    for (const provider of providers) {
      const targets = await this.recipients.getFor(provider.providerName)
      if (targets.length === 0) throw new NoNotificationRecipientsError(provider.providerName)
      notifications.push(
        ...targets.map((recipient) => ({ provider: provider.providerName, recipient })),
      )
    }
    await this.storage.saveWithOutbox(lead, notifications)
  }
}
