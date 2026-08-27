import type { DatabaseType } from '@/constants/database/database-type.enum'

export interface IDatabaseConfig {
  type: DatabaseType | 'sqlite' | 'postgres' | 'mysql' | 'mongodb'
  connectionString?: string
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  options?: Record<string, unknown>
}
