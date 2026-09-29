import { siteConfig } from '../config/site'
import { SERVICE_PRICES } from '../data/pricing'
import { type Locale, useTranslations } from '../i18n/ui'
import type { BreadcrumbItem, MatrixPage, ReviewData, SeoPage } from '../types/seo'

export const BUSINESS_ID = `${siteConfig.url}/#business` as const

/** Canonical business identity — reused across all schemas */
export const BUSINESS = {
  '@id': BUSINESS_ID,
  '@type': 'MedicalBusiness',
  name: siteConfig.businessName,
  url: siteConfig.url,
  telephone: siteConfig.phone.raw,
  medicalSpecialty: 'EmergencyCare',
  priceRange: '₴₴',
  openingHours: [siteConfig.openingHours],
  sameAs: [
    siteConfig.telegramUrl,
    ...(siteConfig.social.instagram ? [siteConfig.social.instagram] : []),
    ...(siteConfig.social.facebook ? [siteConfig.social.facebook] : []),
  ],
  geo: {
    '@type': 'GeoCoordinates',
    latitude: siteConfig.geo.latitude,
    longitude: siteConfig.geo.longitude,
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: siteConfig.address.locality,
    addressRegion: siteConfig.address.region,
    addressCountry: siteConfig.address.country,
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5.0',
    reviewCount: '47',
    bestRating: '5',
  },
  areaServed: [
    'Львів',
    'Личаківський район',
    'Шевченківський район',
    'Сихівський район',
    'Залізничний район',
    'Галицький район',
    'Франківський район',
    'Левандівка',
    'Рясне',
    'Підзамче',
    'Приміська зона Львова',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: siteConfig.phone.raw,
    contactType: 'customer service',
    availableLanguage: 'Ukrainian',
    hoursAvailable: siteConfig.openingHours,
    contactOption: 'TollFree',
  },
} as const

/**
 * Generates a BreadcrumbList schema node.
 */
export function buildBreadcrumbSchema(items: readonly BreadcrumbItem[]): object {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * ItemList schema node for listing services.
 */
export function buildItemListSchema(items: readonly BreadcrumbItem[]): object {
  return {
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
    })),
  }
}

export const PERSON_ID = `${siteConfig.url}/#specialist` as const

/**
 * ImageObject schema node.
 */
export function buildImageObjectSchema(
  url: string,
  width: number = 200,
  height: number = 200,
): object {
  return {
    '@type': 'ImageObject',
    url: url,
    width: width,
    height: height,
  }
}

/**
 * Person schema for the medical specialist.
 */
export function buildPersonSchema(): object {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Кваліфікований медичний спеціаліст',
    description:
      'Медичний спеціаліст з досвідом понад 10 років у сфері наркології та детоксикації.',
    hasOccupation: {
      '@type': 'Occupation',
      name: 'Медична сестра / Медичний фельдшер',
      occupationalCategory: 'EmergencyCare',
    },
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'license',
      name: 'Сертифікат №OPK24-012',
      dateCreated: '2023-10-20',
      url: `${siteConfig.url}/certificate`,
      recognizedBy: {
        '@type': 'Organization',
        name: 'Громадська організація «Український інститут практичної адиктології»',
      },
    },
    image: buildImageObjectSchema(`${siteConfig.url}/assets/avatar.webp`),
    worksFor: { '@id': BUSINESS_ID },
  }
}

/**
 * WebPage / MedicalWebPage schema node.
 */
export function buildWebPageSchema(
  pageUrl: string,
  pageName: string,
  dateModified: string,
  locale: Locale = 'uk',
): object {
  return {
    '@type': ['WebPage', 'MedicalWebPage'],
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: pageName,
    isPartOf: { '@id': BUSINESS_ID },
    dateModified: dateModified,
    lastReviewed: dateModified,
    reviewedBy: { '@id': PERSON_ID },
    medicalAudience: {
      '@type': 'MedicalAudience',
      audienceType: 'patient',
    },
    inLanguage: locale,
  }
}

