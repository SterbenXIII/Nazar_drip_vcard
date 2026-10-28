import { ENV } from '@/config/env.config'
import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { AllowedChatsService } from '@/services/config/allowed-chats.service'

export class NotificationRecipientsService {
  public async getFor(providerName: NotificationProvider): Promise<string[]> {
    if (providerName === NotificationProvider.TELEGRAM) {
      const allowedChatsService = AllowedChatsService.getInstance()
      await allowedChatsService.refreshAllowedChats()
      const ids = new Set<string>()
      if (ENV.TELEGRAM_MASTER_ID != null) ids.add(String(ENV.TELEGRAM_MASTER_ID))
      for (const id of ENV.TELEGRAM_NOTIFY_IDS) ids.add(id)
      for (const id of allowedChatsService.getAllowedChats()) ids.add(String(id))
      return Array.from(ids)
    }
    return ENV.ADMIN_EMAIL ? [ENV.ADMIN_EMAIL] : []
  }
}
