import { describe, expect, it, vi } from 'vitest'

import type { BaseDatabaseProvider } from '@/core/abstracts/base-database.provider'
import { type IMigration, MigrationService } from '@/services/providers/database/migration.service'

vi.hoisted(() => {
  process.env.ENABLED_PROVIDERS = 'TELEGRAM'
  process.env.TELEGRAM_BOT_TOKEN = 'synthetic-telegram-token'
})

describe('MigrationService', () => {
  function createService(failRecord = false) {
    const tables = new Set<string>()
    const applied = new Set<string>()
    const provider = {
      execute: vi.fn(async (query: string, params: unknown[] = []) => {
        if (query === 'BEGIN') return { rows: [], affectedRows: 0 }
        if (query === 'COMMIT') return { rows: [], affectedRows: 0 }
        if (query === 'ROLLBACK') {
          tables.clear()
          applied.clear()
          return { rows: [], affectedRows: 0 }
        }
        if (query.includes('CREATE TABLE IF NOT EXISTS _migrations'))
          return { rows: [], affectedRows: 0 }
        if (query.startsWith('CREATE TABLE migration_probe')) {
          tables.add('migration_probe')
          return { rows: [], affectedRows: 0 }
        }
        if (query.startsWith('INSERT INTO _migrations')) {
          if (failRecord) throw new Error('synthetic metadata failure')
          applied.add(String(params[0]))
          return { rows: [], affectedRows: 1 }
        }
        throw new Error(`Unexpected query: ${query}`)
      }),
      query: vi.fn(async (query: string, params: unknown[] = []) => {
        if (query === 'SELECT name FROM _migrations') {
          return [...applied].map((name) => ({ name }))
        }
        if (query.includes("name = 'migration_probe'")) {
          return tables.has('migration_probe') ? [{ name: 'migration_probe' }] : []
        }
        if (query.includes('FROM _migrations WHERE name = ?')) {
          return applied.has(String(params[0])) ? [{ name: String(params[0]) }] : []
        }
        throw new Error(`Unexpected query: ${query}`)
      }),
    } as unknown as BaseDatabaseProvider
    return { service: new MigrationService(provider), provider }
  }

  it('rolls back the migration body when the migration fails', async () => {
    const { service, provider } = await createService()
    const migration: IMigration = {
      name: '002_failure',
      up: async (db) => {
        await db.execute('CREATE TABLE migration_probe (id INTEGER PRIMARY KEY)')
        throw new Error('synthetic migration failure')
      },
    }

    await expect(service.runMigrations([migration])).rejects.toThrow('synthetic migration failure')
    expect(
      await provider.query("SELECT name FROM sqlite_master WHERE name = 'migration_probe'"),
    ).toEqual([])
    expect(
      await provider.query('SELECT name FROM _migrations WHERE name = ?', [migration.name]),
    ).toEqual([])
  })

  it('records a successful migration once and does not rerun it', async () => {
    const { service, provider } = await createService()
    let runs = 0
    const migration: IMigration = {
      name: '002_success',
      up: async (db) => {
        runs += 1
        await db.execute('CREATE TABLE migration_probe (id INTEGER PRIMARY KEY)')
      },
    }

    await service.runMigrations([migration])
    await service.runMigrations([migration])

    expect(runs).toBe(1)
    expect(
      await provider.query('SELECT name FROM _migrations WHERE name = ?', [migration.name]),
    ).toEqual([expect.objectContaining({ name: migration.name })])
  })

  it('rolls back the body when migration metadata cannot be recorded', async () => {
    const { service, provider } = createService(true)
    const migration: IMigration = {
      name: '002_metadata_failure',
      up: async (db) => {
        await db.execute('CREATE TABLE migration_probe (id INTEGER PRIMARY KEY)')
      },
    }

    await expect(service.runMigrations([migration])).rejects.toThrow('synthetic metadata failure')
    expect(
      await provider.query("SELECT name FROM sqlite_master WHERE name = 'migration_probe'"),
    ).toEqual([])
    expect(
      await provider.query('SELECT name FROM _migrations WHERE name = ?', [migration.name]),
    ).toEqual([])
  })
})
