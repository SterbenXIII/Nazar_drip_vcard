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

const envSchema = z.object({
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
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(z.treeifyError(parsed.error))
  process.exit(1)
}

export const ENV = parsed.data
