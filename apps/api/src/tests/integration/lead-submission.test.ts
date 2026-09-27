import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { leadSchema } from '@vcard/shared'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.ADMIN_EMAIL = 'ci@example.test'
  process.env.ENABLED_PROVIDERS = 'EMAIL'
  process.env.SMTP_HOST = 'smtp.example.test'
  process.env.SMTP_PASS = 'synthetic-password'
  process.env.SMTP_USER = 'sender@example.test'
})

import { NotificationCoordinator } from '@/services/coordinators/notification.coordinator'
import { DatabaseService } from '@/services/database.service'
import type { LeadPayload, LeadRecord } from '@/types/lead/lead-payload.type'

const { emailSend } = vi.hoisted(() => ({
  emailSend: vi.fn().mockResolvedValue({ success: true, provider: 'EMAIL' }),
}))

vi.mock('@/services/providers/email.provider', () => ({
  EmailProvider: class {
    send = emailSend
  },
}))

vi.mock('@/services/providers/notification/telegram-notification.provider', () => ({
  TelegramNotificationProvider: class {
    send = vi.fn().mockResolvedValue({ success: true, provider: 'TELEGRAM' })
  },
}))

describe('Lead Submission Integration Test', () => {
  let coordinator: NotificationCoordinator
  let testDbDir: string
  let testDbPath: string

  beforeAll(async () => {
    testDbDir = await mkdtemp(join(tmpdir(), 'vcard-api-integration-'))
    testDbPath = join(testDbDir, 'leads.db')
    await DatabaseService.initializeOnStartup(testDbPath)
    coordinator = new NotificationCoordinator()
  })
  afterAll(async () => {
    await DatabaseService.reset()
    await rm(testDbDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    emailSend.mockClear()
  })

  describe('1. Валідація та збереження в БД', () => {
    it('повинен прийняти валідну заявку та зберегти в базу', async () => {
      const testLead: LeadPayload = {
        name: 'Тестування базової валідації та збереження',
        phone: '+380671234567',
        district: 'Центр',
        services: ['Детокс-крапельниця', 'Вітамінний коктейль'],
        source: 'тести',
        timestamp: new Date(),
      }

      const validated = leadSchema.parse(testLead)
      expect(validated).toBeDefined()
      expect(validated.name).toBe(testLead.name)

      await expect(coordinator.handleIncomingLead(testLead)).resolves.not.toThrow()

      const db = DatabaseService.getInstance().getProvider()
      const results = await db.query<LeadRecord>(
        'SELECT * FROM leads WHERE phone = ? ORDER BY id DESC LIMIT 1',
        [testLead.phone],
      )

      expect(results).toHaveLength(1)
      const saved = results[0]
      expect(saved).toBeDefined()
      expect(saved!.name).toBe(testLead.name)
      expect(saved!.phone).toBe(testLead.phone)
      expect(saved!.district).toBe(testLead.district)

      const savedServices = JSON.parse(saved!.services as unknown as string)
      expect(savedServices).toEqual(testLead.services)
    })

    it('повинен відкинути невалідну заявку', () => {
      const invalidLead = {
        name: 'Test',
        phone: 'invalid-phone',
        district: 'Test',
        services: [],
      }

      expect(() => leadSchema.parse(invalidLead)).toThrow()
    })
  })

  describe('2. Відправка сповіщень', () => {
    it('повинен передати сповіщення до mock провайдера без зовнішньої доставки', async () => {
      const testLead: LeadPayload = {
        name: 'Тестування відправки сповіщень',
        phone: '+380501111111',
        district: 'Личаківський',
        services: ['Тест сповіщень'],
        source: 'тести',
        timestamp: new Date(),
      }

      await coordinator.handleIncomingLead(testLead)

      expect(emailSend).toHaveBeenCalledOnce()
      expect(emailSend).toHaveBeenCalledWith(expect.any(String), expect.any(String))
    })

    it('keeps the accepted lead when a provider throws after persistence', async () => {
      const testLead: LeadPayload = {
        name: 'Тестування помилки провайдера після збереження',
        phone: '+380501111112',
        district: 'Личаківський',
        services: ['Тест помилки провайдера'],
        source: 'тести',
        timestamp: new Date(),
      }
      emailSend.mockRejectedValueOnce(new Error('synthetic provider failure'))

      await expect(coordinator.handleIncomingLead(testLead)).resolves.not.toThrow()

      const db = DatabaseService.getInstance().getProvider()
      const results = await db.query<LeadRecord>('SELECT * FROM leads WHERE phone = ?', [
        testLead.phone,
      ])
      expect(results).toHaveLength(1)
    })
  })

  describe('3. Конкурентні запити', () => {
    it('повинен обробити багато одночасних заявок', async () => {
      const leads: LeadPayload[] = Array.from({ length: 5 }, (_, i) => ({
        name: `Тестування конкурентних запитів ${i + 1}`,
        phone: `+38050222${i.toString().padStart(4, '0')}`,
        district: 'Сихів',
        services: ['Тест конкурентних запитів'],
        source: 'тести',
        timestamp: new Date(),
      }))

      const promises = leads.map((lead) => coordinator.handleIncomingLead(lead))
      await expect(Promise.all(promises)).resolves.not.toThrow()

      const db = DatabaseService.getInstance().getProvider()
      const results = await db.query<LeadRecord>(
        "SELECT * FROM leads WHERE source = 'тести' AND name LIKE 'Тестування конкурентних запитів%'",
      )

      expect(results.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('4. Database persistence після перезапуску', () => {
    it('база даних повинна зберігати дані між сесіями', async () => {
      const testLead: LeadPayload = {
        name: 'Тестування збереження між сесіями БД',
        phone: '+380633333333',
        district: 'Франківський',
        services: ['Тест збереження'],
        source: 'тести',
        timestamp: new Date(),
      }

      await coordinator.handleIncomingLead(testLead)

      await DatabaseService.reset()
      await DatabaseService.initializeOnStartup(testDbPath)

      const db = DatabaseService.getInstance().getProvider()
      const results = await db.query<LeadRecord>(
        'SELECT * FROM leads WHERE phone = ? ORDER BY id DESC LIMIT 1',
        [testLead.phone],
      )

      expect(results.length).toBeGreaterThan(0)
      const saved = results[0]
      expect(saved).toBeDefined()
      expect(saved!.name).toBe(testLead.name)
    })
  })
})
