export const siteConfig = {
  url: 'https://krapelnytsia.lviv.ua',
  businessName: 'Крапельниця Львів',
  businessNameRu: 'Капельница Львов',
  doctor: {
    name: { uk: 'Олексій Лещенко', ru: 'Алексей Лещенко' },
    jobTitle: { uk: 'Головний лікар, Нарколог', ru: 'Главный врач, Нарколог' },
  },
  phone: {
    raw: '+380634814077',
    display: '+38 (063) 481-40-77',
  },
  telegramUrl: 'https://t.me/KostyvL',
  openingHours: 'Mo-Su 00:00-23:59',
  defaultTravelTimeMins: 45,
  geo: {
    latitude: '49.8397',
    longitude: '24.0297',
  },
  address: {
    locality: 'Львів',
    region: 'Львівська область',
    country: 'UA',
  },
  social: {
    instagram: '', // Add if needed
    facebook: '', // Add if needed
  },
  analytics: {
    gtmId: 'GTM-K9N6B54V',
  },
} as const
