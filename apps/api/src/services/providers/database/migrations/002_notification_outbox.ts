import { TABLE_NAMES } from '@/constants/database'

import type { IMigration } from '../migration.service'

export const notificationOutboxMigration: IMigration = {
  name: '002_notification_outbox',
  up: async (db) => {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.NOTIFICATION_OUTBOX} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        recipient TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'cancelled')),
        attempt_count INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL,
        last_error TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000),
        delivered_at INTEGER,
        FOREIGN KEY (lead_id) REFERENCES leads(id),
        UNIQUE (lead_id, provider, recipient)
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notification_outbox_due
      ON ${TABLE_NAMES.NOTIFICATION_OUTBOX} (status, next_attempt_at)
    `)
  },
}
