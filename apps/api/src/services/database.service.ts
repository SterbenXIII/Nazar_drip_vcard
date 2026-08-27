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

  private constructor() {
    this.provider = new SqliteDatabaseProvider(
      {
        type: DatabaseType.SQLITE,
        connectionString: DATABASE_PATHS.LEADS_DB,
      },
      LEAD_TABLE_SCHEMA,
    )

    this.provider.initialize()
  }

  public static getInstance(): DatabaseService {
    dbServiceInstance ??= new DatabaseService()
    return dbServiceInstance
  }

  public static async initializeOnStartup(): Promise<void> {
    const service = DatabaseService.getInstance()

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

  public static reset(): void {
    if (dbServiceInstance) {
      // Закриваємо з'єднання якщо потрібно
      dbServiceInstance.provider.close().catch((error) => {
        logger.error({ msg: '[DatabaseService] Error closing provider during reset', error })
      })
      dbServiceInstance = null
    }
  }
}
