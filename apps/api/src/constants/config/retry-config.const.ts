export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1000,
  EXPONENTIAL_BASE: 2,
} as const

/**
 * Обчислює затримку для експоненціального backoff
 * @param attempt Номер спроби (1-based)
 * @returns Затримка в мілісекундах
 */
export const calculateRetryDelay = (attempt: number): number => {
  return Math.pow(RETRY_CONFIG.EXPONENTIAL_BASE, attempt) * RETRY_CONFIG.BASE_DELAY_MS
}
