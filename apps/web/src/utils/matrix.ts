import { siteConfig } from '../config/site'
import type { City, District } from '../data/locations'
import { lvivCity, oblastCities } from '../data/locations'
import { seoPages } from '../data/seo-pages'
import { getLocalePrefix, getStaticLocaleParam, type Locale } from '../i18n/ui'
import type { FaqItem, MatrixPage, SeoPage } from '../types/seo'
import { interpolate, validateDescription, validateTitle } from './templates'

/**
 * Appends a localized FAQ item to the predefined page FAQ.
 */
function buildLocationFaqItem(locale: Locale, city: City, district?: District): FaqItem {
  const locative = district ? district.nameLocative[locale] : city.nameLocative[locale]
  const travelTime = district ? district.travelMinutes : siteConfig.defaultTravelTimeMins

  if (locale === 'uk') {
    return {
      question: `Скільки часу чекати лікаря ${locative}?`,
      answer: `Наш фахівець здійснює виїзд ${locative} максимально швидко. Середній час прибуття становить ${travelTime} хвилин. Ми працюємо цілодобово.`,
    }
  }

  // Russian
  return {
    question: `Сколько времени ждать врача ${locative}?`,
    answer: `Наш специалист осуществляет выезд ${locative} максимально быстро. Среднее время прибытия составляет ${travelTime} минут. Мы работаем круглосуточно.`,
  }
}

/**
 * Core engine to build a single MatrixPage for a specific locale.
 */
export function expandToMatrixPage(
  page: SeoPage,
  locale: Locale,
  city: City,
  district?: District,
): MatrixPage {
  if (!page.templates) {
    throw new Error(
      `[matrix.ts] Page ${page.slug} has no templates but matrix generation was requested.`,
    )
  }

  const localeData = page[locale]
  const templates = page.templates[locale]

  // Build context for interpolation (using localized strings)
  const ctx = {
    service: localeData.serviceName,
    city: city.name[locale],
    cityLocative: city.nameLocative[locale],
    district: district?.name[locale] || '',
    districtLocative: district?.nameLocative[locale] || '',
    price: localeData.price,
    travelTime: district ? `${district.travelMinutes} хв` : '30-60 хв',
    phone: siteConfig.phone.display, // Placeholder or from config
  }

  // Choose templates based on whether it's a district or city page
  const titleTpl = district ? templates.titleDistrict : templates.titleCity
  const descTpl = district ? templates.descriptionDistrict : templates.descriptionCity
  const h1Tpl = district ? templates.h1District : templates.h1City
  const bodyTpl = district ? templates.bodyDistrict : templates.bodyCity

  // Interpolate
  const title = interpolate(titleTpl, ctx)
  const description = interpolate(descTpl, ctx)
  const h1 = interpolate(h1Tpl, ctx)
  const body = interpolate(bodyTpl, ctx)

  // Validate (simple length checks)
  validateTitle(title, district ? 'titleDistrict' : 'titleCity')
  validateDescription(description, district ? 'descriptionDistrict' : 'descriptionCity')

  // URL generation
  const localePrefix = getLocalePrefix(locale)
  // getLocalePrefix returns '' or '/ru', but canonical URLs need no leading slash
  const canonicalPrefix = localePrefix ? localePrefix.slice(1) + '/' : ''
  const canonicalUrl = `${siteConfig.url}/${canonicalPrefix}${localeData.slug}`

  const locationFaq = buildLocationFaqItem(locale, city, district)

  return {
    params: {
      locale: getStaticLocaleParam(locale),
      city: city.slug,
      district: district?.slug,
      slug: localeData.slug,
    },
    seo: {
      title,
      description,
    },
    content: {
      h1,
      price: localeData.price,
      priceNumeric: page.priceNumeric,
      duration: page.duration,
      description: body,
      faq: [...localeData.faq, locationFaq],
      dateModified: page.dateModified,
      relatedSlugs: page.relatedSlugs,
      badge: page.badge,
      surzhykAlt: localeData.surzhykAlt,
    },
    canonicalUrl,
    location: {
      citySlug: city.slug,
      cityName: city.name[locale],
      cityNameLocative: city.nameLocative[locale],
      districtSlug: district?.slug,
      districtName: district?.name[locale],
      districtNameLocative: district?.nameLocative[locale],
      travelMinutes: district?.travelMinutes,
    },
    serviceSlug: page.slug,
    locale,
  }
}

/**
 * Generates pages for ALL oblast cities for both UK and RU locales.
 */
export function generateCityPages(): MatrixPage[] {
  const pages: MatrixPage[] = []
  const validServices = seoPages.filter((p) => !!p.templates)
  const locales: Locale[] = ['uk', 'ru']

  for (const service of validServices) {
    for (const locale of locales) {
      // Oblast cities
      for (const city of oblastCities) {
        pages.push(expandToMatrixPage(service, locale, city))
      }
      // Lviv city level
      pages.push(expandToMatrixPage(service, locale, lvivCity))
    }
  }

  return pages
}

/**
 * Generates pages for ALL Lviv districts for both UK and RU locales.
 */
export function generateDistrictPages(): MatrixPage[] {
  const pages: MatrixPage[] = []
  const validServices = seoPages.filter((p) => !!p.templates)
  const locales: Locale[] = ['uk', 'ru']

  for (const service of validServices) {
    for (const locale of locales) {
      for (const district of lvivCity.districts) {
        pages.push(expandToMatrixPage(service, locale, lvivCity, district))
      }
    }
  }

  return pages
}

/**
 * For verification
 */
export function getMatrixPageCount(): { cities: number; districts: number; total: number } {
  const cities = generateCityPages().length
  const districts = generateDistrictPages().length
  return { cities, districts, total: cities + districts }
}
