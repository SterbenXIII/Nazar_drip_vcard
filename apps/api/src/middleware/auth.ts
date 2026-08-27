import { createMiddleware } from 'hono/factory'

import { ENV } from '@/config/env.config'
import { HttpStatus } from '@/constants/http/http-status.enum'
import { ERROR_MESSAGES, LOG_MESSAGES } from '@/constants/messages'
import { AllowedChatsService } from '@/services/config/allowed-chats.service'

export const telegramAuth = createMiddleware(async (c, next) => {
  const body = await c.req.json()

  // Витягуємо ID користувача з повідомлення або callback_query
  const userId = body.message?.from?.id || body.callback_query?.from?.id
  const masterId = ENV.TELEGRAM_MASTER_ID

  if (!userId) return c.json({ error: ERROR_MESSAGES.NO_USER_ID }, HttpStatus.BAD_REQUEST)

  // Перевірка: чи це ти (Master), чи хтось зі списку
  const allowedChatsService = AllowedChatsService.getInstance()
  const isAllowed = userId === masterId || allowedChatsService.isAllowed(userId)

  if (!isAllowed) {
    console.warn(`${LOG_MESSAGES.UNAUTHORIZED_ATTEMPT} ${userId}`)
    return c.json({ error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS }, HttpStatus.FORBIDDEN)
  }

  await next()
})
