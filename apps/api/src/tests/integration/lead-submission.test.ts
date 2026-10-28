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

import { NotificationProvider } from '@/constants'
import { NotificationRecipientsService } from '@/services/config/notification-recipients.service'
import { NotificationCoordinator } from '@/services/coordinators/notification.coordinator'
import { NotificationOutboxWorker } from '@/services/coordinators/notification-outbox.worker'
import { DatabaseService } from '@/services/database.service'
import { DatabaseStorageProvider } from '@/services/providers/storage/database-storage.provider'
import type { LeadPayload, LeadRecord } from '@/types/lead/lead-payload.type'

const { emailSend } = vi.hoisted(() => ({
  emailSend: vi.fn().mockResolvedValue({ success: true, provider: 'EMAIL' }),
}))

vi.mock('@/services/providers/email.provider', () => ({
  EmailProvider: class {
    providerName = 'EMAIL'
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
  let app: { fetch: (request: Request) => Response | Promise<Response> }

  beforeAll(async () => {
    testDbDir = await mkdtemp(join(tmpdir(), 'vcard-api-integration-'))
    testDbPath = join(testDbDir, 'leads.db')
    await DatabaseService.initializeOnStartup(testDbPath)
    coordinator = new NotificationCoordinator()
    app = (await import('@/app')).default
  })
  afterAll(async () => {
    await DatabaseService.reset()
    await rm(testDbDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    emailSend.mockReset()
    emailSend.mockResolvedValue({ success: true, provider: 'EMAIL' })
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

    it('повинен зберегти контактну заявку без району та послуг', async () => {
      const testLead = {
        ...leadSchema.parse({
          name: 'Заявка на консультацію',
          phone: '+380501234567',
          source: 'clinic-web',
        }),
        timestamp: new Date(),
      }

      await coordinator.handleIncomingLead(testLead)

      const db = DatabaseService.getInstance().getProvider()
      const results = await db.query<LeadRecord>(
        'SELECT * FROM leads WHERE phone = ? ORDER BY id DESC LIMIT 1',
        [testLead.phone],
      )

      expect(results).toHaveLength(1)
      expect(results[0]?.district).toBe('')
      expect(JSON.parse(results[0]!.services as unknown as string)).toEqual([])
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

      expect(emailSend).not.toHaveBeenCalled()
      await expect(
        DatabaseService.getInstance()
          .getProvider()
          .query(
            'SELECT id FROM notification_outbox WHERE recipient = ? ORDER BY id DESC LIMIT 1',
            ['ci@example.test'],
          ),
      ).resolves.toHaveLength(1)
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

  describe('6. HTTP acceptance and asynchronous delivery', () => {
    it('returns 201 after durable enqueue while delivery is still processing', async () => {
      let release!: (value: { success: boolean; provider: string }) => void
      await DatabaseService.getInstance()
        .getProvider()
        .execute("UPDATE notification_outbox SET status = 'delivered' WHERE status = 'pending'")
      emailSend.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = resolve
          }),
      )
      const responsePromise = app.fetch(
        new Request('http://localhost/api/leads/submit', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.50' },
          body: JSON.stringify({
            name: 'Route acceptance',
            phone: '+380501234599',
            source: 'route',
          }),
        }),
      )
      const response = await responsePromise
      expect(response.status).toBe(201)
      await expect(response.json()).resolves.toEqual({
        success: true,
        message: 'Заявку отримано, очікуйте на дзвінок',
      })

      const db = DatabaseService.getInstance().getProvider()
      const worker = new NotificationOutboxWorker(new DatabaseStorageProvider(db))
      const processing = worker.processPending()
      await vi.waitFor(async () => {
        await expect(
          db.query<{ status: string }>(
            'SELECT status FROM notification_outbox WHERE recipient = ? ORDER BY id DESC LIMIT 1',
            ['ci@example.test'],
          ),
        ).resolves.toEqual([{ status: 'processing' }])
      })
      release({ success: true, provider: 'EMAIL' })
      await processing
      await expect(
        db.query<{ status: string }>(
          'SELECT status FROM notification_outbox WHERE recipient = ? ORDER BY id DESC LIMIT 1',
          ['ci@example.test'],
        ),
      ).resolves.toEqual([{ status: 'delivered' }])
    })

    it('returns 503 and writes nothing when an enabled provider has no recipients', async () => {
      const resolver = vi
        .spyOn(NotificationRecipientsService.prototype, 'getFor')
        .mockResolvedValueOnce([])
      const db = DatabaseService.getInstance().getProvider()
      const before = await db.query<{ leads: number; outbox: number }>(
        'SELECT (SELECT COUNT(*) FROM leads) AS leads, (SELECT COUNT(*) FROM notification_outbox) AS outbox',
      )
      const response = await app.fetch(
        new Request('http://localhost/api/leads/submit', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.51' },
          body: JSON.stringify({ name: 'No recipient', phone: '+380501234598', source: 'route' }),
        }),
      )
      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: 'Service Unavailable',
      })
      await expect(
        db.query<{ leads: number; outbox: number }>(
          'SELECT (SELECT COUNT(*) FROM leads) AS leads, (SELECT COUNT(*) FROM notification_outbox) AS outbox',
        ),
      ).resolves.toEqual(before)
      resolver.mockRestore()
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

  describe('5. Atomic lead and outbox persistence', () => {
    it('stores one delivery row per recipient with an integer due time', async () => {
      const db = DatabaseService.getInstance().getProvider()
      const storage = new DatabaseStorageProvider(db)
      const lead: LeadPayload = {
        name: 'Атомне збереження outbox',
        phone: '+380639999991',
        district: 'Центр',
        services: ['Консультація'],
        timestamp: new Date(),
      }

      const leadId = await storage.saveWithOutbox(lead, [
        { provider: NotificationProvider.EMAIL, recipient: 'one@example.test' },
        { provider: NotificationProvider.EMAIL, recipient: 'two@example.test' },
      ])
      const rows = await db.query<{ lead_id: number; next_attempt_at: number }>(
        'SELECT lead_id, next_attempt_at FROM notification_outbox WHERE lead_id = ?',
        [leadId],
      )

      expect(rows).toHaveLength(2)
      expect(rows.every((row) => row.lead_id === leadId)).toBe(true)
      expect(rows.every((row) => Number.isInteger(row.next_attempt_at))).toBe(true)
    })

    it('selects only pending rows whose integer due time has arrived', async () => {
      const db = DatabaseService.getInstance().getProvider()
      const storage = new DatabaseStorageProvider(db)
      const leadId = await storage.saveWithOutbox(
        {
          name: 'Due selection',
          phone: '+380639999994',
          district: '',
          services: [],
          timestamp: new Date(),
        },
        [{ provider: NotificationProvider.EMAIL, recipient: 'due@example.test' }],
      )
      await db.execute('UPDATE notification_outbox SET next_attempt_at = ? WHERE lead_id = ?', [
        Date.now() + 60_000,
        leadId,
      ])
      await expect(storage.getDueNotifications(Date.now())).resolves.not.toContainEqual(
        expect.objectContaining({ leadId, recipient: 'due@example.test' }),
      )
      await db.execute('UPDATE notification_outbox SET next_attempt_at = ? WHERE lead_id = ?', [
        Date.now() - 1,
        leadId,
      ])
      await expect(storage.getDueNotifications(Date.now())).resolves.toContainEqual(
        expect.objectContaining({ leadId, recipient: 'due@example.test' }),
      )
    })

    it('recovers interrupted rows below the limit and fails rows at the limit', async () => {
      const db = DatabaseService.getInstance().getProvider()
      const storage = new DatabaseStorageProvider(db)
      const belowId = await storage.saveWithOutbox(
        {
          name: 'Recovery below',
          phone: '+380639999995',
          district: '',
          services: [],
          timestamp: new Date(),
        },
        [{ provider: NotificationProvider.EMAIL, recipient: 'below@example.test' }],
      )
      const atLimitId = await storage.saveWithOutbox(
        {
          name: 'Recovery at limit',
          phone: '+380639999996',
          district: '',
          services: [],
          timestamp: new Date(),
        },
        [{ provider: NotificationProvider.EMAIL, recipient: 'at-limit@example.test' }],
      )
      await db.execute(
        "UPDATE notification_outbox SET status = 'processing', attempt_count = CASE lead_id WHEN ? THEN 1 ELSE 3 END WHERE lead_id IN (?, ?)",
        [belowId, belowId, atLimitId],
      )
      await storage.recoverProcessing(3)
      await expect(
        db.query<{ status: string; attempt_count: number }>(
          'SELECT status, attempt_count FROM notification_outbox WHERE lead_id = ?',
          [belowId],
        ),
      ).resolves.toEqual([{ status: 'pending', attempt_count: 1 }])
      await expect(
        db.query<{ status: string; attempt_count: number }>(
          'SELECT status, attempt_count FROM notification_outbox WHERE lead_id = ?',
          [atLimitId],
        ),
      ).resolves.toEqual([{ status: 'failed', attempt_count: 3 }])
    })

    it('rolls back the lead when an outbox insert fails', async () => {
      const db = DatabaseService.getInstance().getProvider()
      const storage = new DatabaseStorageProvider(db)
      const lead: LeadPayload = {
        name: 'Відкат outbox',
        phone: '+380639999992',
        district: 'Центр',
        services: [],
        timestamp: new Date(),
      }

      await expect(
        storage.saveWithOutbox(lead, [
          { provider: NotificationProvider.EMAIL, recipient: 'duplicate@example.test' },
          { provider: NotificationProvider.EMAIL, recipient: 'duplicate@example.test' },
        ]),
      ).rejects.toThrow()
      await expect(db.query('SELECT id FROM leads WHERE phone = ?', [lead.phone])).resolves.toEqual(
        [],
      )
      await expect(
        db.query('SELECT id FROM notification_outbox WHERE recipient = ?', [
          'duplicate@example.test',
        ]),
      ).resolves.toEqual([])
    })

    it('rejects an empty delivery list without persisting anything', async () => {
      const db = DatabaseService.getInstance().getProvider()
      const storage = new DatabaseStorageProvider(db)
      const lead: LeadPayload = {
        name: 'Порожній outbox',
        phone: '+380639999993',
        district: 'Центр',
        services: [],
        timestamp: new Date(),
      }
      const beforeOutbox = await db.query<{ count: number }>(
        'SELECT COUNT(*) AS count FROM notification_outbox',
      )

      await expect(storage.saveWithOutbox(lead, [])).rejects.toThrow(
        'At least one notification is required',
      )
      await expect(db.query('SELECT id FROM leads WHERE phone = ?', [lead.phone])).resolves.toEqual(
        [],
      )
      await expect(
        db.query<{ count: number }>('SELECT COUNT(*) AS count FROM notification_outbox'),
      ).resolves.toEqual(beforeOutbox)
    })
  })
})
