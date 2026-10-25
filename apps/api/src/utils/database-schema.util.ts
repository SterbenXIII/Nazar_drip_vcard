import type { IDatabaseSchema } from '@/interfaces/database/database-schema.interface'

export function findMissingSchemaRequirements(
  expected: IDatabaseSchema,
  actualColumns: ReadonlySet<string>,
  actualPrimaryKeys: ReadonlySet<string>,
): string[] {
  const missingColumns = Object.keys(expected.columns).filter(
    (column) => !actualColumns.has(column),
  )

  if (!actualPrimaryKeys.has(expected.primaryKey)) {
    missingColumns.push(`${expected.primaryKey} primary key`)
  }

  return missingColumns
}
