import type { LeadPayload } from '@/types/lead/lead-payload.type'

export const NOTIFICATION_TEMPLATES = {
  NEW_LEAD_HEADER: '<b>Нова заявка: HAVENHUB</b>',
  SEPARATOR: '------------------',
  NAME_PREFIX: "<b>👤 Ім'я:</b>",
  PHONE_PREFIX: '<b>📞 Тел:</b>',
  DISTRICT_PREFIX: '<b>📍 Район:</b>',
  SERVICES_PREFIX: '<b>💊 Послуги:</b>',
  SOURCE_PREFIX: '<b>📌 Джерело:</b>',
} as const

const escapeHtml = (value: string) =>
  value.replace(/[&<>]/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      default:
        return '&gt;'
    }
  })

export const formatLeadNotification = (lead: LeadPayload): string => {
  const details = [
    lead.district && `${NOTIFICATION_TEMPLATES.DISTRICT_PREFIX} ${escapeHtml(lead.district)}`,
    lead.services.length > 0 &&
      `${NOTIFICATION_TEMPLATES.SERVICES_PREFIX} ${lead.services.map(escapeHtml).join(', ')}`,
    lead.source && `${NOTIFICATION_TEMPLATES.SOURCE_PREFIX} ${escapeHtml(lead.source)}`,
  ].filter(Boolean)

  return (
    `${NOTIFICATION_TEMPLATES.NEW_LEAD_HEADER}\n` +
    `${NOTIFICATION_TEMPLATES.SEPARATOR}\n` +
    `${NOTIFICATION_TEMPLATES.NAME_PREFIX} ${escapeHtml(lead.name)}\n` +
    `${NOTIFICATION_TEMPLATES.PHONE_PREFIX} ${escapeHtml(lead.phone)}` +
    (details.length > 0 ? `\n${details.join('\n')}` : '')
  )
}
