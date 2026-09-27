import fs from 'node:fs'
import path from 'node:path'

import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'

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
