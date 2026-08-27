export const API_ROUTES = {
  LEAD_SUBMIT: '/leads/submit',
  LEADS: '/leads',
  TELEGRAM_WEBHOOK: '/telegram/webhook',
} as const

export type ApiRoute = (typeof API_ROUTES)[keyof typeof API_ROUTES]
