export interface IMessagePayload {
  recipient: string
  content: string
  parseMode?: string
  additionalOptions?: Record<string, unknown>
}
