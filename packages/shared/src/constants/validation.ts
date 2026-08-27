export const VALIDATION_MESSAGES = {
  NAME_TOO_SHORT: "Ім'я надто коротке",
  PHONE_INVALID_FORMAT: 'Невірний формат номера (+380...)',
  DISTRICT_INVALID: 'Оберіть коректний район Львова',
  SERVICES_MIN_ONE: 'Оберіть хоча б одну послугу',
} as const

export const REGEX = {
  PHONE_UA: /^\+?380\d{9}$/,
} as const
