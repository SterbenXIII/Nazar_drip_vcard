import { logger } from '@/config/logger'
import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { ContentType } from '@/constants/http/content-type.enum'
import { HttpMethod } from '@/constants/http/http-method.enum'
import { ERROR_MESSAGES, LOG_MESSAGES } from '@/constants/messages'
import { TelegramParseMode } from '@/constants/telegram/parse-mode.enum'
import { getTelegramBotUrl, TelegramMethods } from '@/constants/telegram/telegram-api.const'
import { BaseMessagingProvider } from '@/core/abstracts/base-messaging.provider'
import type { IMessagePayload } from '@/interfaces/messaging/message-payload.interface'
import type { IMessagingConfig } from '@/interfaces/messaging/messaging-config.interface'
import type { INotificationResult } from '@/interfaces/notification/notification-result.interface'

export class TelegramMessagingProvider extends BaseMessagingProvider {
  constructor(config: IMessagingConfig) {
    super(config, NotificationProvider.TELEGRAM)
  }

  protected buildRequestUrl(method: string): string {
    return getTelegramBotUrl(
      this.config.token,
      method as (typeof TelegramMethods)[keyof typeof TelegramMethods],
    )
  }

  protected buildRequestBody(payload: IMessagePayload): Record<string, unknown> {
    return {
      chat_id: payload.recipient,
      text: payload.content,
      parse_mode: payload.parseMode || TelegramParseMode.HTML,
      ...payload.additionalOptions,
    }
  }

  public async send(payload: IMessagePayload): Promise<INotificationResult> {
    try {
      const url = this.buildRequestUrl(TelegramMethods.SEND_MESSAGE)

      const response = await fetch(url, {
        method: HttpMethod.POST,
        headers: { 'Content-Type': ContentType.JSON },
        body: JSON.stringify(this.buildRequestBody(payload)),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`${ERROR_MESSAGES.TELEGRAM_API_ERROR} ${errorText}`)
      }

      logger.info(this.formatLog(`${LOG_MESSAGES.MESSAGE_SENT} ${payload.recipient}`))
      return { success: true, provider: this.providerName }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR
      logger.error(this.formatLog(`${LOG_MESSAGES.MESSAGE_SEND_FAILED} ${errorMessage}`))
      return { success: false, provider: this.providerName, error: errorMessage }
    }
  }
}
