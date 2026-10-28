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
import type { IDatabaseTransaction } from '@/interfaces/database/database-transaction.interface'
import { SqliteDatabaseProvider } from '@/services/providers/database/sqlite-database.provider'

describe('SqliteDatabaseProvider transactions', () => {
  let directory: string | undefined
  let provider: SqliteDatabaseProvider | undefined

  afterEach(async () => {
    await provider?.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  async function createProvider(): Promise<SqliteDatabaseProvider> {
    directory = await mkdtemp(join(tmpdir(), 'vcard-transaction-'))
    provider = new SqliteDatabaseProvider(
      { type: DatabaseType.SQLITE, connectionString: join(directory, 'test.db') },
      LEAD_TABLE_SCHEMA,
    )
    provider.initialize()
    return provider
  }

  it('commits synchronous operations and returns inserted IDs', async () => {
    const db = await createProvider()
    const result = await db.transaction((tx) => {
      const first = tx.execute(
        'INSERT INTO leads (name, phone, district, services, timestamp) VALUES (?, ?, ?, ?, ?)',
        ['First', '+1', '', '[]', new Date().toISOString()],
      )
      const second = tx.execute(
        'INSERT INTO leads (name, phone, district, services, timestamp) VALUES (?, ?, ?, ?, ?)',
        ['Second', '+2', '', '[]', new Date().toISOString()],
      )
      return [first.insertId, second.insertId]
    })

    expect(result).toEqual([1, 2])
    await expect(db.query('SELECT id FROM leads')).resolves.toHaveLength(2)
  })

  it('rolls back all operations when the callback throws', async () => {
    const db = await createProvider()
    await expect(
      db.transaction((tx) => {
        tx.execute(
          'INSERT INTO leads (name, phone, district, services, timestamp) VALUES (?, ?, ?, ?, ?)',
          ['Rollback', '+1', '', '[]', new Date().toISOString()],
        )
        throw new Error('synthetic failure')
      }),
    ).rejects.toThrow('synthetic failure')
    await expect(db.query('SELECT id FROM leads')).resolves.toEqual([])
  })

  it('rejects thenables before commit and expires retained handles', async () => {
    const db = await createProvider()
    let retained: { query: (query: string) => unknown[] } | undefined
    await expect(
      db.transaction(((tx: IDatabaseTransaction) => {
        retained = tx
        tx.execute(
          'INSERT INTO leads (name, phone, district, services, timestamp) VALUES (?, ?, ?, ?, ?)',
          ['Thenable', '+1', '', '[]', new Date().toISOString()],
        )
        return Promise.resolve(1)
      }) as never),
    ).rejects.toThrow('must be synchronous')
    await expect(db.query('SELECT id FROM leads')).resolves.toEqual([])
    expect(() => retained?.query('SELECT 1')).toThrow('expired')
  })

  it('rejects async callbacks at the type level', async () => {
    const db = await createProvider()
    // @ts-expect-error PromiseLike callback results are not accepted.
    await expect(db.transaction(async () => 1)).rejects.toThrow('must be synchronous')
  })
})
