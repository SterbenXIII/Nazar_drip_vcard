import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

import DatabaseConstructor, { type Database } from 'better-sqlite3'

import { logger } from '@/config/logger'
import { FILE_PATHS } from '@/constants/config/file-paths.const'
import { LOG_MESSAGES } from '@/constants/messages/log-messages.const'
import { BaseDatabaseProvider } from '@/core/abstracts/base-database.provider'
import { SqlBuilder } from '@/core/utils/sql-builder.util'
import type { IDatabaseConfig } from '@/interfaces/database/database-config.interface'
import type { IDatabaseSchema } from '@/interfaces/database/database-schema.interface'
import type { IQueryResult } from '@/interfaces/database/query-result.interface'

export class SqliteDatabaseProvider extends BaseDatabaseProvider {
  private db!: Database
  private readonly maxRetries = 5
  private readonly baseDelayMs = 100 // exponential backoff base

  constructor(config: IDatabaseConfig, schema: IDatabaseSchema) {
    super(config, schema)
  }

  protected init(): void {
    try {
      const dataDir = FILE_PATHS.DATA_DIR
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true })
      }

      const dbPath = this.config.connectionString || join(dataDir, `${this.schema.tableName}.db`)
      logger.debug(this.formatLog(`Connecting to database: ${dbPath}`))

      // Спробуємо чітко присвоїти
      const db = new DatabaseConstructor(dbPath)
      this.db = db
      logger.info(this.formatLog(`Database connection established`))

      // Створення таблиці на основі схеми
      const createTableQuery = SqlBuilder.createTable(this.schema)
      this.db.exec(createTableQuery)

      // Enable WAL mode
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('synchronous = NORMAL')

      logger.info(this.formatLog(`${LOG_MESSAGES.DATABASE_INITIALIZED} ${dbPath}`))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error({
        msg: this.formatLog(`CRITICAL: Failed to initialize database: ${errorMsg}`),
        error,
      })
      throw error
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      return this.init()
    }
  }
  private async backoff(attempt: number): Promise<void> {
    const delay = this.baseDelayMs * Math.pow(2, attempt)
    return new Promise((res) => setTimeout(res, delay))
  }

  public async execute<T = unknown>(
    query: string,
    params: unknown[] = [],
  ): Promise<IQueryResult<T>> {
    await this.ensureInitialized()
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const stmt = this.db.prepare(query)
        const info = stmt.run(...params)

        return {
          rows: [],
          affectedRows: info.changes,
          insertId: info.lastInsertRowid as number,
        }
      } catch (error: unknown) {
        if (attempt < this.maxRetries - 1 && this.isTransientError(error)) {
          logger.warn(this.formatLog(`execute() retry ${attempt + 1} due to lock/busy`))
          await this.backoff(attempt)
          continue
        }
        logger.error({ msg: this.formatLog(`${LOG_MESSAGES.EXECUTE_FAILED} ${query}`), error })
        throw error
      }
    }
    // Should not reach here
    throw new Error('execute() failed after retries')
  }

  public async query<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
    await this.ensureInitialized()
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const stmt = this.db.prepare(query)
        const rows = params.length > 0 ? stmt.all(...params) : stmt.all()
        return rows as T[]
      } catch (error: unknown) {
        if (attempt < this.maxRetries - 1 && this.isTransientError(error)) {
          logger.warn(this.formatLog(`query() retry ${attempt + 1} due to lock/busy`))
          await this.backoff(attempt)
          continue
        }
        logger.error({ msg: this.formatLog(`${LOG_MESSAGES.QUERY_FAILED} ${query}`), error })
        throw error
      }
    }
    throw new Error('query() failed after retries')
  }

  private isTransientError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error)
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code: string }).code
        : undefined
    return code === 'SQLITE_BUSY' || /database is locked/i.test(msg)
  }

  public async close(): Promise<void> {
    try {
      if (this.db) {
        this.db.close()
        logger.info(this.formatLog(LOG_MESSAGES.CONNECTION_CLOSED))
      }
    } catch (err) {
      logger.warn({ msg: this.formatLog('close() encountered an error'), error: err })
    }
  }
}
