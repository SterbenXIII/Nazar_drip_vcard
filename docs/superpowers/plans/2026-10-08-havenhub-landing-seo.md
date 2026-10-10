# HAVENHUB Landing and SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Ukrainian HAVENHUB landing, four useful supporting pages, and a guarded release path where only `/` can be indexed.

**Architecture:** Keep the Astro static site and existing A6 publication guard. A deliberately selected build mode controls which pages are emitted and their metadata; the default stays closed. Content and contact links are shared, while each route has its own editorial purpose. Production activation remains a separate release decision.

**Tech Stack:** Astro 7.3.1, TypeScript, CSS, Playwright 1.58.2, Node >=24, pnpm 10.29.1.

**Spec:** `docs/superpowers/specs/2026-10-07-havenhub-landing-seo-design.md`.

**Baseline:** `ref/migrate` at `2d850a0eb6f28bb5ef429c8d7d01b4f01aa959e2`, clean when checked on 2026-10-08. PR #2 is merged. Confirm a fresh HEAD/status before Task 1; prior worktree reviews and PASS results are historical evidence only.

## Global Constraints

- Root `AGENTS.md` governs the repository: do not touch `apps/api/` or existing deployment contracts for this frontend work; do not commit or push without an explicit request.
- Normal mode (including an unset `CLINIC_SITE_MODE`) emits only `/` and `/404`, with `noindex,nofollow`; the existing service preview remains gated and nonpublic.
- Staging requires actual access control; `noindex` alone does not protect it. No production indexing until domain, content, rights, secrets, and release approval gates are met.
- Production `/` alone is `index,follow`; four supporting pages are `noindex` and absent from sitemap. Do not block them in `robots.txt` or canonicalize them to `/`.
- The center is in Львівська область, Україна. Home visits cover Lviv and Lviv oblast. The owner also states nationwide work, but the format outside this region needs confirmation; do not turn city names into false local presences. No address, guaranteed outcome, invented credentials, testimonials, or unverified medical claims.
- Hotline `24/7` and free **first initial consultation** are distinct claims. Keep dependency types separate from care formats.
- IMG_0905 and IMG_0907 are authorized only for protected staging, visibly labeled as illustrative. Do not commit their bytes to public Git or include them in an ordinary production image.
- The owner wants a minimal name/phone/dependency form delivered to a Telegram bot. This landing phase keeps B0 fail-closed; a separate B0 implementation plan is a required follow-up, with no live submissions until delivery and privacy are verified. Phone and Telegram are available now.
- HavenHub.com is a proposed name/domain, not a verified canonical origin. The original logo asset is pending; supplied JPEGs are mockups with backgrounds.
- Owner prefers a burgundy example and improved typography. Compare that direction against navy/teal before fixing tokens and fonts.

## Review Focus

1. Unset or malformed mode must stay closed: Task 1 tests default and invalid mode.
2. A build after another mode may retain stale `dist` files: Task 1 tests sequential builds and exact route inventory.
3. A CDN `X-Robots-Tag: noindex` can override production HTML: Task 7 tests actual HTTP headers.
4. A missing staging image must not turn into a broken public image or false evidence: Task 6 tests absent assets and captions.
5. Mobile menu focus and short viewport can trap a visitor: Task 4 tests keyboard, Escape, breakpoint, and scroll reachability.

## File Map

| Responsibility | Files |
| --- | --- |
| Build modes and route inventory | `apps/clinic-web/astro.config.mjs`, `apps/clinic-web/package.json`, `apps/clinic-web/scripts/check-metadata.mjs`, `apps/clinic-web/scripts/acceptance.mjs`, `apps/clinic-web/e2e/publication.spec.ts` (new) |
| Shared metadata and content | `apps/clinic-web/src/layouts/Layout.astro`, `apps/clinic-web/src/content/customer-materials.ts`, `apps/clinic-web/src/content/landing.ts` (new), `apps/clinic-web/src/content/claims.ts` (new), `docs/new-clinic/havenhub-claims.md` (new) |
| Navigation and common contact | `apps/clinic-web/src/components/Header.astro`, `Footer.astro`, `Contact.astro`, `apps/clinic-web/src/styles/global.css` |
| Landing composition | `apps/clinic-web/src/pages/index.astro`, existing `Hero.astro`, `Services.astro`, `Process.astro`; new `Audience.astro`, `ProgramSummary.astro`, `FamilySummary.astro`, `ConditionsSummary.astro` |
| Supporting pages | `apps/clinic-web/src/pages/[slug].astro` (new, `getStaticPaths()` emits only the four approved slugs outside normal mode); `src/content/supporting-pages.ts` (new, typed route/copy registry) |
| Browser coverage | `apps/clinic-web/e2e/homepage.spec.ts`, `lead-form.spec.ts`, new `supporting-pages.spec.ts`; update existing service tests only where the public presentation changes |

