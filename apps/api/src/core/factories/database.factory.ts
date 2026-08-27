import { LEAD_TABLE_SCHEMA } from '@/config/database/schemas/lead.schema'
import { logger } from '@/config/logger'
import { DatabaseType } from '@/constants/database/database-type.enum'
import { LOG_MESSAGES } from '@/constants/messages/log-messages.const'
import type { BaseDatabaseProvider } from '@/core/abstracts/base-database.provider'
import type { IDatabaseConfig } from '@/interfaces/database/database-config.interface'
import { SqliteDatabaseProvider } from '@/services/providers/database/sqlite-database.provider'

export class DatabaseFactory {
  public static create(config: IDatabaseConfig): BaseDatabaseProvider {
    logger.info(`[DatabaseFactory] create() called with type: ${config.type}`)

    switch (config.type) {
      case DatabaseType.SQLITE:
        return new SqliteDatabaseProvider(config, LEAD_TABLE_SCHEMA)

      case DatabaseType.POSTGRES:
        throw new Error('PostgresDatabaseProvider is not implemented yet')

      default:
        throw new Error(`${LOG_MESSAGES.UNSUPPORTED_DATABASE} ${config.type}`)
    }
  }
}
