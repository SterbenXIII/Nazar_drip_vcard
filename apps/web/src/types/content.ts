import { z } from 'zod'

const SeoBusinessSchema = z.object({
  type: z.literal('MedicalBusiness'),
  medicalSpecialty: z.string(),
  priceRange: z.string(),
  url: z.url(),
  geo: z.object({
    latitude: z.string(),
    longitude: z.string(),
  }),
  openingHours: z.array(z.string()),
  areaServed: z.array(z.string()),
  address: z.object({
    locality: z.string(),
    region: z.string(),
    country: z.string(),
  }),
  sameAs: z.array(z.string()),
  aggregateRating: z.object({
    ratingValue: z.string(),
    reviewCount: z.string(),
    bestRating: z.string(),
  }),
})

const ServiceSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  price: z.string(),
  badge: z.string().nullable(),
  duration: z.string(),
})

const FaqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
})

const ProfileSchema = z.object({
  name: z.string(),
  occupation: z.string(),
  license: z.string(),
  experience: z.string(),
  avatar: z.string(),
})

const ContactsSchema = z.object({
  phone: z.string(),
  telegram: z.string(),
  viber: z.string(),
  whatsapp: z.string(),
  address: z.string(),
})

export const ContentSchema = z.object({
  config: z.object({
    n8nWebhookUrl: z.string(),
  }),
  profile: ProfileSchema,
  seo: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.string(),
    canonical: z.url(),
    ogType: z.string(),
    siteName: z.string(),
    ogImage: z.string(),
    author: z.string(),
    business: SeoBusinessSchema,
  }),
  contacts: ContactsSchema,
  services: z.array(ServiceSchema),
  faq: z.array(FaqItemSchema),
})

// Inferred types — use these everywhere instead of `any`
export type Content = z.infer<typeof ContentSchema>
export type ContentService = z.infer<typeof ServiceSchema>
export type ContentFaqItem = z.infer<typeof FaqItemSchema>
export type ContentProfile = z.infer<typeof ProfileSchema>
export type ContentContacts = z.infer<typeof ContactsSchema>

/**
 * Validates and returns typed content.json data.
 * Throws a ZodError with a descriptive message if validation fails.
 * Call this once at module level — it runs at build time only.
 *
 * Usage pattern:
 * import rawContent from '../data/content.json';
 * import { parseContent } from '../types/content';
 * const content = parseContent(rawContent);
 */
export function parseContent(raw: unknown): Content {
  return ContentSchema.parse(raw)
}
