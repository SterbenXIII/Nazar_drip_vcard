import type { NotificationProvider } from '@/constants/enums/notification-provider.enum'

export type NotificationOutboxStatus =
  'pending' | 'processing' | 'delivered' | 'failed' | 'cancelled'

export type QueuedNotification = {
  provider: NotificationProvider
  recipient: string
}

export type NotificationOutboxRecord = {
  id: number
  leadId: number
  provider: NotificationProvider
  recipient: string
  status: NotificationOutboxStatus
  attemptCount: number
  nextAttemptAt: number
  lastError: string | null
}
