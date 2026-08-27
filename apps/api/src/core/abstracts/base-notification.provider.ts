import { type NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { type INotificationResult } from '@/interfaces/notification/notification-result.interface'

export abstract class BaseNotificationProvider {
  protected abstract readonly name: NotificationProvider

  public get providerName(): NotificationProvider {
    return this.name
  }

  // Контракт для всіх провайдерів
  public abstract send(recipient: string, content: string): Promise<INotificationResult>

  protected formatLog(msg: string): string {
    return `[${this.name}] ${new Date().toISOString()}: ${msg}`
  }
}
