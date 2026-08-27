import pino from 'pino'

import { NODE_ENV } from '@/constants'

import { ENV } from './env.config'

const LOG_LEVELS = {
  DEVELOPMENT: 'debug',
  PRODUCTION: 'info',
} as const

const PINO_PRETTY_TARGET = 'pino-pretty'

export const logger = pino({
  level: ENV.NODE_ENV === NODE_ENV.DEVELOPMENT ? LOG_LEVELS.DEVELOPMENT : LOG_LEVELS.PRODUCTION,
  transport:
    ENV.NODE_ENV === NODE_ENV.DEVELOPMENT
      ? {
          target: PINO_PRETTY_TARGET,
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss Z',
          },
        }
      : undefined,
})
