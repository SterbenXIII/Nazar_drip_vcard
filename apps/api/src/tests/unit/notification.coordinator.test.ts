import { beforeEach, describe, expect, it, vi } from 'vitest'

const { dbExecute, dbTransaction, providerSend } = vi.hoisted(() => ({
  dbExecute: vi.fn().mockResolvedValue({ rows: [], affectedRows: 1 }),
  dbTransaction: vi.fn((operation) =>
    operation({ execute: vi.fn().mockReturnValue({ insertId: 1 }) }),
  ),
  providerSend: vi.fn().mockResolvedValue({ success: true, provider: 'TELEGRAM' }),
}))

vi.hoisted(() => {
  process.env.ENABLED_PROVIDERS = 'TELEGRAM'
  process.env.TELEGRAM_BOT_TOKEN = 'synthetic-telegram-token'
  process.env.TELEGRAM_MASTER_ID = ''
  process.env.TELEGRAM_NOTIFY_IDS = ''
})

vi.mock('@/services/database.service', () => ({
  DatabaseService: {
    getInstance: () => ({
      getProvider: () => ({ execute: dbExecute, transaction: dbTransaction }),
    }),
  },
}))

vi.mock('@/core/factories/notification.factory', () => ({
  NotificationFactory: {
    getEnabledProviders: () => [{ providerName: 'TELEGRAM', send: providerSend }],
  },
}))

vi.mock('@/services/config/allowed-chats.service', () => ({
  AllowedChatsService: {
    getInstance: () => ({
      refreshAllowedChats: vi.fn(),
      getAllowedChats: () => [-1001234567890],
    }),
  },
}))

import { leadSchema } from '@vcard/shared'

import { NotificationCoordinator } from '@/services/coordinators/notification.coordinator'

describe('NotificationCoordinator', () => {
  beforeEach(() => {
    dbExecute.mockClear()
    dbTransaction.mockClear()
    providerSend.mockClear()
  })

  it('enqueues contact-only leads for each configured Telegram chat', async () => {
    const lead = leadSchema.parse({
      name: 'Олена Тестова',
      phone: '+380671234567',
      source: 'clinic-web',
    })

    await new NotificationCoordinator().handleIncomingLead({ ...lead, timestamp: new Date() })

    expect(providerSend).not.toHaveBeenCalled()
    expect(dbTransaction).toHaveBeenCalledOnce()
  })

  it('escapes dynamic text before placing it in Telegram HTML', async () => {
    const lead = leadSchema.parse({
      name: 'Олена Іван',
      phone: '+380671234567',
      source: '<b>форма</b> & заявка',
    })

    await new NotificationCoordinator().handleIncomingLead({ ...lead, timestamp: new Date() })

    expect(dbTransaction).toHaveBeenCalledOnce()
  })

  it('does not synchronously invoke a provider after enqueue', async () => {
    const lead = {
      name: 'Тест notification outcome',
      phone: '+380671234567',
      district: 'Центр',
      services: ['Тест'],
      timestamp: new Date(),
    }

    await expect(new NotificationCoordinator().handleIncomingLead(lead)).resolves.toBeUndefined()
    expect(dbTransaction).toHaveBeenCalledOnce()
  })
})
