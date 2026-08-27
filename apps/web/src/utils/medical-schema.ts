import { siteConfig } from '../config/site'
import { defaultLang, type Locale } from '../i18n/ui'
import type { MedicalWebPage } from '../types/seo'

/**
 * Builds YMYL-compliant MedicalWebPage schema.
 * Extends basic WebPage with medical-specific attributes.
 */
export function buildMedicalWebPageSchema(
  title: string,
  description: string,
  url: string,
  dateModified: string,
  locale: Locale = 'uk',
): MedicalWebPage {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: title,
    description: description,
    url: url,
    inLanguage: locale,
    datePublished: '2024-01-01T08:00:00+02:00',
    dateModified: dateModified,
    lastReviewed: dateModified,
    reviewedBy: {
      '@type': 'Person',
      name: siteConfig.doctor.name[locale],
      jobTitle: siteConfig.doctor.jobTitle[locale],
    },
    medicalAudience: 'Patient',
    specialty: 'Psychiatry',
    mainEntity: {
      '@type': 'MedicalBusiness',
      name: locale === defaultLang ? siteConfig.businessName : siteConfig.businessNameRu,
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'вулиця Кульпарківська, 95',
        addressLocality: 'Львів',
        addressRegion: 'Львівська область',
        postalCode: '79000',
        addressCountry: 'UA',
      },
    },
  }
}

/**
 * Health conditions mapping for YMYL authority
 */
export const HEALTH_CONDITIONS = {
  'alko-intox': {
    uk: 'Алкогольна інтоксикація',
    ru: 'Алкогольная интоксикация',
  },
  withdrawal: {
    uk: 'Абстинентний синдром',
    ru: 'Абстинентный синдром',
  },
}