The exact export names in `customer-materials.ts` and current test filenames must be checked against the checkout before editing. Work from the verified `ref/migrate` HEAD, preserving unrelated changes; if HEAD moves, record the new base SHA and rerun affected checks.

---

### Task 1: Make route publication explicit and fail closed

**Files:** Modify `astro.config.mjs`, `package.json`, `scripts/check-metadata.mjs`, `scripts/acceptance.mjs`; create `e2e/publication.spec.ts`. Keep `src/pages/404.astro` emitted in every mode.

**Interfaces:** `CLINIC_SITE_MODE` accepts `normal`, `staging`, `production`; unset means `normal`, any other value fails the build. Preserve `CLINIC_ENABLE_SERVICE_PREVIEW=true` solely for the existing preview route in normal mode; staging and production reject it. The route policy is `normal: /,/404` (plus the explicitly gated preview); `staging: five routes plus /404`; `production: five routes plus /404`. The new dynamic `src/pages/[slug].astro` uses `getStaticPaths()` to return `[]` in normal and the four explicit slugs in staging/production. `check-metadata.mjs` asserts the exact file inventory after a clean build.

- [x] Write a failing publication test for unset/invalid mode, exact output routes in each mode, sequential `staging → normal` builds, and the preview gate. Run `pnpm --filter @vcard/clinic-web test:e2e -- e2e/publication.spec.ts`; expect failures in the new assertions.
- [x] Add mode selection and isolated scripts `build:staging`, `build:production`; production command must additionally require an explicit release flag and a valid HTTPS canonical origin, with no default domain. Until Task 3 creates the guarded dynamic route registry, staging/production metadata checks must report their missing routes rather than appear to pass. Retain `build:normal` and `build:content` semantics.
- [x] Extend `check-metadata.mjs` with a passing normal inventory check and an intentionally failing staging check that reports four missing pages until Task 3. After Task 3, add staging to acceptance and restore normal output. Run `pnpm --filter @vcard/clinic-web build:normal` then `pnpm --filter @vcard/clinic-web check:metadata`; expect PASS.
- [x] Review generated `dist` after each build; no old HTML route may remain. Do not invoke production deployment.

### Task 2: Claim register and landing copy

**Files:** Create `src/content/landing.ts`, `src/content/claims.ts`, `docs/new-clinic/havenhub-claims.md`, `e2e/landing-content.spec.ts`; modify `src/content/customer-materials.ts`.

**Interfaces:** `landing.ts` exports ordered section copy and the separate arrays `dependencyTypes` and `careFormats` or reuses the existing typed arrays; `claims.ts` records exact wording, source/date, approver, routes, staging/production status, and recheck date. The register is editorial evidence, not an automatic approval of publication.

- [ ] Write failing assertions against the typed content exports for hero H1, separate hotline/free consultation wording, location, three dependency types, three formats, cost determined after consultation, and absence of an address or home visits outside Lviv and Lviv oblast.
- [ ] Enter the spec's draft text and section brief (visitor question, short answer, evidence, action). Add the owner's five-step contact flow: call/request, initial consultation, discuss condition, agree format and cost, then a home visit within Lviv/Lviv oblast or center program as applicable. Mark detox, PTSD, methods, staff count, confidentiality promises, image rights, and the claimed 300–400+ course completions/outcomes as pending verification; do not render the outcome claim as a fact.
- [ ] Run `pnpm --filter @vcard/clinic-web test:e2e -- e2e/landing-content.spec.ts` and review every copy assertion against `havenhub-claims.md`; expected PASS. Rendered copy is checked again in Task 5.

### Task 3: Author the four supporting routes

**Files:** Create `src/pages/[slug].astro`, `src/content/supporting-pages.ts`, `e2e/supporting-pages.spec.ts`; reuse shared Layout/Header/Footer/Contact and copy data from Task 2.

**Interfaces:** `getStaticPaths(): {params: {slug: 'programa' | 'umovy' | 'rodyni' | 'napriamy'}, props: {page: SupportingPage}}[]` returns `[]` for normal and four records for staging/production. `SupportingPage` stores title, H1, ordered sections, and CTA. Each route expands, rather than repeats, the landing; no unsupported combinations of dependency type and format. Keep the older `/preview/services/template-demo/` route gated separately.

- [ ] Write failing route tests for status 200, distinct H1/title, navigation back to `/`, contact actions, and the page-specific section sequence in spec §5. Assert no personal data promise on `/rodyni/` and no 3×3 service grid on `/napriamy/`.
- [ ] Implement the four pages, marking unresolved details for the internal claim register rather than displaying placeholder questions as facts. Keep layout and contact consistent.
- [ ] Run `pnpm --filter @vcard/clinic-web test:e2e -- e2e/supporting-pages.spec.ts`; expect PASS in staging. Run normal metadata check; expect those four routes absent.

