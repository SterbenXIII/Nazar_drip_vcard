import { createTransport } from 'nodemailer'

import { getEmailTransportConfig } from '@/config/email.config'
import { ENV } from '@/config/env.config'
import { logger } from '@/config/logger'
import { EmailSubjects } from '@/constants/email/email-subjects.const'
import { NotificationProvider } from '@/constants/enums/notification-provider.enum'
import { ERROR_MESSAGES, LOG_MESSAGES } from '@/constants/messages'
import { BaseNotificationProvider } from '@/core/abstracts/base-notification.provider'
import { type INotificationResult } from '@/interfaces/notification/notification-result.interface'

export class EmailProvider extends BaseNotificationProvider {
  protected readonly name = NotificationProvider.EMAIL
  private readonly transporter: ReturnType<typeof createTransport>
  constructor() {
    super()
    this.transporter = createTransport(getEmailTransportConfig())
  }

  public async send(recipient: string, content: string): Promise<INotificationResult> {
    try {
      await this.transporter.sendMail({
        from: ENV.SMTP_USER,
        to: recipient,
        subject: EmailSubjects.NEW_LEAD,
        html: content,
      })

      return { success: true, provider: this.name }
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(this.formatLog(`${LOG_MESSAGES.MESSAGE_SEND_FAILED} ${error.message}`))
        return { success: false, provider: this.name, error: error.message }
      }
      logger.error(
        this.formatLog(`${LOG_MESSAGES.MESSAGE_SEND_FAILED} ${ERROR_MESSAGES.UNKNOWN_ERROR}`),
      )
      return { success: false, provider: this.name, error: ERROR_MESSAGES.UNKNOWN_ERROR }
    }
  }
}
