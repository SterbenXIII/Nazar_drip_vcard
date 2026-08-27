import { type NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { type BaseNotificationProvider } from '@/core/abstracts/base-notification.provider'

export type NotificationRegistry = {
  [key in NotificationProvider]?: BaseNotificationProvider
}
