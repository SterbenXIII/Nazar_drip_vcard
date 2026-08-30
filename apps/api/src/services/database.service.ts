import { LEAD_TABLE_SCHEMA } from '@/config/database/schemas/lead.schema'
import { logger } from '@/config/logger'
import { DATABASE_PATHS, DatabaseType } from '@/constants/database'
import type { BaseDatabaseProvider } from '@/core/abstracts/base-database.provider'
import { MigrationService } from '@/services/providers/database/migration.service'
import { initialMigration } from '@/services/providers/database/migrations/001_initial_leads_table'
import { SqliteDatabaseProvider } from '@/services/providers/database/sqlite-database.provider'

let dbServiceInstance: DatabaseService | null = null

export class DatabaseService {
  private readonly provider: BaseDatabaseProvider

  private constructor(connectionString: string = DATABASE_PATHS.LEADS_DB) {
    this.provider = new SqliteDatabaseProvider(
      {
        type: DatabaseType.SQLITE,
        connectionString,
      },
      LEAD_TABLE_SCHEMA,
    )

    this.provider.initialize()
  }

  public static getInstance(connectionString: string = DATABASE_PATHS.LEADS_DB): DatabaseService {
    dbServiceInstance ??= new DatabaseService(connectionString)
    return dbServiceInstance
  }

  public static async initializeOnStartup(
    connectionString: string = DATABASE_PATHS.LEADS_DB,
  ): Promise<void> {
    const service = DatabaseService.getInstance(connectionString)

    try {
      const migrationService = new MigrationService(service.provider)
      await migrationService.runMigrations([initialMigration])

      await service.provider.query('SELECT 1')
      logger.info('[DatabaseService] Startup initialization successful')
    } catch (error) {
      logger.error({ msg: '[DatabaseService] Startup initialization failed', error })
      throw error
    }
  }

  public getProvider(): BaseDatabaseProvider {
    return this.provider
  }

  public static async reset(): Promise<void> {
    const service = dbServiceInstance
    dbServiceInstance = null

    if (service) {
      // Закриваємо з'єднання якщо потрібно
      await service.provider.close().catch((error) => {
        logger.error({ msg: '[DatabaseService] Error closing provider during reset', error })
      })
    }
  }
}
