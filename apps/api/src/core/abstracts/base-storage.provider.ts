import { type LeadPayload } from '@/types/lead/lead-payload.type'

export abstract class BaseStorageProvider {
  protected abstract readonly type: string

  public abstract save(data: LeadPayload): Promise<void>
  public abstract getAll(): Promise<LeadPayload[]>

  protected formatLog(msg: string): string {
    return `[Storage:${this.type}] ${new Date().toISOString()}: ${msg}`
  }
}
