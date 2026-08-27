import type { BaseMessagingProvider } from '@/core/abstracts/base-messaging.provider'
import type { IMessagingConfig } from '@/interfaces/messaging/messaging-config.interface'
import { TelegramMessagingProvider } from '@/services/providers/messaging/telegram-messaging.provider'

export type MessagingProviderType = 'telegram' | 'discord' | 'slack' | 'whatsapp'

export class MessagingFactory {
  /**
   * Створює messaging provider на основі типу та конфігурації
   */
  public static create(
    type: MessagingProviderType,
    config: IMessagingConfig,
  ): BaseMessagingProvider {
    switch (type) {
      case 'telegram':
        return new TelegramMessagingProvider(config)

      // Готово для розширення:
      // case 'discord':
      //   return new DiscordMessagingProvider(config)
      // case 'slack':
      //   return new SlackMessagingProvider(config)
      // case 'whatsapp':
      //   return new WhatsAppMessagingProvider(config)

      default:
        throw new Error(`[MessagingFactory] Unsupported messaging provider: ${type}`)
    }
  }
}
