export const LOG_MESSAGES = {
  // Success messages
  LEAD_SAVED: '✅ Lead saved successfully',
  DATABASE_INITIALIZED: '✅ Database initialized at',
  CONNECTION_CLOSED: '🔒 Database connection closed',
  MESSAGE_SENT: '✅ Message sent to',

  // Error messages
  LEAD_SAVE_FAILED: '❌ Failed to save lead',
  LEAD_GET_FAILED: '❌ Failed to get leads',
  EXECUTE_FAILED: '❌ Execute failed:',
  QUERY_FAILED: '❌ Query failed:',
  MESSAGE_SEND_FAILED: '❌ Failed to send message:',

  // Warning messages
  RETRY_ATTEMPT: '[Retry] Провайдер',
  CRITICAL_FAILURE: '[CRITICAL] Не вдалося надіслати через',

  // Factory messages
  PROVIDER_NOT_REGISTERED: '[NotificationFactory] Провайдер',
  UNSUPPORTED_DATABASE: '[DatabaseFactory] Unsupported database type:',
  UNSUPPORTED_MESSAGING_PROVIDER: '[MessagingFactory] Unsupported messaging provider:',

  // Auth messages
  UNAUTHORIZED_ATTEMPT: '[AUTH] Спроба доступу від невідомого ID:',
  AUTH_FILE_READ_ERROR: '❌ Помилка читання allowed_chats.json:',
} as const

export type LogMessage = (typeof LOG_MESSAGES)[keyof typeof LOG_MESSAGES]
