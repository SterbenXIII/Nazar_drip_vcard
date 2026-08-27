export const TABLE_NAMES = {
  LEADS: 'leads',
} as const

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES]
