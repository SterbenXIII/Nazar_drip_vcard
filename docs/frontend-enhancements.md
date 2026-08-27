# Frontend Enhancements — Dark Mode & PWA

This document summarizes the agreed patterns for implementing Dark Mode and PWA functionality in the `@vcard/web` Astro site.

- Dark Mode
  - Add an inline guard script in `<head>` that runs before rendering to avoid FOUC. It should read `localStorage.theme` and/or `prefers-color-scheme` and toggle `document.documentElement.classList` accordingly.
  - Use CSS variables and `dark:` utility classes (or `:root .dark`) to provide theme variants.
  - Provide a small `ThemeToggle` component with an inline script that toggles the `.dark` class and persists the choice in `localStorage`.

- PWA
  - Use `@vite-pwa/astro` integration. Configure `manifest.icons` with production PNG icons (192x192, 512x512) and optional SVGs as fallbacks.
  - Configure workbox with `globPatterns` to cache static assets: `**/*.{js,css,html,svg,png,webp,ico}`.
  - In dev, the manifest may not be available at `/manifest.webmanifest`; verify after `pnpm --filter @vcard/web build`.
  - Place icons in `apps/web/public/` and reference them in `apps/web/astro.config.mjs`.

- Quick commands

```bash
# Install PWA integration
pnpm --filter @vcard/web add -D @vite-pwa/astro

# Generate placeholder icons (if the repo provides a script)
pnpm --filter @vcard/web run generate:pwa-icons

# Dev server
pnpm --filter @vcard/web dev

# Production build (manifest + sw produced)
pnpm --filter @vcard/web build
```

Add this doc to agent instructions or README so future contributors and AI agents understand the conventions.
