import type { APIRoute, GetStaticPaths } from 'astro'

import { formatServicePrice, type PriceKey } from '../../data/pricing'
import { seoPages } from '../../data/seo-pages'
import { generateOgImage } from '../../lib/og-image'
import type { SeoPage } from '../../types/seo'

export const getStaticPaths: GetStaticPaths = () => {
  const paths: Array<{
    params: { slug: string }
    props: {
      content: SeoPage['uk'] | SeoPage['ru']
      priceKey: PriceKey
      locale: 'uk' | 'ru'
      badge: string | null
    }
  }> = []
  for (const page of seoPages) {
    // UK
    paths.push({
      params: { slug: page.uk.slug },
      props: { content: page.uk, priceKey: page.priceKey, locale: 'uk', badge: page.badge ?? null },
    })
    // RU
    paths.push({
      params: { slug: page.ru.slug },
      props: { content: page.ru, priceKey: page.priceKey, locale: 'ru', badge: page.badge ?? null },
    })
  }
  return paths
}

export const GET: APIRoute = async ({ props }) => {
  const { content, priceKey, locale, badge } = props as {
    content: SeoPage['uk'] | SeoPage['ru']
    priceKey: PriceKey
    locale: 'uk' | 'ru'
    badge: string | null
  }
  const png = await generateOgImage({
    title: content.h1,
    price: formatServicePrice(priceKey, locale),
    badge: badge ?? null,
  })

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
