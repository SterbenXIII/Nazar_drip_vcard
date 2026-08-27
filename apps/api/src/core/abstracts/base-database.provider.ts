import { logger } from '@/config/logger'
import type { IDatabaseConfig } from '@/interfaces/database/database-config.interface'
import type { IDatabaseSchema } from '@/interfaces/database/database-schema.interface'
import type { IQueryResult } from '@/interfaces/database/query-result.interface'

export abstract class BaseDatabaseProvider {
  protected readonly config: IDatabaseConfig
  protected readonly schema: IDatabaseSchema
  private isInitialized = false

  constructor(config: IDatabaseConfig, schema: IDatabaseSchema) {
    this.config = config
    this.schema = schema
  }

  /**
   * Ініціалізація з'єднання з базою даних та створення таблиць
   * КРИТИЧНО: Викликати явно після створення instance!
   */
  public initialize(): void {
    if (this.isInitialized) {
      return
    }
    logger.debug(this.formatLog('Initializing...'))
    this.init()
    this.isInitialized = true
    logger.debug(this.formatLog('Initialized'))
  }

  /**
   * Внутрішня ініціалізація (викликається через initialize())
   */
  protected abstract init(): void

  /**
   * Виконання SQL команди (INSERT, UPDATE, DELETE)
   * @returns Результат з affectedRows та insertId
   */
  public abstract execute<T = unknown>(query: string, params?: unknown[]): Promise<IQueryResult<T>>

  /**
   * Виконання SQL запиту (SELECT)
   * @returns Масив записів
   */
  public abstract query<T = unknown>(query: string, params?: unknown[]): Promise<T[]>

  /**
   * Закриття з'єднання з базою даних
   */
  public abstract close(): Promise<void>

  /**
   * Форматування логів
   */
  protected formatLog(message: string): string {
    return `[${this.config.type.toUpperCase()}] ${message}`
  }
}
