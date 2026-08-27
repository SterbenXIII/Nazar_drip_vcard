import { logger } from '@/config/logger'
import { LEAD_COLUMNS, TABLE_NAMES } from '@/constants/database'
import { LOG_MESSAGES } from '@/constants/messages/log-messages.const'
import type { BaseDatabaseProvider } from '@/core/abstracts/base-database.provider'
import { BaseStorageProvider } from '@/core/abstracts/base-storage.provider'
import { SqlBuilder } from '@/core/utils/sql-builder.util'
import type { LeadPayload } from '@/types/lead/lead-payload.type'

export class DatabaseStorageProvider extends BaseStorageProvider {
  protected readonly type = 'DATABASE'
  private readonly db: BaseDatabaseProvider

  constructor(databaseProvider: BaseDatabaseProvider) {
    super()
    this.db = databaseProvider
  }

  public async save(data: LeadPayload): Promise<void> {
    try {
      const query = SqlBuilder.insert(TABLE_NAMES.LEADS, [
        LEAD_COLUMNS.NAME,
        LEAD_COLUMNS.PHONE,
        LEAD_COLUMNS.DISTRICT,
        LEAD_COLUMNS.SERVICES,
        LEAD_COLUMNS.SOURCE,
        LEAD_COLUMNS.TIMESTAMP,
      ])
      const params = [
        data.name,
        data.phone,
        data.district,
        JSON.stringify(data.services),
        data.source || null,
        data.timestamp.toISOString(),
      ]

      await this.db.execute(query, params)
      logger.info(this.formatLog(LOG_MESSAGES.LEAD_SAVED))
    } catch (error) {
      logger.error({ msg: this.formatLog(LOG_MESSAGES.LEAD_SAVE_FAILED), error })
      throw error
    }
  }

  public async getAll(): Promise<LeadPayload[]> {
    try {
      const query = SqlBuilder.selectAll(TABLE_NAMES.LEADS, LEAD_COLUMNS.TIMESTAMP)
      const rows = await this.db.query<{
        name: string
        phone: string
        district: string
        services: string
        source?: string
        timestamp: string
      }>(query)
      // Parse JSON fields from database
      return rows.map((row) => ({
        ...row,
        services: typeof row.services === 'string' ? JSON.parse(row.services) : row.services,
        timestamp: new Date(row.timestamp),
      })) as LeadPayload[]
    } catch (error) {
      logger.error({ msg: this.formatLog(LOG_MESSAGES.LEAD_GET_FAILED), error })
      throw error
    }
  }
}
