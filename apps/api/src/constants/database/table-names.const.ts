export const TABLE_NAMES = {
  LEADS: 'leads',
  NOTIFICATION_OUTBOX: 'notification_outbox',
} as const

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES]
