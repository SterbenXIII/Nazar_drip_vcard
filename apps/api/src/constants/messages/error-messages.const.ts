export const ERROR_MESSAGES = {
  // HTTP/API errors
  NO_USER_ID: 'No user ID found',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  UNKNOWN_ERROR: 'Unknown error',

  // Provider errors
  TELEGRAM_API_ERROR: 'Telegram API error:',
  EMAIL_SEND_FAILED: 'Failed to send email:',

  // Validation errors
  INVALID_LEAD_DATA: 'Invalid lead data',
  MISSING_REQUIRED_FIELDS: 'Missing required fields',
  TURNSTILE_VERIFICATION_FAILED: 'Помилка перевірки безпеки (бот)',
  LEAD_PROCESSING_ERROR: 'Помилка при обробці заявки:',
} as const

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES]
