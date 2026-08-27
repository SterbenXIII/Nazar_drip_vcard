import 'dotenv/config'

import fs from 'node:fs'
import path from 'node:path'

import sitemap from '@astrojs/sitemap'
import pwa from '@vite-pwa/astro'
import { defineConfig } from 'astro/config'
import icon from 'astro-icon'

/**
 * Helper to get the real modification date of a page's source file.
 */
function getRealLastMod(pathname, slug) {
  const cleanPath = pathname.replace(/\/$/, '')
  const possiblePaths = [
    `apps/web/src/pages${cleanPath}.astro`,
    `apps/web/src/pages${cleanPath}/index.astro`,
    `apps/web/src/pages/[...locale]${cleanPath}.astro`,
    `apps/web/src/pages/[...locale]${cleanPath}/index.astro`,
    `apps/web/src/content/services/${slug}.md`,
  ]

  for (const filePath of possiblePaths) {
    const fullPath = path.resolve(process.cwd(), filePath)
    if (fs.existsSync(fullPath)) {
      return fs.statSync(fullPath).mtime.toISOString()
    }
  }

  return new Date().toISOString()
}

export default defineConfig({
  site: 'https://krapelnytsia.lviv.ua',
  output: 'static',
  i18n: {
    defaultLocale: 'uk',
    locales: ['uk', 'ru'],
    routing: { prefixDefaultLocale: false },
  },

  integrations: [
    !process.env.SKIP_PWA &&
      pwa({
        registerType: 'autoUpdate',
        experimental: { assets: true },

        manifest: {
          id: '/',
          name: 'Krapelnytsia Lviv',
          short_name: 'Krapelnytsia',
          description:
            'Професійне встановлення крапельниць від алкоголю на дому у Львові. Детокс після отруєння, вітамінні коктейлі, медикаментозна терапія. Швидкий виїзд!',
          theme_color: '#2c3e50',
          background_color: '#2c3e50',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'minimal-ui'],
          start_url: '/',
          lang: 'uk',
          protocol_handlers: [
            {
              protocol: 'web+krapelnytsia',
              url: '/?url=%s',
            },
          ],
          icons: [
            {
              src: 'pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: 'assets/pwa-screenshot-wide.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Домашня сторінка (ПК)',
            },
            {
              src: 'assets/pwa-screenshot-narrow.png',
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Мобільна версія',
            },
          ],
          shortcuts: [
            {
              name: 'Замовити крапельницю',
              short_name: 'Замовити',
              description: 'Швидке замовлення крапельниці на дому у Львові',
              url: '/#order',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
            },
          ],
        },

        workbox: {
          // HTML pages are intentionally excluded from precache — they must always
          // be fetched from the network so users immediately see the new version
          // after a deploy. Only immutable hashed assets are safe to precache.
          globPatterns: ['**/*.{js,css,svg,png,webp,ico,woff2}'],
          // Astro's PWA integration supplies a fallback by default. Disable it
          // because HTML is intentionally not part of the precache manifest.
          navigateFallback: undefined,
          runtimeCaching: [
            {
              // Navigation requests (HTML pages): always try network first.
              // Falls back to cache only when offline.
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24h — never stale after deploy
                },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },

        devOptions: {
          enabled: false,
          type: 'module',
          suppressWarnings: false,
        },
      }),
    sitemap({
      i18n: {
        defaultLocale: 'uk',
        locales: {
          uk: 'uk-UA',
          ru: 'ru-UA',
        },
      },
      filter: (page) => !page.includes('/404') && !page.startsWith('/_'),
      changefreq: 'weekly',
      priority: 0.8,
      serialize(item) {
        const urlObj = new URL(item.url)
        const pathSegments = urlObj.pathname.split('/').filter(Boolean)
        const slug = pathSegments.at(-1)

        let priority = 0.8

        if (pathSegments.length === 0) {
          priority = 1
        } else if (pathSegments.length === 3) {
          priority = 0.6
        } else if (pathSegments.length === 2) {
          priority = 0.7
        } else if (
          slug === 'krapelnytsia-vid-alkogolyu-tsina' ||
          slug === 'vyvedennya-iz-zapoyu-lviv'
        ) {
          priority = 0.9
        } else if (slug === 'certificate') {
          priority = 0.5
        }

        return {
          ...item,
          priority,
          lastmod: getRealLastMod(urlObj.pathname, slug),
        }
      },
    }),
    icon(),
  ],

  prefetch: true,

  devToolbar: {
    enabled: false,
    placement: 'bottom-center',
  },

  server: {
    allowedHosts: ['vcard.local', 'localhost', 'web', '127.0.0.1'],
  },

  build: {
    inlineStylesheets: 'auto',
  },

  vite: {
    build: {
      cssMinify: true,
    },
    ssr: {
      noExternal: ['@vcard/shared'],
    },
    optimizeDeps: {
      include: ['@vcard/shared'],
    },
    resolve: {
      preserveSymlinks: true,
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://api:5678',
          changeOrigin: true,
          rewrite: (path) => path,
        },
      },
    },
  },
})
