import { leadSchema } from '@vcard/shared'
import { describe, expect, it } from 'vitest'

const validLead = {
  name: 'Тестове ім’я',
  phone: '+380671234567',
  district: 'Центр',
  services: ['Детокс-крапельниця'],
}

describe('leadSchema contract', () => {
  it('strips unknown request keys intentionally', () => {
    const parsed = leadSchema.parse({ ...validLead, clientMetadata: 'ignored' })

    expect(parsed).not.toHaveProperty('clientMetadata')
  })

  it('does not invent uniqueness for repeated valid submissions', () => {
    expect(leadSchema.parse(validLead)).toEqual(leadSchema.parse(validLead))
  })
})
