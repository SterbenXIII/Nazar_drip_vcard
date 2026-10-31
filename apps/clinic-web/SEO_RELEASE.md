# HAVENHUB SEO: closed builds and release gates

Task 7 adds mode-aware metadata and emits a **single-homepage** sitemap exclusively for a gated local production build. This does **not** authorize deployment, DNS configuration, crawling, indexing, Search Console access, or any actual public release.

| Mode                      | HTML routes                                                                                                                      | Robots metadata                                                     | Canonical, OG/Twitter, sitemap                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `normal` (default)        | `/`, `/site/`, `/404`                                                                                                            | `noindex,nofollow`                                                  | None                                                                                                                                  |
| `staging`                 | `/`, `/site/`, `/programa/`, `/umovy/`, `/rodyni/`, `/napriamy/`, `/komanda/`, `/404`; service routes deferred and not generated | `noindex,nofollow`                                                  | None; staging must require **real authentication**                                                                                    |
| `production` (gated only) | `/`, `/site/`, `/programa/`, `/umovy/`, `/rodyni/`, `/napriamy/`, `/komanda/`, `/404`                                            | `/`: `index,follow`; supporting pages: `noindex,follow`; 404 closed | HTTPS self-canonical and matching OG/Twitter on `/` only; `sitemap.xml` lists only `/`; `robots.txt` allows crawlers to see `noindex` |

The user reported on 2026-10-29 that psychiatrist-narcologist Давидок Вікторія Юріївна and center head Антошків Станіслав Михайлович both approved the exact [content review v1](../../docs/superpowers/plans/2026-10-29-havenhub-seo-content-review.md). Their original sign-off dates and direct records were not supplied. The three service records and homepage title still use that copy; the homepage description and introductions have a newer local draft described below. This content approval does **not** approve a public release: service records have no separate publication approval, so production builds do not emit or index them until that approval is explicitly recorded. The center/inquiry line and narcologist visits are described as available 24/7; residential care uses the client-described Minnesota model, while outpatient care has a separate program. Do not promise response times, guaranteed discounts, treatment efficacy, or absolute confidentiality. Free-consultation terms remain unconfirmed. No schema, ratings, reviews, FAQ markup, or OG image are invented. `/site/` and the five supporting paths (`/programa/`, `/umovy/`, `/rodyni/`, `/napriamy/`, `/komanda/`) remain **not** indexable.

The homepage does not add service-page links. Service content remains local source material and is not part of the production indexability scope.

The neutral homepage description and desktop/mobile introductions drafted locally on 2026-10-31 replace wording from the approved v1. On 2026-10-31, the user confirmed that both Давидок Вікторія Юріївна and Антошків Станіслав Михайлович approved the exact revised text, confirmed the business details are current, and authorized its release. The production site remains unchanged until the deployment workflow completes.

## Google indexing baseline — 2026-10-30

At the 2026-10-30 check, Google URL Inspection for `https://havenhub.com.ua/` returned **PASS / Submitted and indexed**. Google last crawled the mobile page on 2026-10-29 at 11:39:37 UTC; fetching succeeded, indexing was allowed, and both the user-declared and Google-selected canonical were `https://havenhub.com.ua/`. The live page returned HTTP 200 with `index,follow` and no `X-Robots-Tag: noindex` header. Its public description then contained an unverified free-consultation claim.

At that check, the live `robots.txt` allowed `/`, and `sitemap.xml` listed only `/`, but Search Console listed no submitted sitemap for the connected `sc-domain:havenhub.com.ua` property. The last settled 28-day performance window (2026-09-30 through 2026-10-27) had zero impressions and clicks. This did not contradict the indexed URL verdict.

## Live and Search Console recheck — 2026-10-31

At 08:51 UTC, a read-only HTTPS fetch returned HTTP 200 for the homepage, `robots.txt` and `sitemap.xml`. The public homepage had `index,follow`, no `X-Robots-Tag` header, and a self-canonical of `https://havenhub.com.ua/`. The sitemap contained only that URL. Its public description still mentioned alcohol, drug and gambling dependence, so the neutral local draft has not been published.

The latest stored URL Inspection, requested 2026-10-30 at 19:13:43 UTC, recorded **PASS / Submitted and indexed**, a successful mobile fetch, and matching declared and Google-selected canonical URLs. Search Console recorded the sitemap as submitted on 2026-10-30 at 15:47:20 UTC, with one submitted URL and no warnings or errors.

The latest settled homepage performance window available on 2026-10-31 (2026-10-01 through 2026-10-28) contained 2 clicks and 2 impressions, both for the branded query `havenhub`. This sample is too small to establish a trend or rankings for non-brand queries. After deployment, verify the delivered copy and check homepage indexing and query impressions at the planned checkpoints.

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
