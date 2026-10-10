export type ClaimCurrentness = 'OWNER_CONFIRMED_FOR_DRAFT' | 'UNVERIFIED'
export type ClaimStatus = 'DRAFT_CONFIRMED' | 'PENDING_VERIFICATION'

export interface ClaimRecord {
  id: string
  subject: string
  exactClaim: string
  sources: string[]
  status: ClaimStatus
  evidenceReceived: boolean
  currentness: ClaimCurrentness
  priorOwnerConfirmation: string | null
  contradictions: string[]
  verificationNeeded: string[]
  publicDraft: string | null
  routes: string[]
  productionApproval: 'PENDING'
  recheckDate: null
}

export const claimRegister: ClaimRecord[] = [
  {
    id: 'dependency-types',
    subject: 'Напрями залежності',
    exactClaim: 'Алкогольна, ігрова та наркотична залежність.',
    sources: ['01-scope-decisions.md, P1; customer-materials.ts'],
    status: 'DRAFT_CONFIRMED',
    evidenceReceived: true,
    currentness: 'OWNER_CONFIRMED_FOR_DRAFT',
    priorOwnerConfirmation: 'Три напрями підтверджені власником для локального draft у P1.',
    contradictions: [],
    verificationNeeded: ['Повторно підтвердити обсяг напрямів перед production.'],
    publicDraft: 'Алкогольна, ігрова та наркотична залежність.',
    routes: ['/'],
    productionApproval: 'PENDING',
    recheckDate: null,
  },
  {
    id: 'care-format-names',
    subject: 'Формати допомоги',
    exactClaim: 'Стаціонарна програма, амбулаторна програма, виїзд додому.',
    sources: ['01-scope-decisions.md, P1; customer-materials.ts'],
    status: 'DRAFT_CONFIRMED',
    evidenceReceived: true,
    currentness: 'OWNER_CONFIRMED_FOR_DRAFT',
    priorOwnerConfirmation: 'Три формати підтверджені власником для локального draft у P1.',
    contradictions: [],
    verificationNeeded: [
      'Повторно підтвердити поточну доступність кожного формату перед production.',
    ],
    publicDraft: 'Стаціонарна програма, амбулаторна програма, виїзд додому.',
    routes: ['/'],
    productionApproval: 'PENDING',
    recheckDate: null,
  },
  {
    id: 'center-location',
    subject: 'Локація центру',
    exactClaim: 'Центр розташований у Львівській області.',
    sources: ['01-scope-decisions.md, G1; customer-materials.ts'],
    status: 'DRAFT_CONFIRMED',
    evidenceReceived: true,
    currentness: 'OWNER_CONFIRMED_FOR_DRAFT',
    priorOwnerConfirmation: 'Локацію в області підтверджено власником для локального draft у G1.',
    contradictions: [],
    verificationNeeded: ['Не публікувати адресу без окремого підтвердження.'],
    publicDraft: 'Центр розташований у Львівській області.',
    routes: ['/'],
    productionApproval: 'PENDING',
    recheckDate: null,
  },
  {
    id: 'home-visit-area',
    subject: 'Географія виїзду додому',
    exactClaim: 'Виїзд додому у Львові та Львівській області.',
    sources: ['01-scope-decisions.md, G2; customer-materials.ts'],
    status: 'DRAFT_CONFIRMED',
    evidenceReceived: true,
    currentness: 'OWNER_CONFIRMED_FOR_DRAFT',
    priorOwnerConfirmation: 'Географію виїзду підтверджено власником для локального draft у G2.',
    contradictions: [],
    verificationNeeded: ['Повторно звірити доступність виїзду в регіоні перед production.'],
    publicDraft: 'Виїзд додому у Львові та Львівській області.',
    routes: ['/'],
    productionApproval: 'PENDING',
    recheckDate: null,
  },
  {
    id: 'source-home-visit',
    subject: 'Виїзд додому',
    exactClaim:
      'У 7.pdf описано цілодобовий номер, оперативний виїзд спеціалізованої бригади, огляд, ЕКГ за потреби, медикаментозну допомогу та план подальших дій.',
    sources: ['customer-materials/7.pdf, сторінки 1–2; отримано 2026-10-10'],
    status: 'PENDING_VERIFICATION',
    evidenceReceived: true,
    currentness: 'UNVERIFIED',
    priorOwnerConfirmation:
      'Виїзд додому у Львові та Львівській області (01-scope-decisions.md, G2).',
    contradictions: [
      'Опис цілодобової гарячої лінії не підтверджує цілодобовий виїзд чи строк прибуття.',
      'Заяви про повну конфіденційність, кваліфікацію та медичні втручання не підтверджені окремо.',
    ],
    verificationNeeded: [
      'Чи доступна послуга зараз і в яких населених пунктах.',
      'Медична перевірка складу послуги, виконавців, показань та обмежень.',
      'Правова й редакційна перевірка тверджень про конфіденційність.',
    ],
    publicDraft: null,
    routes: ['/'],
    productionApproval: 'PENDING',
    recheckDate: null,
  },
  {
    id: 'source-outpatient',
    subject: 'Амбулаторна програма',
    exactClaim:
      'DOCX описує програму тривалістю один місяць, вісім консультацій з адиктологом, психіатричний супровід, медикаментозну терапію за показаннями та персонального ведучого консультанта.',
    sources: [
      'customer-materials/Амбулаторна програма.txt.docx, розділи «Що входить у пакет» та «Персональний ведучий консультант»; отримано 2026-10-10',
    ],
    status: 'PENDING_VERIFICATION',
    evidenceReceived: true,
    currentness: 'UNVERIFIED',
    priorOwnerConfirmation:
      'Амбулаторна програма названа форматом допомоги (01-scope-decisions.md, P1).',
    contradictions: [
      'Тривалість, кількість консультацій, ролі й безперервний супровід не підтверджені попереднім owner-рішенням.',
      'Опис виїзду з 7.pdf не є підтвердженням амбулаторної програми або її місячного пакета.',
    ],
    verificationNeeded: [
      'Актуальність програми та склад пакета.',
      'Медична перевірка ролей, консультацій, медикаментів і терапевтичних тверджень.',
      'Підтвердження фактичної доступності заявленої тривалості й кількості зустрічей.',
    ],
    publicDraft: null,
    routes: ['/'],
    productionApproval: 'PENDING',
    recheckDate: null,
  },
  {
    id: 'source-residential',
    subject: 'Стаціонарна програма',
    exactClaim:
      'PDF описує реабілітацію, детоксикацію, роботу з психологами й психотерапевтами, ресоціалізацію, постійний супровід та очікувані результати.',
    sources: ['customer-materials/Стаціонарна програма.pdf, сторінки 1–2; отримано 2026-10-10'],
    status: 'PENDING_VERIFICATION',
    evidenceReceived: true,
    currentness: 'UNVERIFIED',
    priorOwnerConfirmation:
      'Стаціонарна програма названа форматом допомоги (01-scope-decisions.md, P1).',
    contradictions: [
      'Опис безпечного й ізольованого середовища та повного одужання не є доказом безпеки або результату.',
      'Попередній бриф не підтверджує детоксикацію, правила перебування, команду чи безперервний супровід.',
    ],
    verificationNeeded: [
      'Актуальні правила стаціонару й межі послуг.',
      'Медична перевірка етапів, методів, ролей і заяв про результати.',
      'Підтвердження доступності та фактичних умов перебування.',
    ],
    publicDraft: null,
    routes: ['/'],
    productionApproval: 'PENDING',
    recheckDate: null,
  },
  {
    id: 'hotline-availability',
    subject: 'Гаряча лінія',
    exactClaim: 'Гаряча лінія працює 24/7.',
    sources: ['01-scope-decisions.md, C1; customer-materials.ts'],
    status: 'DRAFT_CONFIRMED',
    evidenceReceived: true,
    currentness: 'OWNER_CONFIRMED_FOR_DRAFT',
    priorOwnerConfirmation: 'Підтверджено власником для локального draft у C1.',
    contradictions: [],
    verificationNeeded: ['Повторно звірити номер і режим роботи перед production.'],
    publicDraft: 'Гаряча лінія 24/7.',
    routes: ['/'],
    productionApproval: 'PENDING',
    recheckDate: null,
  },
  {
    id: 'free-first-consultation',
    subject: 'Перша первинна консультація',
    exactClaim: 'Перша первинна консультація безкоштовна.',
    sources: ['01-scope-decisions.md, C2; customer-materials.ts'],
    status: 'DRAFT_CONFIRMED',
    evidenceReceived: true,
    currentness: 'OWNER_CONFIRMED_FOR_DRAFT',
    priorOwnerConfirmation: 'Підтверджено власником для локального draft у C2.',
    contradictions: [],
    verificationNeeded: ['Повторно підтвердити формулювання й умови перед production.'],
    publicDraft: 'Перша первинна консультація безкоштовна.',
    routes: ['/'],
    productionApproval: 'PENDING',
    recheckDate: null,
  },
  {
    id: 'price-after-consultation',
    subject: 'Визначення вартості',
    exactClaim: 'Вартість програми визначають після консультації.',
    sources: ['01-scope-decisions.md, C2; 08-copy-draft.md'],
    status: 'DRAFT_CONFIRMED',
    evidenceReceived: true,
    currentness: 'OWNER_CONFIRMED_FOR_DRAFT',
    priorOwnerConfirmation: 'Підтверджено власником для локального draft у C2.',
    contradictions: [],
    verificationNeeded: ['Повторно підтвердити процес перед production.'],
    publicDraft: 'Вартість визначають після консультації.',
    routes: ['/'],
    productionApproval: 'PENDING',
    recheckDate: null,
  },
]
