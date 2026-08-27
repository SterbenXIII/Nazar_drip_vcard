import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

import { logger } from '@/config/logger'
import { FILE_PATHS } from '@/constants/config/file-paths.const'
import { LOG_MESSAGES } from '@/constants/messages/log-messages.const'

export class AllowedChatsService {
  private static instance: AllowedChatsService
  private allowedChatsCache: number[] = []

  private constructor() {
    this.loadAllowedChatsSync()
  }

  public static getInstance(): AllowedChatsService {
    if (!AllowedChatsService.instance) {
      AllowedChatsService.instance = new AllowedChatsService()
    }
    return AllowedChatsService.instance
  }

  private loadAllowedChatsSync(): void {
    try {
      const data = readFileSync(FILE_PATHS.ALLOWED_CHATS, 'utf-8')
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) {
        this.allowedChatsCache = parsed.map(Number).filter((id) => !Number.isNaN(id))
        logger.debug({
          msg: '✅ Allowed chats loaded synchronously',
          count: this.allowedChatsCache.length,
        })
      }
    } catch (error) {
      logger.error({ msg: LOG_MESSAGES.AUTH_FILE_READ_ERROR, error })
      this.allowedChatsCache = []
    }
  }

  public async refreshAllowedChats(): Promise<void> {
    try {
      const data = await readFile(FILE_PATHS.ALLOWED_CHATS, 'utf-8')
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) {
        this.allowedChatsCache = parsed.map(Number).filter((id) => !Number.isNaN(id))
      } else {
        logger.warn('Allowed chats file is not an array')
        this.allowedChatsCache = []
      }
    } catch (error) {
      logger.error({ msg: LOG_MESSAGES.AUTH_FILE_READ_ERROR, error })
      this.allowedChatsCache = []
    }
  }

  public getAllowedChats(): number[] {
    return this.allowedChatsCache
  }

  public isAllowed(chatId: number): boolean {
    return this.allowedChatsCache.includes(chatId)
  }
}
