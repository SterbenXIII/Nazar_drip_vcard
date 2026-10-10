# HAVENHUB SEO: closed builds and release gates

Task 7 adds mode-aware metadata and emits a **single-homepage** sitemap exclusively for a gated local production build. This does **not** authorize deployment, DNS configuration, crawling, indexing, Search Console access, or any actual public release.

| Mode | HTML routes | Robots metadata | Canonical, OG/Twitter, sitemap |
| --- | --- | --- | --- |
| `normal` (default) | `/`, `/404` | `noindex,nofollow` | None |
| `staging` | `/`, four supporting routes, `/404` | `noindex,nofollow` | None; staging must require **real authentication** |
| `production` (gated only) | `/`, four supporting routes, `/404` | `/`: `index,follow`; four supporting pages: `noindex,follow`; 404 closed | HTTPS self-canonical and matching OG/Twitter on `/` only; `sitemap.xml` lists only `/`; `robots.txt` allows crawlers to see `noindex` |

The homepage's production title and description are working text awaiting owner approval. No schema, ratings, doctors, addresses, reviews, FAQ markup, or OG image are invented. Four supporting routes intentionally are **not** indexable.

## Local verification only

```bash
pnpm --filter @vcard/clinic-web build:normal
pnpm --filter @vcard/clinic-web check:metadata

pnpm --filter @vcard/clinic-web build:staging
CLINIC_SITE_MODE=staging pnpm --filter @vcard/clinic-web check:metadata

# A reserved fixture domain used strictly for offline verification
CLINIC_ALLOW_PRODUCTION_BUILD=true \
CLINIC_CANONICAL_ORIGIN=https://havenhub.example \
pnpm --filter @vcard/clinic-web build:production

CLINIC_SITE_MODE=production \
CLINIC_ALLOW_PRODUCTION_BUILD=true \
CLINIC_CANONICAL_ORIGIN=https://havenhub.example \
pnpm --filter @vcard/clinic-web check:metadata

# Always restore the closed artifact
pnpm --filter @vcard/clinic-web build:normal
```

The origin must be a full HTTPS origin with a DNS-style hostname and no path, credentials, query, nondefault port or fragment. `https://host` and `https://host/` normalize to one self-canonical `https://host/`. This check **cannot prove ownership** or whether the host is configured; do not use a real unapproved host.

## Required before any public switch

1. Verify the exact domain is owned/controlled and explicitly approved by the owner. Confirm the final homepage title, description and legal claims.
2. Complete image licensing/attribution, protected staging authentication, historical secret rotation review, final code/security/accessibility checks, and the remaining Task 8 handoff.
3. Independently verify delivered **HTTP 200/404 statuses and response headers** at the actual proxy/CDN after authorization. Local static-preview results do not establish CDN behavior.
4. Verify the production homepage does **not** receive a global `X-Robots-Tag: noindex`. Confirm supporting routes return 200, are crawlable to reveal their `noindex` metadata, are not blocked by `robots.txt` or listed in the sitemap. Confirm 404 routes return 404.
5. Only after explicit release approval: configure production origin redirects and Google Search Console, then inspect indexing. Neither is authorized by this implementation.

If any gate is missing, keep the **normal** closed artifact and record release as **BLOCKED**.
