import DatabaseConstructor from 'better-sqlite3'

import { LEAD_TABLE_SCHEMA } from '@/config/database/schemas/lead.schema'
import { findMissingSchemaRequirements } from '@/utils/database-schema.util'

type TableInfo = {
  name: string
  pk: number
}

const databasePath = process.argv[2]
if (!databasePath) {
  console.error('Usage: check-database-schema <sqlite-file>')
  process.exit(2)
}

const database = new DatabaseConstructor(databasePath, { fileMustExist: true, readonly: true })
try {
  const tableName = LEAD_TABLE_SCHEMA.tableName.replaceAll('"', '""')
  const columns = database.pragma(`table_info("${tableName}")`) as TableInfo[]
  const missing = findMissingSchemaRequirements(
    LEAD_TABLE_SCHEMA,
    new Set(columns.map((column) => column.name)),
    new Set(columns.filter((column) => column.pk > 0).map((column) => column.name)),
  )

  if (missing.length > 0) {
    console.error(
      `Database schema is missing required columns or primary keys: ${missing.join(', ')}`,
    )
    process.exitCode = 1
  } else {
    console.log(
      `Database schema is compatible with ${LEAD_TABLE_SCHEMA.tableName} (${Object.keys(LEAD_TABLE_SCHEMA.columns).length} columns)`,
    )
  }
} finally {
  database.close()
}
