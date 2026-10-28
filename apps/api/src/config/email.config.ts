import type { TransportOptions } from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

import { ENV } from '@/config/env.config'
import { EmailService } from '@/constants/email/email-service.enum'
import { AuthType } from '@/constants/enums/auth-type.enum'

export type EmailTransportConfig = TransportOptions | SMTPTransport.Options
const SMTP_TIMEOUT_MS = 30_000

export const getEmailTransportConfig = (): EmailTransportConfig => {
  if (ENV.GMAIL_REFRESH_TOKEN) {
    return {
      service: EmailService.GMAIL,
      auth: {
        type: AuthType.OAUTH2,
        user: ENV.SMTP_USER,
        clientId: ENV.GMAIL_CLIENT_ID,
        clientSecret: ENV.GMAIL_CLIENT_SECRET,
        refreshToken: ENV.GMAIL_REFRESH_TOKEN,
      },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    }
  }

  const port = ENV.SMTP_PORT ?? 465

  return {
    host: ENV.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS,
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  }
}
