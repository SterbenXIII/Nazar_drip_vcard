import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'synthetic-token'
  process.env.ADMIN_EMAIL = 'ci@example.test'
  process.env.ENABLED_PROVIDERS = 'EMAIL'
  process.env.SMTP_USER = 'sender@example.test'
  process.env.SMTP_HOST = 'smtp.example.test'
  process.env.SMTP_PASS = 'synthetic-password'
})

import { LEAD_TABLE_SCHEMA } from '@/config/database/schemas/lead.schema'
import { DatabaseType } from '@/constants/database'
import { MigrationService } from '@/services/providers/database/migration.service'
import { initialMigration } from '@/services/providers/database/migrations/001_initial_leads_table'
import { notificationOutboxMigration } from '@/services/providers/database/migrations/002_notification_outbox'
import { SqliteDatabaseProvider } from '@/services/providers/database/sqlite-database.provider'

describe('database migration upgrade', () => {
  let directory: string | undefined
  let provider: SqliteDatabaseProvider | undefined

  afterEach(async () => {
    await provider?.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('preserves existing leads when adding the notification outbox', async () => {
    directory = await mkdtemp(join(tmpdir(), 'vcard-migration-upgrade-'))
    provider = new SqliteDatabaseProvider(
      { type: DatabaseType.SQLITE, connectionString: join(directory, 'leads.db') },
      LEAD_TABLE_SCHEMA,
    )
    provider.initialize()
    const migrations = new MigrationService(provider)

    await migrations.runMigrations([initialMigration])
    await provider.execute(
      'INSERT INTO leads (name, phone, district, services, timestamp) VALUES (?, ?, ?, ?, ?)',
      ['Existing lead', '+380000000000', '', '[]', new Date().toISOString()],
    )

    await migrations.runMigrations([initialMigration, notificationOutboxMigration])

    await expect(
      provider.query('SELECT id FROM leads WHERE phone = ?', ['+380000000000']),
    ).resolves.toHaveLength(1)
    await expect(
      provider.query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'notification_outbox'",
      ),
    ).resolves.toHaveLength(1)
  })
})