### Task 4: Shared navigation, contact, and layout

**Files:** Modify `Header.astro`, `Footer.astro`, `Contact.astro`, `Layout.astro`, `global.css`, `e2e/lead-form.spec.ts`; create `e2e/shared-chrome.spec.ts`. Update obsolete homepage expectations as part of Task 5.

**Interfaces:** Shared header/footer navigation contains `/programa/`, `/umovy/`, `/rodyni/`, `/napriamy/` in staging/production; in normal mode those unavailable links must not lead to 404. Header call link uses the existing `consultationCta`; Telegram uses the existing `telegram` data. `Layout` receives page title, description, and route policy (later Task 7 adds production canonical/OG).

- [ ] Add failing browser assertions for four menu destinations in staging, no broken route in normal, phone and Telegram in contact/footer, one main landmark, and a keyboard menu that closes on Escape with focus returned. Check 375×360 scrolling and desktop breakpoint focus.
- [ ] Implement responsive shared chrome; keep text logo, visible call action, skip link and current focus behavior. Replace visible disabled form with a complete phone/Telegram contact block while leaving the lead script and any B0 endpoint unavailable; remove its script from the visible page if no form exists.
- [ ] Update `lead-form.spec.ts` to assert there is no submit control, no POST, and no live catalog. Run `pnpm --filter @vcard/clinic-web test:e2e -- e2e/shared-chrome.spec.ts e2e/lead-form.spec.ts`; expect PASS for selected cases.

### Task 5: Compose the complete landing

**Files:** Modify `index.astro`, `Hero.astro`, `Services.astro`, `Process.astro`, `global.css`, `e2e/homepage.spec.ts`; create `Audience.astro`, `ProgramSummary.astro`, `FamilySummary.astro`, `ConditionsSummary.astro`; stop rendering `Faq.astro` and old placeholder `About.astro` on `/`.

**Interfaces:** Main section order is hero → audience → dependency types → care formats → program → first contact → family → conditions → final contact. Detail links target only the relevant supporting page in modes where it exists.

- [ ] Make homepage tests fail on exact H1, section order, meaningful one-sentence explanations, visible actions, absence of `Перейти на основний сайт`, placeholder FAQ, and disabled form.
- [ ] Before fixing design tokens, prepare matching hero, body, and contact samples in current navy/teal and a restrained burgundy direction; compare 2–3 legible, licensed font pairs with Ukrainian Cyrillic at mobile and desktop sizes. Record the selected palette and type system after owner review, then build focused components with open text, concise lists, and a few true-choice cards. Keep the first hero free of imagery that implies a real center.
- [ ] Run `pnpm --filter @vcard/clinic-web test:e2e -- e2e/homepage.spec.ts`; inspect screenshots at 320, 390, 768 and desktop widths. Keep one H1 and meaningful heading hierarchy.

### Task 6: Staging illustrations without public asset leakage

**Files:** Modify `ConditionsSummary.astro`, `src/content/supporting-pages.ts`, `src/pages/[slug].astro`, `e2e/supporting-pages.spec.ts`; add a deployment note to `docs/new-clinic/havenhub-claims.md`. Do not add IMG_0905/IMG_0907 to `public/` or Git.

**Interfaces:** The protected staging host provides two separately named media URLs through a private deployment channel. If unavailable, render a neutral text layout without a broken `<img>`; production renders only approved replacements after rights review. Both staging images carry visible caption `Візуалізація, не фото приміщення центру` and scene-descriptive alt.

- [ ] Test each image appears at most once in its intended staging section, with caption and alt, and that missing/private media do not leak into normal/production HTML.
- [ ] Implement optional image slots and document protected asset handoff, provenance, rights, and replacement path. IMG_0905/0907 visibly contain a branded concept interior; caption them as visualizations rather than evidence of premises. Verify any internet stock license and avoid labeling a model as the center's doctor. Do not use concept imagery for OG preview.
- [ ] Run staging browser tests with an authorized private fixture and without it; verify the public build has no references to temporary media.

### Task 7: Metadata, sitemap, and delivered HTTP policy

**Files:** Modify `Layout.astro`, `scripts/check-metadata.mjs`, `astro.config.mjs`; create a minimal sitemap emitter under `scripts/` if Astro output does not already generate the one-URL sitemap; extend `e2e/publication.spec.ts`.

**Interfaces:** Normal and staging HTML are `noindex`; production `/` is `index,follow` with exact HTTPS self-canonical, approved title/description, `lang=uk`, and accurate OG/Twitter URL/title/description. Supporting routes are `noindex` with no homepage canonical; `/404` is never indexed. Only production sitemap includes `/`. Do not invent schema, address, rating, staff, or social image.

