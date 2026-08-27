import { zValidator } from '@hono/zod-validator'
import { leadSchema } from '@vcard/shared'
import { Hono } from 'hono'
import { env } from 'hono/adapter'

import { logger as pinoLogger } from '@/config/logger'
import { HttpStatus } from '@/constants/http/http-status.enum'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/constants/messages'
import { NotificationCoordinator } from '@/services/coordinators/notification.coordinator'
import { verifyTurnstileToken } from '@/utils/turnstile.util'

const HEADER_CF_CONNECTING_IP = 'CF-Connecting-IP'
const HEADER_X_FORWARDED_FOR = 'x-forwarded-for'

type Bindings = {
  TURNSTILE_SECRET_KEY?: string
}

type Variables = {
  requestId: string
  pinoLogger: typeof pinoLogger
}

const leadRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
const coordinator = new NotificationCoordinator()

leadRoutes.post('/', zValidator('json', leadSchema), async (context) => {
  const validatedData = context.req.valid('json')
  const { TURNSTILE_SECRET_KEY } = env<Bindings>(context as any)

  // Turnstile is optional: verify only if key is provided
  if (TURNSTILE_SECRET_KEY) {
    const ip =
      context.req.header(HEADER_CF_CONNECTING_IP) || context.req.header(HEADER_X_FORWARDED_FOR)

    const verification = await verifyTurnstileToken(
      TURNSTILE_SECRET_KEY,
      validatedData.turnstileToken || '',
      ip,
    )

    if (!verification.success) {
      return context.json({ success: false, error: verification.error }, HttpStatus.BAD_REQUEST)
    }
  }

  try {
    await coordinator.handleIncomingLead({
      ...validatedData,
      timestamp: new Date(),
    })

    return context.json(
      {
        success: true,
        message: SUCCESS_MESSAGES.LEAD_RECEIVED,
      },
      HttpStatus.CREATED,
    )
  } catch (error: unknown) {
    const logger = context.get('pinoLogger') || pinoLogger // Fallback if middleware not set
    logger.error({
      msg: ERROR_MESSAGES.LEAD_PROCESSING_ERROR,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId: context.get('requestId'),
    })

    return context.json(
      {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
  }
})

export default leadRoutes
