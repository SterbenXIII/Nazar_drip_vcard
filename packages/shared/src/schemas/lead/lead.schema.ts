import { z } from 'zod'

import { DISTRICTS, REGEX, VALIDATION_LIMITS, VALIDATION_MESSAGES } from '../../constants/index.js'

const normalizeUkrainianPhone = (value: string) => {
  const compact = value.trim().replace(/[\s().-]/g, '')
  if (/^0\d{9}$/.test(compact)) return `+38${compact}`
  if (/^380\d{9}$/.test(compact)) return `+${compact}`
  return compact
}

export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.MIN_NAME_LENGTH, VALIDATION_MESSAGES.NAME_TOO_SHORT)
    .max(VALIDATION_LIMITS.MAX_NAME_LENGTH, VALIDATION_MESSAGES.NAME_TOO_LONG)
    .regex(REGEX.PERSON_NAME, VALIDATION_MESSAGES.NAME_INVALID_FORMAT),

  phone: z
    .string()
    .max(VALIDATION_LIMITS.MAX_PHONE_INPUT_LENGTH, VALIDATION_MESSAGES.PHONE_TOO_LONG)
    .transform(normalizeUkrainianPhone)
    .pipe(z.string().regex(REGEX.PHONE_UA, VALIDATION_MESSAGES.PHONE_INVALID_FORMAT)),

  district: z
    .preprocess(
      (district) => (district === '' ? undefined : district),
      z
        .enum(DISTRICTS, {
          message: VALIDATION_MESSAGES.DISTRICT_INVALID,
        })
        .optional(),
    )
    .transform((district) => district ?? ''),

  services: z
    .preprocess(
      (services) => (Array.isArray(services) && services.length === 0 ? undefined : services),
      z
        .array(z.string())
        .min(VALIDATION_LIMITS.MIN_SERVICES, VALIDATION_MESSAGES.SERVICES_MIN_ONE)
        .optional(),
    )
    .transform((services) => services ?? []),

  source: z.string().optional(),

  turnstileToken: z.string().optional(),
})

export type LeadPayload = z.infer<typeof leadSchema>
