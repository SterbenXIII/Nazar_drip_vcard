# Frontend Enhancements — Dark Mode

This document summarizes the agreed pattern for Dark Mode in the `@vcard/web` Astro site.

- Dark Mode
  - Add an inline guard script in `<head>` that runs before rendering to avoid FOUC. It should read `localStorage.theme` and/or `prefers-color-scheme` and toggle `document.documentElement.classList` accordingly.
  - Use CSS variables and `dark:` utility classes (or `:root .dark`) to provide theme variants.
  - Provide a small `ThemeToggle` component with an inline script that toggles the `.dark` class and persists the choice in `localStorage`.

- Quick commands

```bash
# Dev server
pnpm --filter @vcard/web dev

# Production build
pnpm --filter @vcard/web build
```

PWA installability, manifest generation, service-worker registration, and offline
navigation are intentionally not part of the current web build contract. Reintroduce
them only after selecting an Astro-compatible integration and recording a new decision.
