import { describe, expect, it } from 'vitest'

import { LEAD_TABLE_SCHEMA } from '@/config/database/schemas/lead.schema'
import { findMissingSchemaRequirements } from '@/utils/database-schema.util'

describe('findMissingSchemaRequirements', () => {
  it('accepts the lead schema and extra forward-compatible columns', () => {
    const actualColumns = new Set([...Object.keys(LEAD_TABLE_SCHEMA.columns), 'future_column'])

    expect(
      findMissingSchemaRequirements(LEAD_TABLE_SCHEMA, actualColumns, new Set(['id'])),
    ).toEqual([])
  })

  it('rejects missing columns and a missing primary key', () => {
    expect(
      findMissingSchemaRequirements(LEAD_TABLE_SCHEMA, new Set(['name', 'phone']), new Set()),
    ).toEqual(['id', 'district', 'services', 'source', 'timestamp', 'id primary key'])
  })
})