/**
 * SpeakableSpecification.
 */
export function buildSpeakableSchema(pageUrl: string): object {
  return {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', "[itemprop='description']"],
    url: pageUrl,
  }
}

/**
 * WebSite schema.
 */
export function buildWebSiteSchema(): object {
  return {
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.businessName,
    description: 'Виведення із запою та детоксикація на дому у Львові. Цілодобово, анонімно.',
    inLanguage: 'uk',
    publisher: { '@id': BUSINESS_ID },
  }
}

/**
 * Review nodes for the business.
 */
export function buildReviewSchema(reviews: readonly ReviewData[], locale: Locale): object[] {
  return reviews.map((review) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: review.author },
    datePublished: review.datePublished,
    reviewBody: review.reviewBody[locale],
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.ratingValue,
      bestRating: '5',
    },
    itemReviewed: { '@id': BUSINESS_ID },
  }))
}

/**
 * Full @graph JSON-LD for homepage (index.astro).
 */
export function buildHomePageSchema(
  reviewData?: readonly ReviewData[],
  locale: Locale = 'uk',
): string {
  const reviews = reviewData ? buildReviewSchema(reviewData, locale) : []

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        ...BUSINESS,
        ...(reviews.length > 0 ? { review: reviews } : {}),
      },
      buildPersonSchema(),
      buildWebSiteSchema(),
      {
        '@type': ['WebPage', 'MedicalWebPage'],
        '@id': `${siteConfig.url}/#homepage`,
        url: siteConfig.url,
        name:
          locale === 'uk'
            ? 'Крапельниця від алкоголю на дому у Львові | Виведення із запою'
            : 'Капельница от алкоголя на дому во Львове | Вывод из запоя',
        isPartOf: { '@id': `${siteConfig.url}/#website` },
        about: { '@id': BUSINESS_ID },
        description:
          locale === 'uk'
            ? 'Анонімне виведення із запою та зняття алкогольної інтоксикації на дому у Львові. Цілодобово, виїзд по всіх районах.'
            : 'Анонимный вывод из запоя и снятие алкогольной интоксикации на дому во Львове. Круглосуточно, выезд по всем районам.',
        inLanguage: locale,
        reviewedBy: { '@id': PERSON_ID },
      },
    ],
  }
  return JSON.stringify(schema)
}

export interface HowToStep {
  name: string
  text: string
  duration?: string
}

/**
 * HowTo schema.
 */
export function buildHowToSchema(
  name: string,
  description: string,
  steps: readonly HowToStep[],
  totalDuration: string,
): object {
  return {
    '@type': 'HowTo',
    name: name,
    description: description,
    totalTime: totalDuration,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.duration ? { timeRequired: step.duration } : {}),
    })),
    tool: [{ '@type': 'HowToTool', name: 'Крапельниця та медикаменти' }],
    supply: [
      { '@type': 'HowToSupply', name: 'Сольові розчини (Рінгер, реосорбілакт)' },
      { '@type': 'HowToSupply', name: 'Вітаміни групи B та C' },
      { '@type': 'HowToSupply', name: 'Гепатопротектори' },
    ],
  }
}

/**
 * Full @graph JSON-LD string for a service landing page.
 * @param includeReviews - When false, omits `aggregateRating` from the Business node.
 *   Set to false for district/city matrix pages to avoid schema spam on thin pages.
 *   Defaults to true for canonical service pages.
 */
