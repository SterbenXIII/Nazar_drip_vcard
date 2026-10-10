# HAVENHUB — build-time theme tokens

`HAVENHUB_THEME` selects the Astro color-token system at build time:

| Value | Result |
| --- | --- |
| unset or `burgundy` | Restrained burgundy (current default) |
| `navy-teal` | Navy / teal alternative |

Any other value (including an empty string or whitespace) fails the build with an explicit `HAVENHUB_THEME` error. No browser theme picker is added.

## How to build

From the monorepo root:

```bash
# Default: burgundy
pnpm --filter @vcard/clinic-web build:normal

# Navy / teal staging preview
HAVENHUB_THEME=navy-teal pnpm --filter @vcard/clinic-web build:staging

# Explicitly select the default palette
HAVENHUB_THEME=burgundy pnpm --filter @vcard/clinic-web build:normal
```

You can also put `HAVENHUB_THEME=navy-teal` in `apps/clinic-web/.env.production.local` for a local production-mode Astro build, or supply it through CI/build environment variables. Do not commit machine-specific `.env` files. Shell environment values take precedence over local env files.

The selection is embedded as `<html data-theme="...">` in generated HTML. `src/styles/global.css` provides semantic CSS custom properties for both token systems, including primary buttons, background surfaces, headings, contact band, and footer. Only the chosen system is active in a given static build; theme changes require rebuilding. `src/config/theme.mjs` validates the supported names and is shared by the Astro build config and layout.

`HAVENHUB_THEME` is independent of `CLINIC_SITE_MODE`; it must never bypass the existing normal/staging/production publication guards, robots policy, or disabled lead form.

## Verification

```bash
(cd apps/clinic-web && node --test scripts/theme-config.test.mjs)
# From monorepo root; run sequentially because both build into clinic-web/dist:
CLINIC_SITE_MODE=normal pnpm --filter @vcard/clinic-web test:e2e -- e2e/theme.spec.ts e2e/homepage.spec.ts
HAVENHUB_THEME=navy-teal CLINIC_SITE_MODE=normal pnpm --filter @vcard/clinic-web test:e2e -- e2e/theme.spec.ts e2e/homepage.spec.ts
pnpm --filter @vcard/clinic-web check
```

Design selection remains provisional until approved by the owner; no production release is authorized by this feature.
