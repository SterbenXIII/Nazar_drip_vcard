export const LEAD_COLUMNS = {
  ID: 'id',
  NAME: 'name',
  PHONE: 'phone',
  DISTRICT: 'district',
  SERVICES: 'services',
  SOURCE: 'source',
  TIMESTAMP: 'timestamp',
} as const

export type LeadColumn = (typeof LEAD_COLUMNS)[keyof typeof LEAD_COLUMNS]

export const NOTIFICATION_OUTBOX_COLUMNS = {
  ID: 'id',
  LEAD_ID: 'lead_id',
  PROVIDER: 'provider',
  RECIPIENT: 'recipient',
  STATUS: 'status',
  ATTEMPT_COUNT: 'attempt_count',
  NEXT_ATTEMPT_AT: 'next_attempt_at',
  LAST_ERROR: 'last_error',
  CREATED_AT: 'created_at',
  DELIVERED_AT: 'delivered_at',
} as const

export type NotificationOutboxColumn =
  (typeof NOTIFICATION_OUTBOX_COLUMNS)[keyof typeof NOTIFICATION_OUTBOX_COLUMNS]