export function buildServicePageSchema(
  page: SeoPage,
  pageUrl: string,
  locale: Locale,
  _includeReviews: boolean = true,
): string {
  const localeData = page[locale]
  const siteUrl = siteConfig.url
  const uiT = useTranslations(locale)

  // Reviews are disabled, so BUSINESS node is used directly
  const businessNode = BUSINESS

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      businessNode,
      buildPersonSchema(),
      {
        '@type': 'Service',
        name: localeData.h1,
        description: localeData.seo.description,
        url: pageUrl,
        dateModified: page.dateModified,
        provider: { '@id': BUSINESS_ID },
        offers: {
          '@type': 'Offer',
          price: SERVICE_PRICES[page.priceKey].amount,
          priceCurrency: 'UAH',
          availability: 'https://schema.org/InStock',
          validFrom: page.dateModified,
        },
        areaServed: { '@type': 'City', name: 'Львів' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: localeData.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
      buildBreadcrumbSchema([
        { name: uiT('nav.home'), url: siteUrl },
        { name: localeData.h1, url: pageUrl },
      ]),
      buildWebPageSchema(pageUrl, localeData.seo.title, page.dateModified, locale),
      buildSpeakableSchema(pageUrl),
      ...(page.howToSteps
        ? [
            buildHowToSchema(
              `${uiT('seo.howToPrefix')} ${localeData.h1.toLowerCase()}`,
              localeData.seo.description,
              page.howToSteps,
              'PT60M',
            ),
          ]
        : []),
    ],
  }

  return JSON.stringify(schema)
}

/**
 * Full @graph JSON-LD for a matrix page.
 * @param includeReviews - When false, omits `aggregateRating` from the Business node.
 *   Set to false for district/city matrix pages to avoid schema spam on thin pages.
 *   Defaults to false for matrix pages as per Task 26 anti-spam rules.
 */
export function buildMatrixPageSchema(page: MatrixPage, _includeReviews: boolean = false): string {
  const siteUrl = siteConfig.url
  const locale = page.locale

  const isDistrict = !!page.location.districtSlug
  const areaName = isDistrict ? page.location.districtName : page.location.cityName

  const uiTMatrix = useTranslations(locale)

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: uiTMatrix('nav.home'), url: siteUrl },
    { name: uiTMatrix('breadcrumb.service'), url: page.canonicalUrl },
  ]

  if (isDistrict) {
    breadcrumbItems.push({
      name: areaName!,
      url: `${siteUrl}/${page.location.citySlug}/${page.location.districtSlug}/${page.params.slug}`,
    })
  } else {
    breadcrumbItems.push({
      name: areaName!,
      url: `${siteUrl}/${page.location.citySlug}/${page.params.slug}`,
    })
  }

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      // Reviews are disabled, use BUSINESS directly
      BUSINESS,
      buildPersonSchema(),
      {
        '@type': 'Service',
        name: page.content.h1,
        description: page.seo.description,
        url: page.canonicalUrl,
        dateModified: page.content.dateModified,
        provider: { '@id': BUSINESS_ID },
        offers: {
          '@type': 'Offer',
          price: page.content.priceNumeric,
          priceCurrency: 'UAH',
          availability: 'https://schema.org/InStock',
          validFrom: page.content.dateModified,
        },
        areaServed: { '@type': 'City', name: areaName },
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.content.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
      buildBreadcrumbSchema(breadcrumbItems),
      buildWebPageSchema(
        isDistrict
          ? `${siteUrl}/${page.location.citySlug}/${page.location.districtSlug}/${page.params.slug}`
          : `${siteUrl}/${page.location.citySlug}/${page.params.slug}`,
        page.seo.title,
        page.content.dateModified,
        locale,
      ),
      buildSpeakableSchema(page.canonicalUrl),
    ],
  }

  return JSON.stringify(schema)
}

/**
 * Hub page schema (City/District Hub).
 */
export function buildHubPageSchema(
  name: string,
  breadcrumbItems: readonly BreadcrumbItem[],
  listItems: readonly BreadcrumbItem[],
  dateModified: string,
  locale: Locale = 'uk',
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      BUSINESS,
      buildPersonSchema(),
      buildBreadcrumbSchema(breadcrumbItems),
      buildItemListSchema(listItems),
      buildWebPageSchema(breadcrumbItems.at(-1)!.url, name, dateModified, locale),
    ],
  }
  return JSON.stringify(schema)
}
