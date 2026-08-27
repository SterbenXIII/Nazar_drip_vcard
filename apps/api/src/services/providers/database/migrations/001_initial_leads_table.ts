import { LEAD_TABLE_SCHEMA } from '@/config/database/schemas/lead.schema'
import { SqlBuilder } from '@/core/utils/sql-builder.util'

import type { IMigration } from '../migration.service'

export const initialMigration: IMigration = {
  name: '001_initial_leads_table',
  up: async (db) => {
    const query = SqlBuilder.createTable(LEAD_TABLE_SCHEMA)
    await db.execute(query)
  },
}
