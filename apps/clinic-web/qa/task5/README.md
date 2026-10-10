# Task 5 — landing QA handoff (2026-10-10)

Scope: `codex/havenhub-supporting-pages`, Astro `apps/clinic-web`; no merge, push, backend change, or publication.

## Editorial and visual inspection

- Nine sections are rendered in the specified order from hero to final contact.
- Compared navy/teal versus restrained burgundy with matching text and layout: [theme comparison](theme-comparison-1440.png).
- Compared three Cyrillic font combinations: [mobile typography](type-comparison-390.png) and [desktop typography](type-comparison-1440.png).
- **Provisional only:** restrained burgundy + IBM Plex Serif / IBM Plex Sans. Owner approval is still required before locking the visual direction.
- Full-page screenshots: [320](landing-320-full.png), [390](landing-390-full.png), [768](landing-768-full.png), [1440](landing-1440-full.png). First-viewport images use the same filenames with `-first`.
- Inspected the mobile and desktop full-page renders: no apparent clipping, truncated heading, missing sections, or misleading center imagery.
- Existing font distribution includes `public/fonts/OFL.txt`; check asset licensing and source provenance again before public release.

## Fresh verification evidence

- Staging mode: `CLINIC_SITE_MODE=staging pnpm --filter @vcard/clinic-web test:e2e -- e2e/homepage.spec.ts e2e/shared-chrome.spec.ts e2e/supporting-pages.spec.ts` — **PASS, 18/18**.
- Normal mode: `CLINIC_SITE_MODE=normal pnpm --filter @vcard/clinic-web test:e2e -- e2e/homepage.spec.ts e2e/shared-chrome.spec.ts` — **PASS, 12/12**.
- `pnpm --filter @vcard/clinic-web check` — **PASS**, Astro 30 files / zero diagnostics, ESLint, Stylelint, Prettier.
- `pnpm --filter @vcard/clinic-web build:normal` — **PASS**, only `/` and `/404` emitted.
- `pnpm --filter @vcard/clinic-web check:metadata` — **PASS**.
- `git diff --check` — **PASS**.
- Corrected a QA-only ESLint issue in `capture.mjs`: declared browser/scripting globals used by `page.evaluate`. No production page behavior changed in this QA pass.

## Remaining gates

1. Request owner sign-off on palette and typography. Do not consider current tokens final without it.
2. Task 6: independently verify staging-only optional media and asset rights. Do not publish concept renders.
3. Task 7: verify SEO, sitemap and HTTP headers under explicit release gates.
4. Task 8: still requires true browser zoom 200%, reduced-motion checks, complete acceptance/Docker/security runs, and independent code/content review.
5. B0 Telegram form and production activation remain separate projects/approvals.

Nothing was committed, merged, pushed or deployed.
