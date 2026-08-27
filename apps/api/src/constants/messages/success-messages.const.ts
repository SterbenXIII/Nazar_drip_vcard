export const SUCCESS_MESSAGES = {
  LEAD_RECEIVED: 'Заявку отримано, очікуйте на дзвінок',
  OPERATION_SUCCESS: 'Operation completed successfully',
  WEBHOOK_RECEIVED: 'Webhook received successfully',
} as const

export type SuccessMessage = (typeof SUCCESS_MESSAGES)[keyof typeof SUCCESS_MESSAGES]
