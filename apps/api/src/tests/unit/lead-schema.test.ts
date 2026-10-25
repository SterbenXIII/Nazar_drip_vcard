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

  it('accepts contact-only consultation requests', () => {
    expect(
      leadSchema.parse({
        name: 'Олена Тестова',
        phone: '+380671234567',
        source: 'clinic-web',
      }),
    ).toMatchObject({
      name: 'Олена Тестова',
      phone: '+380671234567',
      district: '',
      services: [],
    })
  })

  it('accepts empty optional fields from contact-only forms', () => {
    expect(
      leadSchema.parse({
        name: 'test',
        phone: '+380000000000',
        district: '',
        services: [],
        source: 'clinic-web',
      }),
    ).toMatchObject({
      district: '',
      services: [],
    })
  })

  it('trims names and normalizes common Ukrainian phone formats', () => {
    for (const phone of ['067 123-45-67', '380 67 123 45 67', '+380 (67) 123-45-67']) {
      expect(
        leadSchema.parse({
          name: '  Олена Тестова  ',
          phone,
        }),
      ).toMatchObject({
        name: 'Олена Тестова',
        phone: '+380671234567',
      })
    }
  })

  it('rejects blank, too-short, and too-long names', () => {
    for (const name of ['', '   ', 'А', 'А'.repeat(101)]) {
      expect(() => leadSchema.parse({ name, phone: '+380671234567' })).toThrow()
    }
  })

  it('rejects names without letters and accepts common name punctuation', () => {
    for (const name of ['234234', 'Іван2', '---']) {
      expect(() => leadSchema.parse({ name, phone: '+380671234567' })).toThrow()
    }

    for (const name of ["Жан-Люк О'Коннор", 'І. П. Петренко', 'Мар’яна']) {
      expect(leadSchema.parse({ name, phone: '+380671234567' }).name).toBe(name)
    }
  })

  it('rejects Ukrainian phone numbers with the wrong number of digits', () => {
    for (const phone of ['067123456', '+3806712345678', '+12025550123']) {
      expect(() => leadSchema.parse({ name: 'Олена', phone })).toThrow()
    }
  })

  it('rejects phone inputs longer than the displayed input limit', () => {
    const phone = `+380${' '.repeat(7)}671234567`

    expect(phone).toHaveLength(20)
    expect(() => leadSchema.parse({ name: 'Олена', phone })).toThrow()
  })
})
