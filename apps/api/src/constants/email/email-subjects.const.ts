export const EmailSubjects = {
  NEW_LEAD: '🚑 New Lead: Emerald Recovery',
  SYSTEM_ALERT: '⚠️ System Alert',
  TEST_EMAIL: '✅ Test Email',
} as const

export type EmailSubject = (typeof EmailSubjects)[keyof typeof EmailSubjects]
