import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { BaseNotificationProvider } from '@/core/abstracts/base-notification.provider'
import type { IMessagingConfig } from '@/interfaces/messaging/messaging-config.interface'
import type { INotificationResult } from '@/interfaces/notification/notification-result.interface'
import { TelegramMessagingProvider } from '@/services/providers/messaging/telegram-messaging.provider'

/**
 * Адаптер між BaseNotificationProvider (старий API) та TelegramMessagingProvider (новий API)
 * Зберігає сумісність з NotificationFactory та NotificationCoordinator
 */
export class TelegramNotificationProvider extends BaseNotificationProvider {
  protected readonly name = NotificationProvider.TELEGRAM
  private readonly messagingProvider: TelegramMessagingProvider

  constructor(config: IMessagingConfig) {
    super()
    this.messagingProvider = new TelegramMessagingProvider(config)
  }

  public async send(recipient: string, content: string): Promise<INotificationResult> {
    return this.messagingProvider.send({
      recipient,
      content,
    })
  }
}
