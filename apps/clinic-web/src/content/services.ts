export type ApprovalStatus = 'CONFIRMED' | 'PROPOSED' | 'BLOCKED'

export interface ServiceContent {
  slug: string
  title: string
  metaTitle?: string
  metaDescription?: string
  introduction: string
  facts: string[]
  process: string[]
  faq: { question: string; answer: string }[]
  approvalStatus: ApprovalStatus
  contentOwner: string | null
  source: string | null
  lastConfirmed: string | null
  medicalReview: { reviewer: string; source: string; recordedAt: string } | null
  operationalReview: { approver: string; recordedAt: string } | null
  publicationApproval: { approver: string; recordedAt: string } | null
}

function hasValidDate(date: string | null): boolean {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false

  const parsed = new Date(`${date}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

export function isPublishableService(service: ServiceContent): boolean {
  if (
    service.approvalStatus !== 'CONFIRMED' ||
    !service.contentOwner?.trim() ||
    !service.source?.trim() ||
    !hasValidDate(service.lastConfirmed) ||
    service.medicalReview?.reviewer !== 'Давидок Вікторія Юріївна' ||
    !service.medicalReview.source.trim() ||
    !hasValidDate(service.medicalReview.recordedAt) ||
    service.operationalReview?.approver !== 'Антошків Станіслав Михайлович' ||
    !hasValidDate(service.operationalReview.recordedAt)
  ) {
    return false
  }
  return true
}

export function servicesForBuild(
  mode: 'normal' | 'staging' | 'production',
  candidates: ServiceContent[] = services,
): ServiceContent[] {
  if (mode === 'normal') return []
  return candidates.filter(
    (service) =>
      isPublishableService(service) &&
      (mode === 'staging' ||
        (service.publicationApproval?.approver === 'Антошків Станіслав Михайлович' &&
          hasValidDate(service.publicationApproval.recordedAt))),
  )
}

export function serviceStaticPath(service: ServiceContent) {
  return { params: { slug: service.slug }, props: { service } }
}

// The date records receipt of the user's report, not the reviewers' original sign-off date.
const review = {
  approvalStatus: 'CONFIRMED' as const,
  contentOwner: 'Антошків Станіслав Михайлович',
  source: 'HAVENHUB content review v1; user reported both named approvals on 2026-10-29',
  lastConfirmed: '2026-10-29',
  medicalReview: {
    reviewer: 'Давидок Вікторія Юріївна',
    source: 'User-reported approval of HAVENHUB content review v1',
    recordedAt: '2026-10-29',
  },
  operationalReview: {
    approver: 'Антошків Станіслав Михайлович',
    recordedAt: '2026-10-29',
  },
  publicationApproval: null,
}

export const services: ServiceContent[] = [
  {
    ...review,
    slug: 'alkoholna-zalezhnist',
    title: 'Допомога при алкогольній залежності у Львові та області',
    metaTitle: 'Лікування алкогольної залежності — Львів і область | HAVENHUB',
    metaDescription:
      'Допомога при алкогольній залежності: стаціонар у Ременеві, амбулаторна програма у Львові та виїзд нарколога. Звернення 24/7. HAVENHUB.',
    introduction:
      'Формат допомоги обговорюють з урахуванням стану людини та її ситуації. HAVENHUB пропонує стаціонарну програму в Ременеві, амбулаторну допомогу у Львові та виїзд лікаря-нарколога у Львові й області.',
    facts: [
      'Під час первинного огляду лікар оцінює стан і визначає можливий медикаментозний супровід. За словами центру, лікар спостерігає за перебігом абстиненції. У випадках, які потребують іншого рівня допомоги, центр направляє людину до лікарні та може здійснювати подальший супровід.',
      'У стаціонарній програмі застосовується Мінесотська модель із психологічною підтримкою, груповою роботою та принципами «12 кроків». Опис медикаментозного супроводу й умов його застосування визначає лікар. Амбулаторний формат має окрему програму: роботу з психологом і супровід консультанта з хімічної залежності. Центр описує її як авторську програму з елементами НЛП та КПТ.',
      'Кодування центр не проводить. Результати індивідуальні; програма не замінює невідкладної медичної допомоги.',
      'Початкова вартість, надана центром, — від 15 000 грн. Уточніть склад послуг, тривалість і підсумкову вартість під час звернення.',
    ],
    process: [
      'Зателефонуйте на гарячу лінію, щоб обговорити наступний крок. Звернення й виїзд нарколога доступні 24/7.',
    ],
    faq: [],
  },
  {
    ...review,
    slug: 'narkotychna-zalezhnist',
    title: 'Допомога при наркотичній залежності у Львові та області',
    metaTitle: 'Лікування наркотичної залежності — Львів і область | HAVENHUB',
    metaDescription:
      'HAVENHUB: допомога при наркотичній залежності, стаціонар у Ременеві й амбулаторний формат у Львові. Виїзд нарколога по місту та області 24/7.',
    introduction:
      'Перший крок — обговорення ситуації та оцінювання стану лікарем. Можливість медикаментозного супроводу, детоксикації та формат подальшої допомоги визначають індивідуально.',
    facts: [
      'Під час детоксикації лікар оцінює стан, визначає призначення та спостерігає за перебігом абстиненції. Частина випадків потребує направлення до лікарні. Центр повідомляє, що після такого направлення може надавати подальший супровід. Лікування вдома підходить не для кожної ситуації.',
      'Стаціонарна реабілітація відбувається у Ременеві за Мінесотською моделлю з психологічною підтримкою, груповою роботою та принципами «12 кроків». Амбулаторна програма у Львові передбачає роботу з психологом і супровід консультанта з хімічної залежності; центр описує її як авторську програму з елементами НЛП та КПТ.',
      'Виїзд лікаря-нарколога доступний 24/7 у Львові та Львівській області через гарячу лінію. Час прибуття й можливість конкретної допомоги уточнюють під час звернення. Послуга не замінює невідкладної медичної допомоги.',
      'Початкова вартість, надана центром, — від 20 000 грн. Уточніть склад послуг, тривалість і підсумкову вартість під час звернення. Гарантований результат або строк одужання не обіцяються.',
    ],
    process: ['Зателефонуйте, щоб обговорити ситуацію та доступний формат допомоги.'],
    faq: [],
  },
  {
    ...review,
    slug: 'ihrova-zalezhnist',
    title: 'Допомога при ігровій залежності у Львові та області',
    metaTitle: 'Допомога при ігроманії — Львів і область | HAVENHUB',
    metaDescription:
      'Допомога при ігровій залежності у HAVENHUB: індивідуальна й групова робота з психологом, підтримка близьких. Звернення 24/7.',
    introduction:
      'Якщо азартні ігри впливають на повсякденне життя або стосунки, у HAVENHUB можна обговорити ситуацію та можливі наступні кроки. Звернутися може сама людина або її близькі.',
    facts: [
      'У початкових матеріалах центру описані індивідуальна та групова робота з психологом, робота з тригерами й відновлення соціальних навичок. Конкретний формат і зміст програми потрібно узгодити з фахівцем.',
      'Стаціонарний центр розташований у Ременеві; амбулаторна допомога доступна у Львові. Відповідність кожного формату конкретній ситуації обговорюють окремо. Застосування Мінесотської моделі саме до ігрової залежності цією редакцією не заявляється.',
      'Початкова вартість, надана центром, — від 15 000 грн. Уточніть склад послуг, тривалість і підсумкову вартість під час звернення. Гарантованого результату або строку одужання немає.',
    ],
    process: ['Зателефонуйте на гарячу лінію. Звернення приймаються 24/7.'],
    faq: [],
  },
]

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
  medicalReview: null,
  operationalReview: null,
  publicationApproval: null,
}
