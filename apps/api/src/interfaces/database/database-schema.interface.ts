import type { SqlColumnType } from '@/constants/database/sql-column-types.enum'

export interface IDatabaseSchema {
  tableName: string
  columns: Record<string, SqlColumnType>
  primaryKey: string
  indexes?: string[]
  optionalColumns?: string[] // Колонки без NOT NULL constraint
}
