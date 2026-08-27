import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'

import { ENV } from '@/config/env.config'
import { logger as pinoLogger } from '@/config/logger'
import { API_ROUTES } from '@/constants/routes/api-routes.const'
import { telegramAuth } from '@/middleware/auth'
import leadRoutes from '@/routes/lead.routes'
import { DatabaseService } from '@/services/database.service'

type Bindings = {
  TURNSTILE_SECRET_KEY?: string
}

type Variables = {
  requestId: string
  pinoLogger: typeof pinoLogger
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Middleware
app.use('*', requestId())
app.use('*', async (c, next) => {
  c.set('pinoLogger', pinoLogger)
  await next()
})
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  pinoLogger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: `${duration}ms`,
    requestId: c.get('requestId'),
  })
})

app.use(
  '/api/*',
  cors({
    origin: ENV.DOMAIN_NAME
      ? [`https://${ENV.DOMAIN_NAME}`, `http://localhost:${ENV.BACKEND_PORT}`]
      : '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Bot-Api-Secret-Token'],
  }),
)

app.use(
  '*',
  bodyLimit({
    maxSize: 10 * 1024, // 10KB
    onError: (c) => c.text('Payload too large', 413),
  }),
)

// Health check — used by Docker HEALTHCHECK + CI/CD smoke tests
app.get('/api/health', async (c) => {
  try {
    const db = await DatabaseService.getInstance().getProvider()
    db.query('SELECT 1')
    return c.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
      requestId: c.get('requestId'),
    })
  } catch (_error) {
    pinoLogger.error({
      msg: '❌ Health check failed',
      error: _error,
      requestId: c.get('requestId'),
    })

    return c.json(
      {
        status: 'error',
        db: 'disconnected',
        timestamp: new Date().toISOString(),
        requestId: c.get('requestId'),
      },
      503,
    )
  }
})

// Rate limit for lead submissions
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 5

app.use(`/api${API_ROUTES.LEAD_SUBMIT}`, async (c, next) => {
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'anon'
  const now = Date.now()
  const timestamps = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW)

  if (timestamps.length >= MAX_REQUESTS) {
    pinoLogger.warn({ msg: 'Rate limit exceeded', ip, requestId: c.get('requestId') })
    return c.json({ error: 'Too many requests' }, 429)
  }

  timestamps.push(now)
  rateLimitMap.set(ip, timestamps)

  // Periodic cleanup to prevent unbounded growth (every 1000 IPs)
  if (rateLimitMap.size > 1000) {
    for (const [key, ts] of rateLimitMap) {
      if (ts.every((t) => now - t > RATE_LIMIT_WINDOW)) {
        rateLimitMap.delete(key)
      }
    }
  }

  await next()
})

app.route(`/api${API_ROUTES.LEAD_SUBMIT}`, leadRoutes)

// Telegram Webhook — check secret BEFORE parsing body/auth
app.post(
  API_ROUTES.TELEGRAM_WEBHOOK,
  async (c, next) => {
    if (ENV.WEBHOOK_SECRET) {
      const incoming = c.req.header('X-Telegram-Bot-Api-Secret-Token')
      if (incoming !== ENV.WEBHOOK_SECRET) {
        pinoLogger.error({ msg: 'Unauthorized webhook secret', requestId: c.get('requestId') })
        return c.json({ error: 'Unauthorized' }, 401)
      }
    }
    await next()
  },
  telegramAuth,
  async (c) => {
    const update = await c.req.json()
    pinoLogger.info({
      msg: 'Update received',
      updateId: update.update_id,
      requestId: c.get('requestId'),
    })
    return c.json({ status: 'ok' })
  },
)

export default app
