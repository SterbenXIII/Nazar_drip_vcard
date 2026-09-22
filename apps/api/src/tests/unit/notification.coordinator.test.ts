import { describe, expect, it, vi } from 'vitest'

const { dbExecute, providerSend } = vi.hoisted(() => ({
  dbExecute: vi.fn().mockResolvedValue({ rows: [], affectedRows: 1 }),
  providerSend: vi.fn(),
}))

vi.hoisted(() => {
  process.env.ENABLED_PROVIDERS = 'EMAIL'
  process.env.ADMIN_EMAIL = 'ci@example.test'
  process.env.SMTP_HOST = 'smtp.example.test'
  process.env.SMTP_USER = 'sender@example.test'
  process.env.SMTP_PASS = 'synthetic-password'
})

vi.mock('@/services/database.service', () => ({
  DatabaseService: {
    getInstance: () => ({ getProvider: () => ({ execute: dbExecute }) }),
  },
}))

vi.mock('@/core/factories/notification.factory', () => ({
  NotificationFactory: {
    getEnabledProviders: () => [{ providerName: 'EMAIL', send: providerSend }],
  },
}))

import { NotificationCoordinator } from '@/services/coordinators/notification.coordinator'

describe('NotificationCoordinator', () => {
  it('does not turn a persisted lead into a retry-triggering exception', async () => {
    providerSend.mockRejectedValueOnce(new Error('synthetic provider failure'))
    const lead = {
      name: 'Тест notification outcome',
      phone: '+380671234567',
      district: 'Центр',
      services: ['Тест'],
      timestamp: new Date(),
    }

    await expect(new NotificationCoordinator().handleIncomingLead(lead)).resolves.toBeUndefined()
    expect(dbExecute).toHaveBeenCalledOnce()
  })
})
