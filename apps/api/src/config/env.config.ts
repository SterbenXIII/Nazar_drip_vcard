import 'dotenv/config'

import { z } from 'zod'

import { NODE_ENV, NotificationProvider } from '@/constants'

const optionalEmail = z.email().optional().or(z.literal(''))
const optionalString = z.string().optional().or(z.literal(''))
const optionalNumber = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((val) => (val === '' || val === undefined ? undefined : Number(val)))

export const envSchema = z
  .object({
    // Core
    NODE_ENV: z.enum(NODE_ENV).default(NODE_ENV.DEVELOPMENT),
    BACKEND_PORT: z.string().default('5678').transform(Number),
    DOMAIN_NAME: z.string().default('localhost'),

    // Telegram
    TELEGRAM_BOT_TOKEN: optionalString,
    TELEGRAM_MASTER_ID: optionalNumber,
    // Additional chat IDs to receive lead notifications (comma-separated)
    TELEGRAM_NOTIFY_IDS: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((val) =>
        val
          ? val
              .split(',')
              .map((id) => id.trim())
              .filter(Boolean)
          : [],
      ),

    // Email (базовий SMTP)
    SMTP_USER: optionalEmail,
    SMTP_HOST: optionalString,
    SMTP_PORT: optionalNumber,
    SMTP_PASS: optionalString,

    // Email (Gmail OAuth2)
    GMAIL_CLIENT_ID: optionalString,
    GMAIL_CLIENT_SECRET: optionalString,
    GMAIL_REFRESH_TOKEN: optionalString,

    // Notification
    ADMIN_EMAIL: optionalEmail,
    ENABLED_PROVIDERS: z
      .string()
      .default('TELEGRAM,EMAIL')
      .transform((val) => val.split(',').map((p) => p.trim()))
      .pipe(z.array(z.enum(NotificationProvider))),
    WEBHOOK_SECRET: optionalString,
    TURNSTILE_SECRET_KEY: optionalString,
  })
  .superRefine((env, context) => {
    const isConfigured = (value: string | undefined): value is string => Boolean(value)

    if (env.ENABLED_PROVIDERS.includes(NotificationProvider.TELEGRAM)) {
      if (!isConfigured(env.TELEGRAM_BOT_TOKEN)) {
        context.addIssue({
          code: 'custom',
          message: 'TELEGRAM_BOT_TOKEN is required when TELEGRAM is enabled',
          path: ['TELEGRAM_BOT_TOKEN'],
        })
      }
    }

    if (env.ENABLED_PROVIDERS.includes(NotificationProvider.EMAIL)) {
      if (!isConfigured(env.ADMIN_EMAIL)) {
        context.addIssue({
          code: 'custom',
          message: 'ADMIN_EMAIL is required when EMAIL is enabled',
          path: ['ADMIN_EMAIL'],
        })
      }

      const gmailConfigured =
        isConfigured(env.GMAIL_CLIENT_ID) &&
        isConfigured(env.GMAIL_CLIENT_SECRET) &&
        isConfigured(env.GMAIL_REFRESH_TOKEN) &&
        isConfigured(env.SMTP_USER)
      const smtpConfigured =
        isConfigured(env.SMTP_HOST) && isConfigured(env.SMTP_PASS) && isConfigured(env.SMTP_USER)

      if (!gmailConfigured && !smtpConfigured) {
        context.addIssue({
          code: 'custom',
          message:
            'EMAIL requires SMTP_USER, SMTP_HOST, SMTP_PASS or complete Gmail OAuth2 configuration',
          path: ['ENABLED_PROVIDERS'],
        })
      }
    }
  })

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(z.treeifyError(parsed.error))
  process.exit(1)
}

export const ENV = parsed.data
