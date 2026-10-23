import { beforeEach, describe, expect, it, vi } from 'vitest'

const { dbExecute, providerSend } = vi.hoisted(() => ({
  dbExecute: vi.fn().mockResolvedValue({ rows: [], affectedRows: 1 }),
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
    getInstance: () => ({ getProvider: () => ({ execute: dbExecute }) }),
  },
}))

vi.mock('@/core/factories/notification.factory', () => ({
  NotificationFactory: {
    getEnabledProviders: () => [{ providerName: 'TELEGRAM', send: providerSend }],
  },
}))

vi.mock('@/services/config/allowed-chats.service', () => ({
  AllowedChatsService: {
    getInstance: () => ({ getAllowedChats: () => [-1001234567890] }),
  },
}))

import { leadSchema } from '@vcard/shared'

import { NotificationCoordinator } from '@/services/coordinators/notification.coordinator'

describe('NotificationCoordinator', () => {
  beforeEach(() => {
    dbExecute.mockClear()
    providerSend.mockClear()
  })

  it('sends contact-only leads to each configured Telegram chat', async () => {
    const lead = leadSchema.parse({
      name: 'Олена Тестова',
      phone: '+380671234567',
      source: 'clinic-web',
    })

    await new NotificationCoordinator().handleIncomingLead({ ...lead, timestamp: new Date() })

    expect(providerSend).toHaveBeenCalledOnce()
    expect(providerSend).toHaveBeenCalledWith(
      '-1001234567890',
      expect.stringContaining("Ім'я:</b> Олена Тестова"),
    )
    expect(providerSend.mock.calls[0]?.[1]).toContain('Тел:</b> +380671234567')
    expect(providerSend.mock.calls[0]?.[1]).not.toContain('Район:')
    expect(providerSend.mock.calls[0]?.[1]).not.toContain('Послуги:')
  })

  it('escapes dynamic text before placing it in Telegram HTML', async () => {
    const lead = leadSchema.parse({
      name: 'Олена Іван',
      phone: '+380671234567',
      source: '<b>форма</b> & заявка',
    })

    await new NotificationCoordinator().handleIncomingLead({ ...lead, timestamp: new Date() })

    expect(providerSend.mock.calls[0]?.[1]).toContain(
      'Джерело:</b> &lt;b&gt;форма&lt;/b&gt; &amp; заявка',
    )
  })

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
