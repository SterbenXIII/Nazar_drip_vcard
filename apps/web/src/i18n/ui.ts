export const SUPPORTED_LOCALES = {
  UK: 'uk',
  RU: 'ru',
} as const

export type Locale = (typeof SUPPORTED_LOCALES)[keyof typeof SUPPORTED_LOCALES]

export const languages: Record<Locale, string> = {
  [SUPPORTED_LOCALES.UK]: 'Українська',
  [SUPPORTED_LOCALES.RU]: 'Русский',
}

export const defaultLang: Locale = SUPPORTED_LOCALES.UK

export const HREFLANG_BY_LOCALE: Record<Locale, `${Locale}-UA`> = {
  [SUPPORTED_LOCALES.UK]: 'uk-UA',
  [SUPPORTED_LOCALES.RU]: 'ru-UA',
}

export function getHreflang(locale: Locale): `${Locale}-UA` {
  return HREFLANG_BY_LOCALE[locale]
}

/** Safely parse locale from Astro.params without type assertion */
export function getActiveLocale(localeParam?: string | undefined): Locale {
  return localeParam === SUPPORTED_LOCALES.RU ? SUPPORTED_LOCALES.RU : SUPPORTED_LOCALES.UK
}

export const ui = {
  [SUPPORTED_LOCALES.UK]: {
    'nav.home': 'Головна',
    'nav.backHome': '← Повернутися на головну',
    'nav.backService': '← Повернутися до опису послуги',

    'section.faq': 'Часті запитання',
    'section.usefulArticles': 'Корисні статті та послуги',

    'service.price': 'Ціна',
    'service.duration': 'Тривалість',
    'service.durationLabel': 'Тривалість:',
    'service.safetyLabel': 'Безпека:',
    'service.safetyValue': 'Стерильний набір',
    'service.name': 'Послуга',
    'service.details': 'Детальніше',

    'action.telegram': 'Написати в Telegram',
    'action.call': 'Зателефонувати',
    'action.downloadPng': '⬇ Завантажити PNG',
    'action.downloadPdf': '⬇ Завантажити PDF',
    'action.print': '🖨 Друк',
    'action.open': 'Відкрити',

    'a11y.skipToOrder': 'Перейти до основного вмісту',

    'toc.title': 'Зміст',
    'toc.label': 'Зміст сторінки',

    'section.cities': 'Міста обслуговування',
    'section.districts': 'Райони обслуговування',

    'district.heading': 'Обслуговуємо всі райони Львова',
    'district.subheading': 'Швидкий виїзд спеціаліста у ваш район протягом 15–40 хвилин.',
    'district.arrival': 'Виїзд: ~',
    'district.minutes': 'хв',

    'coverage.districts': 'Виїзд спеціаліста у райони Львова:',
    'coverage.cities': 'Також обслуговуємо міста Львівської області:',
    'coverage.label': 'Зони покриття послуги',

    'related.heading': 'Схожі послуги у Львові',
    'related.label': 'Схожі послуги',

    'breadcrumb.service': 'Послуга',

    'cert.title': 'Сертифікат',
    'cert.header': 'Сертифікат: Український інститут практичної адиктології',
    'cert.lead': 'Тут ви можете переглянути та завантажити оригінал сертифіката.',
    'cert.numLabel': 'Номер сертифіката',
    'cert.dateLabel': 'Дата видачі',
    'cert.recipientLabel': 'Отримувач',
    'cert.share': 'Поділитися',
    'cert.caption':
      'Сертифікат організації (PNG). Якщо зображення не відображається — натисніть «Відкрити».',
    'cert.close': 'Закрити',
    'cert.lightboxAlt': 'Збільшений сертифікат',
    'cert.seoTitle': 'Сертифікат медичного спеціаліста {certNumber} | Крапельниця Львів',
    'cert.seoDescription':
      'Офіційний сертифікат № {certNumber} від {issueDate}. Підтвердження кваліфікації медичного спеціаліста для надання послуг крапельниць на дому у Львові.',
    'cert.orgName': 'ГО Український інститут практичної адиктології',

    'action.backHome': '← Повернутися на головну',

    'city.title': 'Послуги у місті {city} | Крапельниця Львів',
    'city.description':
      'Повний перелік медичних послуг у місті {city}. Виїзд по всіх районах, анонімно та цілодобово.',
    'city.h1': 'Медична допомога {cityLocative}',
    'city.intro':
      'Ми надаємо кваліфіковану медичну допомогу по всьому місту {city}. Наші спеціалісти готові виїхати до вас у будь-який час.',

    // Page-specific surzhyk
    'seo.home.surzhykAlt': 'капельница львів, вивід із запою ціна',
    'seo.cert.surzhykAlt': 'сертифікат спеціаліста, капельница львов',

    'seo.howToPrefix': 'Як проходить',
  },
  [SUPPORTED_LOCALES.RU]: {
    'nav.home': 'Главная',
    'nav.backHome': '← Вернуться на главную',
    'nav.backService': '← Вернуться к описанию услуги',

    'section.faq': 'Частые вопросы',
    'section.usefulArticles': 'Полезные статьи и услуги',

    'service.price': 'Цена',
    'service.duration': 'Длительность',
    'service.durationLabel': 'Длительность:',
    'service.safetyLabel': 'Безопасность:',
    'service.safetyValue': 'Стерильный набор',
    'service.name': 'Услуга',
    'service.details': 'Подробнее',

    'action.telegram': 'Написать в Telegram',
    'action.call': 'Позвонить',
    'action.downloadPng': '⬇ Скачать PNG',
    'action.downloadPdf': '⬇ Скачать PDF',
    'action.print': '🖨 Печать',
    'action.open': 'Открыть',

    'a11y.skipToOrder': 'Перейти к основному содержимому',

    'toc.title': 'Содержание',
    'toc.label': 'Содержание страницы',

    'section.cities': 'Города обслуживания',
    'section.districts': 'Районы обслуживания',

    'district.heading': 'Обслуживаем все районы Львова',
    'district.subheading': 'Быстрый выезд специалиста в ваш район в течение 15–40 минут.',
    'district.arrival': 'Выезд: ~',
    'district.minutes': 'мин',

    'coverage.districts': 'Выезд специалиста по районам Львова:',
    'coverage.cities': 'Также обслуживаем города Львовской области:',
    'coverage.label': 'Зоны покрытия услуги',

    'related.heading': 'Похожие услуги во Львове',
    'related.label': 'Похожие услуги',

    'breadcrumb.service': 'Услуга',

    'cert.title': 'Сертификат',
    'cert.header': 'Сертификат: Украинский институт практической аддиктологии',
    'cert.lead': 'Здесь вы можете просмотреть и скачать оригинал сертификата.',
    'cert.numLabel': 'Номер сертификата',
    'cert.dateLabel': 'Дата выдачи',
    'cert.recipientLabel': 'Получатель',
    'cert.share': 'Поделиться',
    'cert.caption':
      'Сертификат организации (PNG). Если изображение не отображается — нажмите «Открыть».',
    'cert.close': 'Закрыть',
    'cert.lightboxAlt': 'Увеличенный сертификат',
    'cert.seoTitle': 'Сертификат медицинского специалиста {certNumber} | Капельница Львов',
    'cert.seoDescription':
      'Официальный сертификат № {certNumber} от {issueDate}. Подтверждение квалификации медицинского специалиста для предоставления услуг капельниц на дому во Львове.',
    'cert.orgName': 'ОО Украинский институт практической аддиктологии',

    'action.backHome': '← Вернуться на главную',

    'city.title': 'Услуги в городе {city} | Крапельниця Львів',
    'city.description':
      'Полный перечень медицинских услуг в городе {city}. Выезд по всем районам, анонимно и круглосуточно.',
    'city.h1': 'Медицинская помощь {cityLocative}',
    'city.intro':
      'Мы оказываем квалифицированную медицинскую помощь по всему городу {city}. Наши специалисты готовы выехать к вам в любое время.',

    // Page-specific surzhyk
    'seo.home.surzhykAlt': 'капельница львов, вывод из запоя цена',
    'seo.cert.surzhykAlt': 'сертификат специалиста, крапельниця львів',

    'seo.howToPrefix': 'Как проходит',
  },
} as const

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key]
  }
}

