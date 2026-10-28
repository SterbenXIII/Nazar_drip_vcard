import type { IQueryResult } from './query-result.interface'

export interface IDatabaseTransaction {
  execute<T = unknown>(query: string, params?: unknown[]): IQueryResult<T>
  query<T = unknown>(query: string, params?: unknown[]): T[]
}
