import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'

import { siteConfig } from '../config/site'

export interface OgImageOptions {
  title: string
  price: string
  badge: string | null
}

let fontBuffer: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (fontBuffer) return fontBuffer

  // Fontsource CDN — verified .woff compatible with satori/opentype.js
  const fontUrl = 'https://unpkg.com/@fontsource/inter@5.1.1/files/inter-latin-400-normal.woff'
  const res = await fetch(fontUrl)

  if (!res.ok) {
    throw new Error(`Failed to fetch font: ${res.status} ${res.statusText}`)
  }

  fontBuffer = await res.arrayBuffer()
  return fontBuffer
}

export async function generateOgImage(options: OgImageOptions): Promise<Buffer> {
  const { title, price, badge } = options
  const font = await loadFont()

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          backgroundColor: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          fontFamily: 'Inter',
        },
        children: [
          // Site name — top left
          {
            type: 'div',
            props: {
              style: {
                color: '#94a3b8',
                fontSize: '24px',
                fontWeight: '400',
              },
              children: siteConfig.businessName,
            },
          },
          // Main title — center
          {
            type: 'div',
            props: {
              style: {
                color: '#ffffff',
                fontSize: title.length > 40 ? '52px' : '64px',
                fontWeight: '700',
                lineHeight: '1.15',
                maxWidth: '900px',
              },
              children: title,
            },
          },
          // Bottom row: price + badge
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      fontSize: '32px',
                      fontWeight: '700',
                      padding: '12px 28px',
                      borderRadius: '8px',
                    },
                    children: price,
                  },
                },
                badge
                  ? {
                      type: 'div',
                      props: {
                        style: {
                          backgroundColor: '#1e293b',
                          color: '#94a3b8',
                          fontSize: '24px',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          border: '1px solid #334155',
                        },
                        children: badge,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: font,
          weight: 400,
          style: 'normal',
        },
      ],
    },
  )

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
  return Buffer.from(resvg.render().asPng())
}
