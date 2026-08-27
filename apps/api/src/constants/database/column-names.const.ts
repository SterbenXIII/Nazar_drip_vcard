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
