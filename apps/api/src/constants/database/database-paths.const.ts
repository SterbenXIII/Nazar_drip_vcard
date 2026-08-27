export const DATABASE_PATHS = {
  DATA_DIR: 'data',
  LEADS_DB: 'data/leads.db',
} as const

export type DatabasePath = (typeof DATABASE_PATHS)[keyof typeof DATABASE_PATHS]
