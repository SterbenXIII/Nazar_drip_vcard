import { logger } from '@/config/logger'
import { LEAD_COLUMNS, NOTIFICATION_OUTBOX_COLUMNS, TABLE_NAMES } from '@/constants/database'
import { LOG_MESSAGES } from '@/constants/messages/log-messages.const'
import type { BaseDatabaseProvider } from '@/core/abstracts/base-database.provider'
import { BaseStorageProvider } from '@/core/abstracts/base-storage.provider'
import { SqlBuilder } from '@/core/utils/sql-builder.util'
import type { LeadPayload } from '@/types/lead/lead-payload.type'
import type { QueuedNotification } from '@/types/notification/notification-outbox.type'
import type { NotificationOutboxRecord } from '@/types/notification/notification-outbox.type'

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

  public async saveWithOutbox(
    data: LeadPayload,
    notifications: readonly QueuedNotification[],
  ): Promise<number> {
    try {
      if (notifications.length === 0) {
        throw new Error('At least one notification is required')
      }

      const leadQuery = SqlBuilder.insert(TABLE_NAMES.LEADS, [
        LEAD_COLUMNS.NAME,
        LEAD_COLUMNS.PHONE,
        LEAD_COLUMNS.DISTRICT,
        LEAD_COLUMNS.SERVICES,
        LEAD_COLUMNS.SOURCE,
        LEAD_COLUMNS.TIMESTAMP,
      ])
      const outboxQuery = SqlBuilder.insert(TABLE_NAMES.NOTIFICATION_OUTBOX, [
        NOTIFICATION_OUTBOX_COLUMNS.LEAD_ID,
        NOTIFICATION_OUTBOX_COLUMNS.PROVIDER,
        NOTIFICATION_OUTBOX_COLUMNS.RECIPIENT,
        NOTIFICATION_OUTBOX_COLUMNS.STATUS,
        NOTIFICATION_OUTBOX_COLUMNS.ATTEMPT_COUNT,
        NOTIFICATION_OUTBOX_COLUMNS.NEXT_ATTEMPT_AT,
        NOTIFICATION_OUTBOX_COLUMNS.LAST_ERROR,
      ])
      const leadParams = [
        data.name,
        data.phone,
        data.district,
        JSON.stringify(data.services),
        data.source || null,
        data.timestamp.toISOString(),
      ]

      return await this.db.transaction((tx) => {
        const result = tx.execute(leadQuery, leadParams)
        const leadId = Number(result.insertId)
        if (!Number.isInteger(leadId)) throw new Error('Lead insert did not return an ID')

        const nextAttemptAt = Date.now()
        for (const notification of notifications) {
          tx.execute(outboxQuery, [
            leadId,
            notification.provider,
            notification.recipient,
            'pending',
            0,
            nextAttemptAt,
            null,
          ])
        }
        return leadId
      })
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

  public async getLeadById(id: number): Promise<LeadPayload | undefined> {
    const rows = await this.db.query<{
      name: string
      phone: string
      district: string
      services: string
      source?: string
      timestamp: string
    }>(
      `SELECT name, phone, district, services, source, timestamp FROM ${TABLE_NAMES.LEADS} WHERE id = ?`,
      [id],
    )
    const row = rows[0]
    return row
      ? {
          ...row,
          services: JSON.parse(row.services) as string[],
          timestamp: new Date(row.timestamp),
        }
      : undefined
  }

  public async getDueNotifications(now: number): Promise<NotificationOutboxRecord[]> {
    const rows = await this.db.query<{
      id: number
      lead_id: number
      provider: NotificationOutboxRecord['provider']
      recipient: string
      status: NotificationOutboxRecord['status']
      attempt_count: number
      next_attempt_at: number
      last_error: string | null
    }>(
      `SELECT id, lead_id, provider, recipient, status, attempt_count, next_attempt_at, last_error
      FROM ${TABLE_NAMES.NOTIFICATION_OUTBOX} WHERE status = 'pending' AND next_attempt_at <= ?
      ORDER BY next_attempt_at, id`,
      [now],
    )
    return rows.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      provider: row.provider,
      recipient: row.recipient,
      status: row.status,
      attemptCount: row.attempt_count,
      nextAttemptAt: row.next_attempt_at,
      lastError: row.last_error,
    }))
  }

  public async claimNotification(id: number, now: number): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE ${TABLE_NAMES.NOTIFICATION_OUTBOX}
      SET status = 'processing', attempt_count = attempt_count + 1
      WHERE id = ? AND status = 'pending' AND next_attempt_at <= ?`,
      [id, now],
    )
    return result.affectedRows === 1
  }

  public async recoverProcessing(maxRetries: number): Promise<void> {
    await this.db.execute(
      `UPDATE ${TABLE_NAMES.NOTIFICATION_OUTBOX} SET status = 'pending'
      WHERE status = 'processing' AND attempt_count < ?`,
      [maxRetries],
    )
    await this.db.execute(
      `UPDATE ${TABLE_NAMES.NOTIFICATION_OUTBOX} SET status = 'failed'
      WHERE status = 'processing' AND attempt_count >= ?`,
      [maxRetries],
    )
  }

  public async markNotificationDelivered(id: number): Promise<void> {
    await this.db.execute(
      `UPDATE ${TABLE_NAMES.NOTIFICATION_OUTBOX} SET status = 'delivered', delivered_at = ? WHERE id = ?`,
      [Date.now(), id],
    )
  }

  public async markNotificationCancelled(id: number): Promise<void> {
    await this.db.execute(
      `UPDATE ${TABLE_NAMES.NOTIFICATION_OUTBOX} SET status = 'cancelled' WHERE id = ?`,
      [id],
    )
  }

  public async markNotificationPending(
    id: number,
    error: string,
    nextAttemptAt: number,
  ): Promise<void> {
    await this.db.execute(
      `UPDATE ${TABLE_NAMES.NOTIFICATION_OUTBOX} SET status = 'pending', last_error = ?, next_attempt_at = ? WHERE id = ?`,
      [error.slice(0, 500), nextAttemptAt, id],
    )
  }

  public async markNotificationFailed(
    id: number,
    error: string,
    nextAttemptAt: number,
  ): Promise<void> {
    await this.db.execute(
      `UPDATE ${TABLE_NAMES.NOTIFICATION_OUTBOX} SET status = 'failed', last_error = ?, next_attempt_at = ? WHERE id = ?`,
      [error.slice(0, 500), nextAttemptAt, id],
    )
  }
}
