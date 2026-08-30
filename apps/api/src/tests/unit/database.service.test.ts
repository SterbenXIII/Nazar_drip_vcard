import { afterEach, describe, expect, it, vi } from 'vitest'

const { providerConstructor } = vi.hoisted(() => ({
  providerConstructor: vi.fn(),
}))

vi.mock('@/services/providers/database/sqlite-database.provider', () => ({
  SqliteDatabaseProvider: class {
    constructor(config: unknown, schema: unknown) {
      providerConstructor(config, schema)
    }

    initialize(): void {}

    close(): Promise<void> {
      return Promise.resolve()
    }
  },
}))

import { DatabaseService } from '@/services/database.service'

describe('DatabaseService', () => {
  afterEach(async () => {
    await DatabaseService.reset()
    providerConstructor.mockClear()
  })

  it('passes an explicit database path to the provider', () => {
    const testDbPath = '/tmp/vcard-api-integration/leads.db'

    DatabaseService.getInstance(testDbPath)

    expect(providerConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: testDbPath }),
      expect.anything(),
    )
  })
})
