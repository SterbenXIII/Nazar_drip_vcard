# HAVENHUB SEO: closed builds and release gates

Task 7 adds mode-aware metadata and emits a **single-homepage** sitemap exclusively for a gated local production build. This does **not** authorize deployment, DNS configuration, crawling, indexing, Search Console access, or any actual public release.

| Mode                      | HTML routes                                                                                                                      | Robots metadata                                                     | Canonical, OG/Twitter, sitemap                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `normal` (default)        | `/`, `/site/`, `/404`                                                                                                            | `noindex,nofollow`                                                  | None                                                                                                                                  |
| `staging`                 | `/`, `/site/`, `/programa/`, `/umovy/`, `/rodyni/`, `/napriamy/`, `/komanda/`, `/404`; service routes deferred and not generated | `noindex,nofollow`                                                  | None; staging must require **real authentication**                                                                                    |
| `production` (gated only) | `/`, `/site/`, `/programa/`, `/umovy/`, `/rodyni/`, `/napriamy/`, `/komanda/`, `/404`                                            | `/`: `index,follow`; supporting pages: `noindex,follow`; 404 closed | HTTPS self-canonical and matching OG/Twitter on `/` only; `sitemap.xml` lists only `/`; `robots.txt` allows crawlers to see `noindex` |

The user reported on 2026-10-29 that psychiatrist-narcologist Давидок Вікторія Юріївна and center head Антошків Станіслав Михайлович both approved the exact [content review v1](../../docs/superpowers/plans/2026-10-29-havenhub-seo-content-review.md). Their original sign-off dates and direct records were not supplied. The local homepage metadata and three service records now use that copy. This content approval does **not** approve a public release: service records have no separate publication approval, so production builds do not emit or index them until that approval is explicitly recorded. The center/inquiry line and narcologist visits are described as available 24/7; residential care uses the client-described Minnesota model, while outpatient care has a separate program. Do not promise response times, guaranteed discounts, treatment efficacy, or absolute confidentiality. Free-consultation terms remain unconfirmed. No schema, ratings, reviews, FAQ markup, or OG image are invented. `/site/` and the five supporting paths (`/programa/`, `/umovy/`, `/rodyni/`, `/napriamy/`, `/komanda/`) remain **not** indexable.

The homepage does not add service-page links. Service content remains local source material and is not part of the production indexability scope.

## Google indexing baseline — 2026-10-30

Google URL Inspection for `https://havenhub.com.ua/` returned **PASS / Submitted and indexed**. Google last crawled the mobile page on 2026-10-29 at 11:39:37 UTC; fetching succeeded, indexing was allowed, and both the user-declared and Google-selected canonical were `https://havenhub.com.ua/`. The live page returned HTTP 200 with `index,follow` and no `X-Robots-Tag: noindex` header. Its public title, H1 and description still use the older copy; the description includes an unverified free-consultation claim that the approved v1 draft removes.

The live `robots.txt` allows `/`, and `sitemap.xml` lists only `/`, but Search Console lists no submitted sitemap for the connected `sc-domain:havenhub.com.ua` property. The last settled 28-day performance window (2026-09-30 through 2026-10-27) had zero impressions and clicks. This does not contradict the indexed URL verdict. After a separately authorized public release, verify the delivered v1 homepage, submit the existing sitemap once, and check the homepage URL and query impressions after 7, 14 and 28 days.

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
