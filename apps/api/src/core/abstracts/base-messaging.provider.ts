import { type NotificationProvider } from '@/constants/enums/notification-provider.enum'
import type { IMessagePayload } from '@/interfaces/messaging/message-payload.interface'
import type { IMessagingConfig } from '@/interfaces/messaging/messaging-config.interface'
import type { INotificationResult } from '@/interfaces/notification/notification-result.interface'

export abstract class BaseMessagingProvider {
  protected readonly config: IMessagingConfig
  protected readonly providerName: NotificationProvider

  constructor(config: IMessagingConfig, providerName: NotificationProvider) {
    this.config = config
    this.providerName = providerName
  }

  /**
   * Відправити повідомлення
   */
  public abstract send(payload: IMessagePayload): Promise<INotificationResult>

  /**
   * Побудувати URL для API запиту
   */
  protected abstract buildRequestUrl(method: string): string

  /**
   * Побудувати тіло запиту
   */
  protected abstract buildRequestBody(payload: IMessagePayload): Record<string, unknown>

  /**
   * Форматування логів
   */
  protected formatLog(message: string): string {
    return `[${this.providerName.toUpperCase()}] ${message}`
  }
}