/** Get the opposite locale: uk → ru, ru → uk */
export function getAlternateLocale(locale: Locale): Locale {
  return locale === SUPPORTED_LOCALES.UK ? SUPPORTED_LOCALES.RU : SUPPORTED_LOCALES.UK
}

/** Get URL prefix for a locale: uk → '', ru → '/ru' */
export function getLocalePrefix(locale: Locale): string {
  return locale === defaultLang ? '' : `/${locale}`
}

/**
 * Build a full localized URL from a base URL and a path.
 * getLocalizedUrl('uk', '/some-slug')  → 'https://site.com/some-slug'
 * getLocalizedUrl('ru', '/some-slug')  → 'https://site.com/ru/some-slug'
 * getLocalizedUrl('uk', '/')           → 'https://site.com/'
 */
export function getLocalizedUrl(locale: Locale, path: string, siteUrl: string): string {
  const prefix = getLocalePrefix(locale)
  if (path === '/') return `${siteUrl}${prefix}/`
  const normalizedPath = path.startsWith('/') ? path : '/' + path
  return `${siteUrl}${prefix}${normalizedPath}`
}

/**
 * Get the locale param for getStaticPaths().
 * Default locale (uk) returns undefined to avoid prefix.
 */
export function getStaticLocaleParam(locale: Locale): string | undefined {
  return locale === defaultLang ? undefined : locale
}
