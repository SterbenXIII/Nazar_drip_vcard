import { SqlOrderDirection } from '@/constants/database/sql-order-direction.enum'
import type { IDatabaseSchema } from '@/interfaces/database/database-schema.interface'

export class SqlBuilder {
  /**
   * Генерує SQL для створення таблиці на основі схеми
   */
  public static createTable(schema: IDatabaseSchema): string {
    const { tableName, columns, primaryKey, optionalColumns = [] } = schema

    const columnDefs = Object.entries(columns)
      .map(([name, type]) => {
        const def = `${name} ${type}`
        if (name === primaryKey) {
          return `${def} PRIMARY KEY AUTOINCREMENT`
        }
        // Якщо колонка в optionalColumns - без NOT NULL
        if (optionalColumns.includes(name)) {
          return def
        }
        return `${def} NOT NULL`
      })
      .join(',\n      ')

    return `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columnDefs}
      )
    `.trim()
  }

  /**
   * Генерує SQL для INSERT
   */
  public static insert(tableName: string, columns: string[]): string {
    const placeholders = columns.map(() => '?').join(', ')
    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
  }

  /**
   * Генерує SQL для SELECT всіх записів
   */
  public static selectAll(
    tableName: string,
    orderBy?: string,
    orderDirection: SqlOrderDirection = SqlOrderDirection.DESC,
  ): string {
    const order = orderBy ? ` ORDER BY ${orderBy} ${orderDirection}` : ''
    return `SELECT * FROM ${tableName}${order}`
  }

  /**
   * Генерує SQL для SELECT за ID
   */
  public static selectById(tableName: string, primaryKey: string): string {
    return `SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`
  }

  /**
   * Генерує SQL для DELETE за ID
   */
  public static deleteById(tableName: string, primaryKey: string): string {
    return `DELETE FROM ${tableName} WHERE ${primaryKey} = ?`
  }

  /**
   * Генерує SQL для UPDATE
   */
  public static update(tableName: string, columns: string[], primaryKey: string): string {
    const setClause = columns.map((col) => `${col} = ?`).join(', ')
    return `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKey} = ?`
  }
}
