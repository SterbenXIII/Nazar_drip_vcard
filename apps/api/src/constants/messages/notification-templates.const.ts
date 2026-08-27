import type { LeadPayload } from '@/types/lead/lead-payload.type'

export const NOTIFICATION_TEMPLATES = {
  NEW_LEAD_HEADER: '<b>🚑 Нова заявка: Emerald Recovery</b>',
  SEPARATOR: '------------------',
  NAME_PREFIX: "<b>👤 Ім'я:</b>",
  PHONE_PREFIX: '<b>📞 Тел:</b>',
  DISTRICT_PREFIX: '<b>📍 Район:</b>',
  SERVICES_PREFIX: '<b>💊 Послуги:</b>',
  SOURCE_PREFIX: '<b>📌 Джерело:</b>',
} as const

export const formatLeadNotification = (lead: LeadPayload): string => {
  const servicesText = lead.services.join(', ')
  const sourceText = lead.source ? `\n${NOTIFICATION_TEMPLATES.SOURCE_PREFIX} ${lead.source}` : ''

  return (
    `${NOTIFICATION_TEMPLATES.NEW_LEAD_HEADER}\n` +
    `${NOTIFICATION_TEMPLATES.SEPARATOR}\n` +
    `${NOTIFICATION_TEMPLATES.NAME_PREFIX} ${lead.name}\n` +
    `${NOTIFICATION_TEMPLATES.PHONE_PREFIX} ${lead.phone}\n` +
    `${NOTIFICATION_TEMPLATES.DISTRICT_PREFIX} ${lead.district}\n` +
    `${NOTIFICATION_TEMPLATES.SERVICES_PREFIX} ${servicesText}${sourceText}`
  )
}
