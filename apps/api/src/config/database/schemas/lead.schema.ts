import { LEAD_COLUMNS, TABLE_NAMES } from '@/constants/database'
import { SqlColumnType } from '@/constants/database/sql-column-types.enum'
import type { IDatabaseSchema } from '@/interfaces/database/database-schema.interface'

export const LEAD_TABLE_SCHEMA: IDatabaseSchema = {
  tableName: TABLE_NAMES.LEADS,
  columns: {
    [LEAD_COLUMNS.ID]: SqlColumnType.INTEGER,
    [LEAD_COLUMNS.NAME]: SqlColumnType.TEXT,
    [LEAD_COLUMNS.PHONE]: SqlColumnType.TEXT,
    [LEAD_COLUMNS.DISTRICT]: SqlColumnType.TEXT,
    [LEAD_COLUMNS.SERVICES]: SqlColumnType.TEXT,
    [LEAD_COLUMNS.SOURCE]: SqlColumnType.TEXT,
    [LEAD_COLUMNS.TIMESTAMP]: SqlColumnType.TIMESTAMP,
  },
  primaryKey: LEAD_COLUMNS.ID,
  indexes: [LEAD_COLUMNS.TIMESTAMP],
  optionalColumns: [LEAD_COLUMNS.SOURCE], // source є optional
}
