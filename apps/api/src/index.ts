import 'dotenv/config'

import { serve } from '@hono/node-server'

import app from '@/app'
import { ENV } from '@/config/env.config'
import { logger } from '@/config/logger'
import { DatabaseService } from '@/services/database.service'

const port = ENV.BACKEND_PORT

try {
  logger.info('🔧 Initializing database...')
  await DatabaseService.initializeOnStartup()
  logger.info('✅ Database ready')
} catch (error) {
  logger.error({ msg: '❌ Failed to initialize database', error })
  logger.error('   Server cannot start without database connection')
  process.exit(1)
}

logger.info({
  msg: '🚀 Backend refactored & running!',
  port,
  mode: ENV.NODE_ENV,
})

const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })

// Handle graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`[Server] ${signal} received. Shutting down gracefully...`)
  server.close(async () => {
    logger.info('[Server] HTTP server closed.')
    try {
      const db = await DatabaseService.getInstance().getProvider()
      await db.close()
      logger.info('✅ Database connection closed.')
    } catch (error) {
      logger.error({ msg: '❌ Error during database shutdown', error })
    }
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
