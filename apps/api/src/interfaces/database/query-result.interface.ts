export interface IQueryResult<T = unknown> {
  rows: T[]
  affectedRows?: number
  insertId?: number | string
}
