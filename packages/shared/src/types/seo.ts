export interface SeoMeta {
  /** Page <title>. Target: ≤60 characters. Must be unique per page. */
  title: string
  /** Meta description. Target: 120–160 characters. Include primary keyword + "Львів". */
  description: string
}

export interface FaqItem {
  /** Question text — must match real user search intent from GSC data */
  question: string
  /** Answer text — 2–4 sentences. No keyword stuffing. */
  answer: string
}

export interface PageContent {
  /** Primary H1. Must contain geo-keyword "Львів" and service keyword. */
  h1: string
  /** Human-readable price for display. Format: "від XXX грн". */
  price: string
  /**
   * Numeric price for Schema.org — defined as a literal in data, NEVER parsed
   * at runtime from the `price` string.
   */
  priceNumeric: number
  /** Service duration. Example: "30–60 хвилин" */
  duration: string
  /**
   * Unique body copy. 2–4 sentences. Must contain LSI keywords naturally:
   * детоксикація, абстинентний синдром, анонімно, виїзд — where relevant.
   */
  description: string
  /**
   * 2–3 FAQ items per page. Questions must target real user intents.
   * These generate FAQPage JSON-LD and visible accordion UI.
   */
  faq: FaqItem[]
  /**
   * ISO 8601 date string — last time this page content was reviewed/updated.
   * Used in WebPage schema `dateModified` for freshness signal.
   * Format: "YYYY-MM-DD"
   */
  dateModified: string
  /**
   * Exactly 2 slugs of related service pages.
   * Used by RelatedServices component for internal cross-linking.
   * Must reference valid slugs that exist in seoPages array.
   * Enforced as a tuple to prevent accidental over/under-linking.
   */
  relatedSlugs: readonly [string, string]
  /** Optional terms for surzhyk/colloquial SEO */
  colloquialTerms?: string[]
}

export interface SeoPage {
  /**
   * URL slug: kebab-case Ukrainian transliteration.
   * No leading or trailing slashes.
   * Must be globally unique within the seoPages array.
   */
  slug: string
  seo: SeoMeta
  content: PageContent
}
