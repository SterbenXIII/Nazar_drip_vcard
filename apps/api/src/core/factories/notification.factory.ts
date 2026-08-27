import { ENV } from '@/config/env.config'
import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { TELEGRAM_API_BASE } from '@/constants/telegram/telegram-api.const'
import { type BaseNotificationProvider } from '@/core/abstracts/base-notification.provider'
import { EmailProvider } from '@/services/providers/email.provider'
import { TelegramNotificationProvider } from '@/services/providers/notification/telegram-notification.provider'
import { type NotificationRegistry } from '@/types/notification/notification-registry.type'

export class NotificationFactory {
  private static readonly registry: Partial<NotificationRegistry> = {}

  private static createProvider(type: NotificationProvider): BaseNotificationProvider {
    switch (type) {
      case NotificationProvider.TELEGRAM: {
        if (!ENV.TELEGRAM_BOT_TOKEN) {
          throw new Error('[NotificationFactory] TELEGRAM_BOT_TOKEN is not set')
        }
        return new TelegramNotificationProvider({
          apiBaseUrl: TELEGRAM_API_BASE,
          token: ENV.TELEGRAM_BOT_TOKEN,
        })
      }
      case NotificationProvider.EMAIL:
        return new EmailProvider()
      default:
        throw new Error(`[NotificationFactory] Провайдер ${type} не реалізований.`)
    }
  }

  /**
   * Отримує провайдер за типом (lazy singleton).
   */
  public static getProvider(type: NotificationProvider): BaseNotificationProvider {
    this.registry[type] ??= this.createProvider(type)

    return this.registry[type]
  }

  /**
   * Повертає список провайдерів, які вказані в налаштуваннях як активні
   */
  public static getEnabledProviders(): BaseNotificationProvider[] {
    // Наприклад, у .env ми маємо: ENABLED_PROVIDERS=TELEGRAM,EMAIL
    const enabled = ENV.ENABLED_PROVIDERS as NotificationProvider[]

    return enabled
      .filter((type) => Object.values(NotificationProvider).includes(type))
      .map((type) => this.getProvider(type))
  }
}
