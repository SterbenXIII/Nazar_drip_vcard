export type LeadPayload = {
  readonly name: string
  readonly phone: string
  readonly district: string
  readonly services: string[]
  readonly source?: string
  readonly timestamp: Date
}

/**
 * LeadRecord — тип для запису з бази даних (включає id)
 */
export type LeadRecord = LeadPayload & {
  readonly id: number
}
