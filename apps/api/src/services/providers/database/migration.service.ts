import { logger } from '@/config/logger'
import type { BaseDatabaseProvider } from '@/core/abstracts/base-database.provider'

export interface IMigration {
  name: string
  up: (db: BaseDatabaseProvider) => Promise<void>
}

export class MigrationService {
  private readonly migrationsTable = '_migrations'

  constructor(private readonly db: BaseDatabaseProvider) {}

  public async runMigrations(migrations: IMigration[]): Promise<void> {
    await this.ensureMigrationsTable()

    const appliedMigrations = await this.getAppliedMigrations()
    logger.info(`Checking migrations... (${appliedMigrations.length} already applied)`)

    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration.name)) {
        logger.info(`Applying migration: ${migration.name}`)
        try {
          await migration.up(this.db)
          await this.recordMigration(migration.name)
          logger.info(`Migration successful: ${migration.name}`)
        } catch (error) {
          logger.error({ msg: `Migration failed: ${migration.name}`, error })
          throw error
        }
      }
    }
  }

  private async ensureMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    await this.db.execute(query)
  }

  private async getAppliedMigrations(): Promise<string[]> {
    const rows = await this.db.query<{ name: string }>(`SELECT name FROM ${this.migrationsTable}`)
    return rows.map((r) => r.name)
  }

  private async recordMigration(name: string): Promise<void> {
    await this.db.execute(`INSERT INTO ${this.migrationsTable} (name) VALUES (?)`, [name])
  }
}
