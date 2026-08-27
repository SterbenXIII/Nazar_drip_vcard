import { z } from 'zod'

import { DISTRICTS, REGEX, VALIDATION_LIMITS, VALIDATION_MESSAGES } from '../../constants'
export const leadSchema = z.object({
  name: z.string().min(VALIDATION_LIMITS.MIN_NAME_LENGTH, VALIDATION_MESSAGES.NAME_TOO_SHORT),
  phone: z.string().regex(REGEX.PHONE_UA, VALIDATION_MESSAGES.PHONE_INVALID_FORMAT),
  district: z.enum(DISTRICTS, {
    message: VALIDATION_MESSAGES.DISTRICT_INVALID,
  }),
  services: z
    .array(z.string())
    .min(VALIDATION_LIMITS.MIN_SERVICES, VALIDATION_MESSAGES.SERVICES_MIN_ONE),
  source: z.string().optional(),
  turnstileToken: z.string().optional(),
})
//# sourceMappingURL=lead.schema.js.map
