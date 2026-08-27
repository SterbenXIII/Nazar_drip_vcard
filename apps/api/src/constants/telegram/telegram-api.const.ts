export const TELEGRAM_API_BASE = 'https://api.telegram.org'

export const getTelegramBotUrl = (token: string, method: string): string => {
  return `${TELEGRAM_API_BASE}/bot${token}/${method}`
}

export const TelegramMethods = {
  SEND_MESSAGE: 'sendMessage',
  SEND_DOCUMENT: 'sendDocument',
  GET_UPDATES: 'getUpdates',
} as const

export type TelegramMethod = (typeof TelegramMethods)[keyof typeof TelegramMethods]
