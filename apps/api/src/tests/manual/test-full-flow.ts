#!/usr/bin/env tsx
/**
 * Manual Test Script — Full Lead Submission Flow
 *
 * Тестує повний ланцюг обробки заявки:
 * 1. Ініціалізація бази даних
 * 2. Створення та відправка тестової заявки
 * 3. Перевірка збереження в SQLite
 * 4. Перевірка відправки сповіщень (Telegram + Gmail)
 *
 * Запуск:
 * pnpm --filter @vcard/api exec tsx src/tests/manual/test-full-flow.ts
 */

import 'dotenv/config'

import { ENV } from '@/config/env.config'
import { NotificationProvider } from '@/constants'
import { NotificationCoordinator } from '@/services/coordinators/notification.coordinator'
import { DatabaseService } from '@/services/database.service'
import type { LeadPayload, LeadRecord } from '@/types/lead/lead-payload.type'

console.log('\n🚀 Starting full flow manual test...\n')
console.log('═'.repeat(60))

try {
  // ═════════════════════════════════════════════════════════
  // 1️⃣ Database Initialization
  // ═════════════════════════════════════════════════════════
  console.log('\n1️⃣  Initializing database...')
  await DatabaseService.initializeOnStartup()
  console.log('    ✅ Database initialized successfully\n')

  // ═════════════════════════════════════════════════════════
  // 2️⃣ Create Test Lead
  // ═════════════════════════════════════════════════════════
  const testLead: LeadPayload = {
    name: 'Manual Test Patient',
    phone: '+380671234567',
    district: 'Франківський',
    services: ['Детокс-крапельниця', 'Внутрішньовенна інфузія', 'Вітамінний коктейль'],
    source: 'manual_test',
    timestamp: new Date(),
  }

  console.log('2️⃣  Synthetic test lead prepared')

  // ═════════════════════════════════════════════════════════
  // 3️⃣ Submit Lead
  // ═════════════════════════════════════════════════════════
  console.log('3️⃣  Submitting lead through NotificationCoordinator...')
  const coordinator = new NotificationCoordinator()
  await coordinator.handleIncomingLead(testLead)
  console.log('    ✅ Lead submitted successfully\n')

  // ═════════════════════════════════════════════════════════
  // 4️⃣ Verify Database Persistence
  // ═════════════════════════════════════════════════════════
  console.log('4️⃣  Verifying database persistence...')
  const db = DatabaseService.getInstance().getProvider()
  const results = await db.query<LeadRecord>(
    'SELECT * FROM leads WHERE phone = ? ORDER BY id DESC LIMIT 1',
    [testLead.phone],
  )

  if (results.length > 0 && results[0]) {
    console.log('    ✅ Persistence check passed\n')
  } else {
    console.error('    ❌ Lead not found in database!\n')
    process.exit(1)
  }

  // ═════════════════════════════════════════════════════════
  // 5️⃣ Verify Notifications (Manual Check)
  // ═════════════════════════════════════════════════════════
  console.log('5️⃣  Notifications sent to enabled providers:\n')

  const enabledProviders = ENV.ENABLED_PROVIDERS

  if (enabledProviders.includes(NotificationProvider.TELEGRAM)) {
    console.log('    📱 Telegram configured: yes')
    console.log('       ⚠️  MANUALLY CHECK: відкрий Telegram бот і перевір повідомлення\n')
  }

  if (enabledProviders.includes(NotificationProvider.EMAIL)) {
    console.log('    📧 SMTP configured: yes')
    console.log('       ⚠️  MANUALLY CHECK: перевір поштову скриньку Gmail\n')
  }

  // ═════════════════════════════════════════════════════════
  // 6️⃣ Database Stats
  // ═════════════════════════════════════════════════════════
  console.log('6️⃣  Database statistics:')
  const totalLeads = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM leads')
  const todayLeads = await db.query<{ count: number }>(
    "SELECT COUNT(*) as count FROM leads WHERE DATE(timestamp) = DATE('now')",
  )

  console.log(`    Total leads:  ${totalLeads[0]?.count ?? 0}`)
  console.log(`    Today's leads: ${todayLeads[0]?.count ?? 0}\n`)

  console.log('═'.repeat(60))
  console.log('✅ Full flow test completed successfully!\n')
  console.log('Next steps:')
  console.log('  1. Check Telegram bot for notification')
  console.log('  2. Check Gmail inbox for email')
  console.log('  3. Run: make db-check (to see last 5 leads)')
  console.log('  4. Test container restart: make down && make up\n')
} catch (error) {
  console.error('\n❌ Test failed with error:\n')
  console.error(error)
  console.log('\n═'.repeat(60))
  process.exit(1)
}
