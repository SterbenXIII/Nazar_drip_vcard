import type { TransportOptions } from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

import { ENV } from '@/config/env.config'
import { EmailService } from '@/constants/email/email-service.enum'
import { AuthType } from '@/constants/enums/auth-type.enum'

export type EmailTransportConfig = TransportOptions | SMTPTransport.Options

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
    }
  }

  return {
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT ?? 465,
    secure: true,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS,
    },
  }
}
