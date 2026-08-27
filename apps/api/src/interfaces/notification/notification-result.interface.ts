import { type NotificationProvider } from '@/constants/enums/notification-provider.enum'

export interface INotificationResult {
  success: boolean
  provider: NotificationProvider
  messageId?: string
  error?: string
}
