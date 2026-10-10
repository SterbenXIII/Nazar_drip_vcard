import { defineConfig } from 'astro/config'

import { emitProductionSeoArtifacts } from './scripts/emit-seo-artifacts.mjs'
import { resolveSeoConfig } from './src/config/seo.mjs'
import { resolveTheme } from './src/config/theme.mjs'

resolveTheme()

const { mode: siteMode, canonicalOrigin } = resolveSeoConfig()

if (process.env.CLINIC_ENABLE_SERVICE_PREVIEW === 'true' && siteMode !== 'normal') {
  throw new Error('The service preview is disabled outside normal builds')
}

export default defineConfig({
  site: canonicalOrigin ?? undefined,
  integrations:
    siteMode === 'production'
      ? [
          {
            name: 'havenhub-seo-artifacts',
            hooks: {
              'astro:build:done': async ({ dir }) => {
                await emitProductionSeoArtifacts(dir, canonicalOrigin)
              },
            },
          },
        ]
      : [],
  output: 'static',
  vite: {
    server: { strictPort: true },
    preview: { strictPort: true },
  },
})
