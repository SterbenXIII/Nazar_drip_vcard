import { ENV } from '@/config/env.config'
import { logger } from '@/config/logger'
import { NotificationProvider } from '@/constants'
import { calculateRetryDelay, RETRY_CONFIG } from '@/constants/config/retry-config.const'
import { LOG_MESSAGES } from '@/constants/messages/log-messages.const'
import { formatLeadNotification } from '@/constants/messages/notification-templates.const'
import type { BaseNotificationProvider } from '@/core/abstracts'
import { NotificationFactory } from '@/core/factories/notification.factory'
import { AllowedChatsService } from '@/services/config/allowed-chats.service'
import { DatabaseService } from '@/services/database.service'
import { DatabaseStorageProvider } from '@/services/providers/storage/database-storage.provider'
import { type LeadPayload } from '@/types/lead/lead-payload.type'

export class NotificationCoordinator {
  private readonly storage: DatabaseStorageProvider
  private readonly maxRetries = RETRY_CONFIG.MAX_RETRIES

  constructor() {
    const databaseProvider = DatabaseService.getInstance().getProvider()
    this.storage = new DatabaseStorageProvider(databaseProvider)
    logger.debug('[NotificationCoordinator] Initialized with database storage')
  }

  public async handleIncomingLead(lead: LeadPayload): Promise<void> {
    await this.storage.save(lead)

    const providers = NotificationFactory.getEnabledProviders()
    const message = formatLeadNotification(lead)

    for (const provider of providers) {
      const targets = await this.getRecipientsFor(provider.providerName)
      for (const target of targets) {
        await this.sendWithRetry(provider, message, target)
      }
    }
  }

  private async getRecipientsFor(providerName: NotificationProvider): Promise<string[]> {
    if (providerName === NotificationProvider.TELEGRAM) {
      return await this.getTelegramRecipients()
    }
    const email = ENV.ADMIN_EMAIL ?? ''
    return email ? [email] : []
  }

  private async getTelegramRecipients(): Promise<string[]> {
    const ids = new Set<string>()

    if (ENV.TELEGRAM_MASTER_ID != null) {
      ids.add(String(ENV.TELEGRAM_MASTER_ID))
    }

    if (ENV.TELEGRAM_NOTIFY_IDS) {
      ENV.TELEGRAM_NOTIFY_IDS.forEach((id: string) => ids.add(id))
    }

    const allowedChatsService = AllowedChatsService.getInstance()
    const allowedChats = allowedChatsService.getAllowedChats()
    allowedChats.forEach((id: number | string) => ids.add(String(id)))

    return Array.from(ids)
  }

  private async sendWithRetry(
    provider: BaseNotificationProvider,
    message: string,
    target: string,
    attempt = 1,
  ): Promise<void> {
    if (!target) {
      logger.error({
        msg: `${LOG_MESSAGES.CRITICAL_FAILURE} ${provider.providerName}: recipient not configured`,
      })
      return
    }

    const result = await provider.send(target, message)

    if (!result.success && attempt < this.maxRetries) {
      const delay = calculateRetryDelay(attempt)
      logger.warn(
        `${LOG_MESSAGES.RETRY_ATTEMPT} ${provider.providerName} не впорався (${target}). Спроба ${attempt}/${this.maxRetries} через ${delay}ms`,
      )

      await new Promise((resolve) => {
        setTimeout(resolve, delay)
      })
      return this.sendWithRetry(provider, message, target, attempt + 1)
    }

    if (!result.success) {
      logger.error({
        msg: `${LOG_MESSAGES.CRITICAL_FAILURE} ${provider.providerName} після ${this.maxRetries} спроб (${target})`,
      })
    }
  }
}
