export type ApprovalStatus = 'CONFIRMED' | 'PROPOSED' | 'BLOCKED'

export interface ServiceContent {
  slug: string
  title: string
  introduction: string
  facts: string[]
  process: string[]
  faq: { question: string; answer: string }[]
  approvalStatus: ApprovalStatus
  contentOwner: string | null
  source: string | null
  lastConfirmed: string | null
}

export function isPublishableService(service: ServiceContent): boolean {
  const date = service.lastConfirmed
  if (
    service.approvalStatus !== 'CONFIRMED' ||
    !service.contentOwner?.trim() ||
    !service.source?.trim() ||
    !date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return false
  }

  const parsed = new Date(`${date}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

// Add owner-reviewed entries only after their source and confirmation date exist.
export const services: ServiceContent[] = []

export const servicePreview: ServiceContent = {
  slug: 'template-demo',
  title: 'Демонстраційна сторінка послуги',
  introduction: 'Це локальний зразок структури. Тут немає опису реальної послуги.',
  facts: [
    'Демонстраційне поле для перевіреного опису.',
    'Демонстраційне поле для важливої умови.',
    'Демонстраційне поле для обмеження.',
  ],
  process: [
    'Демонстраційний крок 1 — текст після погодження.',
    'Демонстраційний крок 2 — текст після погодження.',
    'Демонстраційний крок 3 — текст після погодження.',
  ],
  faq: [
    {
      question: 'Це опис реальної послуги?',
      answer: 'Ні. Це демонстраційні дані для перегляду шаблону.',
    },
    {
      question: 'Чи можна надіслати звернення з цієї сторінки?',
      answer:
        'Ні. Надсилання звернень стане доступним після окремої специфікації доставки й конфіденційності.',
    },
  ],
  approvalStatus: 'PROPOSED',
  contentOwner: null,
  source: 'DEMO_ONLY',
  lastConfirmed: null,
}
