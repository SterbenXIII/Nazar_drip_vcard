import type { PriceKey } from '../data/pricing'
import type { Locale } from '../i18n/ui'
import type { HowToStep } from '../utils/schema'

export interface Translatable<T> {
  uk: T
  ru: T
}

export interface SeoMeta {
  /** Page <title>. Target: ≤60 chars. Must be unique per page. */
  title: string
  /** Meta description. Target: 120–160 chars. */
  description: string
}

export interface FaqItem {
  /** Question as a user would type it into Google. */
  question: string
  /** Answer: 2–4 sentences, factual, no keyword stuffing. */
  answer: string
}

/**
 * Localized content for a specific language variant.
 */
export interface LocalizedSeoContent {
  /** URL slug for this locale. */
  slug: string
  /** SEO Metadata. */
  seo: SeoMeta
  /** H1 — contains both service keyword and location. */
  h1: string
  /** Short service name for use in templates (e.g. "Крапельниця від алкоголю"). */
  serviceName: string
  /** Price catalog key used to render the localized display price. */
  priceKey: PriceKey
  /**
   * Unique body copy. 2–4 sentences.
   * Must contain relevant LSI keywords naturally.
   */
  description: string
  /**
   * Per-page FAQ. Exactly 3 items.
   */
  faq: readonly [FaqItem, FaqItem, FaqItem]
  /**
   * Surzhyk-optimized alt text for images.
   * Mixes UK and RU keywords for SEO dominance (e.g. "капельница львів").
   */
  surzhykAlt: string
  /**
   * Colloquial search terms, surzhyk, and regional dialects.
   * Used for semantic UI blocks to capture high-volume niche intent.
   */
  colloquialTerms?: string[]
}

export interface SeoPage {
  /** Base identifying slug (usually the UK slug). */
  slug: string

  /** Localized content for both supported languages. */
  uk: LocalizedSeoContent
  ru: LocalizedSeoContent

  /** Shared technical and structural data. */
  priceKey: PriceKey
  duration: string
  dateModified: string
  /** Reference slugs for internal linking (use base identification slugs). */
  relatedSlugs: readonly [string, string]
  /** Optional badge text ("Популярно", "Швидко"). */
  badge?: string | null
  /** Optional HowTo steps for rich snippets. */
  howToSteps?: readonly HowToStep[]

  /**
   * Templates for generating geo-matrix pages.
   * Both locales must provide templates if matrix is enabled.
   */
  templates?: Translatable<SeoTemplates>
}

export interface SeoTemplates {
  /** Title template. Must contain {city} or {district}. */
  titleDistrict: string
  titleCity: string
  /** Description template. Must contain {city}/{district} AND {price}. */
  descriptionDistrict: string
  descriptionCity: string
  /** H1 template. */
  h1District: string
  h1City: string
  /** Body paragraph template. Must contain {travelTime}. */
  bodyDistrict: string
  bodyCity: string
}

/**
 * A fully resolved page ready for rendering.
 * Generated at build time from SeoPage × Location × Locale.
 */
export interface MatrixPage {
  /** Params for Astro's dynamic routing. */
  params: {
    locale?: string
    city: string
    district?: string
    slug: string
  }
  /** Resolved SEO meta. */
  seo: SeoMeta
  /** Resolved localized content. */
  content: {
    h1: string
    price: string
    priceNumeric: number
    duration: string
    description: string
    faq: readonly FaqItem[]
    dateModified: string
    relatedSlugs: readonly [string, string]
    badge?: string | null
    surzhykAlt: string
  }
  /** Canonical URL (absolute). */
  canonicalUrl: string
  /** Location context for schema and display. */
  location: {
    citySlug: string
    cityName: string
    cityNameLocative: string
    districtSlug?: string
    districtName?: string
    districtNameLocative?: string
    travelMinutes?: number
  }
  /** Base service slug (ID). */
  serviceSlug: string
  /** Active locale: Locale. */
  locale: Locale
}

export interface ReviewData {
  id: string
  author: string
  ratingValue: 1 | 2 | 3 | 4 | 5
  datePublished: string
  reviewBody: Translatable<string>
  serviceSlug: string
}

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface MedicalWebPage {
  '@context': string
  '@type': 'MedicalWebPage'
  name: string
  description: string
  url: string
  inLanguage: string
  datePublished: string
  dateModified: string
  lastReviewed: string
  reviewedBy: {
    '@type': 'Person'
    name: string
    jobTitle: string
  }
  medicalAudience: string
  specialty: string
  mainEntity: MedicalBusiness
}

export interface MedicalBusiness {
  '@type': 'MedicalBusiness'
  name: string
  address: {
    '@type': 'PostalAddress'
    streetAddress: string
    addressLocality: string
    addressRegion: string
    postalCode: string
    addressCountry: string
  }
}
