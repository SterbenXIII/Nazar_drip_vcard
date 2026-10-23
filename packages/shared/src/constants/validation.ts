export const VALIDATION_MESSAGES = {
  NAME_TOO_SHORT: "Ім'я надто коротке",
  NAME_TOO_LONG: "Ім'я має містити не більше 100 символів",
  NAME_INVALID_FORMAT: 'Ім’я може містити лише літери, пробіли, дефіс, апостроф або крапку',
  PHONE_TOO_LONG: 'Номер телефону надто довгий',
  PHONE_INVALID_FORMAT: 'Невірний формат номера (+380...)',
  DISTRICT_INVALID: 'Оберіть коректний район Львова',
  SERVICES_MIN_ONE: 'Оберіть хоча б одну послугу',
} as const

export const REGEX = {
  PERSON_NAME: /^(?:$|(?=.*\p{L})[\p{L}\p{M} '’ʼʻ.-]+)$/u,
  PHONE_UA: /^\+?380\d{9}$/,
} as const