- [ ] First assert every emitted HTML file's robots/title/description/canonical and sitemap inventory in each mode; add tests for unknown host, missing approval flag, and trailing slash canonical normalization. Expect current code to fail.
- [ ] Implement metadata per mode and one-URL sitemap. Verify `robots.txt` does not disallow supporting routes; omit structured data until its required visible facts are approved.
- [ ] Run all three metadata checks on fresh builds and inspect served HTTP responses with `curl -I`: in production configuration `/` must have no `X-Robots-Tag: noindex`; supporting pages must remain crawlable to reveal `noindex`. Repeat at the actual proxy/CDN only during authorized release; mark that remote check BLOCKED until then.

### Task 8: Accessibility, quality, and release handoff

**Files:** Extend `e2e/homepage.spec.ts`, `e2e/supporting-pages.spec.ts`, `scripts/acceptance.mjs`; document results and open approvals in `docs/new-clinic/havenhub-claims.md`.

- [ ] Add focused axe and keyboard tests across five pages, 320 CSS px reflow, true browser zoom 200%, reduced motion, links and 404 behavior. Record visual evidence for desktop/mobile without personal data.
- [ ] Run `pnpm --filter @vcard/clinic-web check`, `pnpm --filter @vcard/clinic-web acceptance`, `pnpm --filter @vcard/clinic-web build:normal`, `pnpm --filter @vcard/clinic-web check:metadata`, `pnpm mdlint`, `git diff --check`, and `make secret-scan`; run the applicable existing Docker smoke. Inspect diff and worktree. Report each check PASS/FAIL/BLOCKED/NOT VERIFIED.
- [ ] Perform a separate read-only review of copy, index policy, image rights, and publication guard. Keep production release blocked until domain and owner approvals, secret rotation status, and actual CDN/header checks are resolved. Search Console and Business Profile steps occur only after authorized public release.

### Task 9: Plan the owner's Telegram lead form as a separate B0 deliverable

**Files:** Review the existing `docs/havenhub-kit/06-b0-lead-spec.md` and `docs/havenhub-kit/07-b0-lead-plan.md` against the actual `apps/api` contract. Update those handoff documents only for concrete findings; do not create duplicate dated Superpowers documents unless review identifies a material scope gap.

**Interface to design:** Name, phone, dependency type; submission through a server-side HTTPS endpoint to a Telegram bot, never a browser-exposed bot token. Define privacy notice and consent, validation, abuse controls, delivery failure behavior, retention, and a test chat. Activate the form only after the flow is tested and approved.

- [ ] Reconcile the existing B0 spec with the owner's form request and current API contract; record unresolved owner decisions without inferring values.
- [ ] Specify mock Telegram delivery, failure tests, and a fail-closed fallback without using real personal data in tests.
- [ ] Keep the existing B0 plan separate from landing implementation and gated on contract/privacy approval; retain phone and Telegram CTAs while the form is pending.

## Future release step — separate owner approval

This step follows the landing handoff and does not authorize publication. `Layout.astro` remains `noindex,nofollow` in Task 1. The mode-aware `check-metadata.mjs` checks exact inventories: normal is `/` and `/404` (plus the explicitly gated preview); staging and production report the four missing supporting pages until Task 3 adds them.

- [ ] Verify ownership of the exact HTTPS domain and record the owner's explicit production release approval. Without both, keep public indexing disabled.
- [ ] On clean normal, authorized staging, and gated production builds, test the exact HTML route inventory and robots metadata for `/`, `/programa/`, `/umovy/`, `/rodyni/`, and `/napriamy/`. Normal emits only `/` and `/404` with `noindex,nofollow`; staging serves the five pages behind authentication with `noindex`; production may set `/` to `index,follow` only after approval, while the four supporting pages remain accessible with `noindex`.
- [ ] Assert that only the approved HTTPS homepage URL appears in the production sitemap, and that supporting pages are absent from it. Check canonical, title, description, and `X-Robots-Tag` in generated HTML and delivered HTTP after the actual proxy/CDN; confirm crawlers can read the supporting pages' `noindex`.
- [ ] Record fresh normal/staging/production results and a release review before any public switch. If the domain, approval, or delivered HTTP evidence is missing, mark release BLOCKED and retain the closed artifact.

## Self-review and handoff

Coverage: §2 navigation in Tasks 3/4; §3 styling/a11y in Tasks 5/8; §4 landing in Tasks 2/5; §5 four pages in Task 3; §6 private images in Task 6; §7 claim register in Task 2; §8 modes/SEO in Tasks 1/7; §9 acceptance in Task 8; §10 full client brief in Tasks 2/5/6/9. No release action belongs to this implementation plan. Implementers should read the spec and fresh repository state before Task 1; tests referring to changed A6 markup must be updated to validate behavior rather than preserve obsolete presentation.
