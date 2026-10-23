# HAVENHUB Design Specifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Complete the approval gates before publishing design or factual content.

**Goal:** Reconcile the HAVENHUB design specifications with the current Astro site, then deliver a consistent, accessible experience across the main site and its four supporting pages without exposing unapproved claims or photographs.

**Architecture:** Preserve `/` as the short entry card and `/site/` as the main site. Keep supporting routes data-driven through `supportingPages` and `[slug].astro`, reuse the existing shared shell, and add only focused components where a real content boundary warrants them, such as the photo gallery.

**Tech Stack:** Astro 7.3.1, TypeScript, existing CSS tokens, Playwright, axe-core. Use Astro `astro:assets` for approved local gallery images so builds can emit responsive variants; do not add dependencies.

**Spec:** `design/havenhub-design-specs/README.md` and `00-project-scope-and-decisions.md` through `07-responsive-accessibility-and-acceptance.md`.

## Global Constraints

- The design package is prepared for approval; do not begin implementation until the owner approves the specification.
- Preserve `/`, `/site/`, `/napriamy/`, `/programa/`, `/umovy/`, `/rodyni/`, 404 behavior, SEO/noindex, and publication guards.
- Reuse current Astro components, content sources, and tokens; do not rewrite the site or add dependencies.
- Do not add a “Наші фахівці” section, generated photos, or full-screen photo hero backgrounds.
- Do not publish unconfirmed medical claims, prices, availability, hours, exact address, meals, amenities, or program details.
- Keep original files under `design/havenhub-design-specs/assets/` untouched. Publish only center-approved derivative copies after checking consent, privacy, location exposure, and EXIF/GPS.
- Show only confirmed contact channels; use one source of truth for phone numbers and messenger URLs.
- Preserve all pre-existing uncommitted work; first identify what the current diff already implements and validate it before changing overlapping files.
- Do not commit, push, or deploy unless separately requested.

## Review Focus

- Unapproved claims about price, care availability, and conditions must not appear publicly; verify against the approved claims source and route output.
- Contact icons must not expose guessed destinations; test each rendered `href` against the confirmed contact data.
- Gallery images may reveal people, private items, documents, GPS metadata, or the facility location; review originals and built derivatives before release.
- Existing publication and noindex modes must keep their current route matrix; run the publication E2E suite after shared or route changes.
- Mobile navigation, forms, and gallery layouts must remain usable at 320 CSS px and 200% zoom; cover viewport tests and inspect the rendered pages.

## File Map

- `apps/clinic-web/src/components/Header.astro`, `Footer.astro`, and `BrandLogo.astro` — shared identity, navigation, contacts, and footer.
- `apps/clinic-web/src/content/customer-materials.ts` and `claims.ts` — canonical contact data and route-scoped factual claims.
- `apps/clinic-web/src/styles/global.css` — scoped design tokens and cross-page styling; avoid global changes that alter unrelated routes.
- `apps/clinic-web/src/pages/index.astro` and `components/EntryLanding.astro` — short `/` entry card; preserve its role.
- `apps/clinic-web/src/pages/site/index.astro` and its current section components — main `/site/` page.
- `apps/clinic-web/src/content/supporting-pages.ts` and `src/pages/[slug].astro` — `/napriamy/`, `/programa/`, `/umovy/`, and `/rodyni/` content and rendering.
- `apps/clinic-web/src/assets/conditions-gallery/` — create only for approved image derivatives; leave source uploads untouched.
- `apps/clinic-web/src/components/PhotoGallery.astro` — create only if it removes real duplicated markup.
- `apps/clinic-web/public/favicon.svg` and `src/pages/404.astro` — identity consistency checks.
- `apps/clinic-web/e2e/shared-chrome.spec.ts`, `homepage.spec.ts`, `supporting-pages.spec.ts`, `accessibility.spec.ts`, `lead-form.spec.ts`, and `publication.spec.ts` — extend existing checks; do not introduce a second test stack.

---

### Task 1: Reconcile the design approval and current worktree

**Files:** Read-only: `AGENTS.md`, the eight design documents, relevant route/content/component files, and current Git diff. No application files are changed in this task.

- [ ] Record current branch, `HEAD`, `git status`, and diff summary. Keep all existing dirty and generated files intact.
- [ ] Map each design requirement to existing code and current uncommitted changes. Mark verified requirements as already present instead of reimplementing them.
- [ ] Confirm owner approval of the specification and obtain content decisions for service availability, program details, conditions, form operation, contact channels, and each proposed photo.
- [ ] If approval or a factual confirmation is missing, stop before publishing the affected content or image and record it as a release blocker.

**Check:** A requirement-to-file matrix identifies existing coverage, implementation gaps, and approval blockers; Git status has no changes caused by this task.

### Task 2: Unify the shared visual and contact system

**Files:** Modify `Header.astro`, `Footer.astro`, `BrandLogo.astro`, `customer-materials.ts`, `global.css`, and `public/favicon.svg` only where the baseline shows a gap. Test `shared-chrome.spec.ts` and `accessibility.spec.ts`.

- [ ] Add or update shared-chrome assertions for one consistent logo, working logo destination, current-page `aria-current`, and confirmed contact links only.
- [ ] Run the focused tests to capture the baseline before changing shared components.
- [ ] Consolidate approved phone and messenger destinations in the existing canonical content source; do not invent Viber or WhatsApp endpoints.
- [ ] Align header, footer, CTA, typography, card, spacing, focus, and contrast styles with the spec using scoped tokens and existing components.
- [ ] Ensure mobile navigation and contact actions remain reachable at 320 px, and links expose the specified accessible names with at least 44×44 CSS px hit targets.
- [ ] Re-run shared-chrome and accessibility tests; inspect desktop and narrow-mobile renders.

**Expected:** Shared identity and confirmed contacts are consistent across all routes, while unconfirmed channels remain absent.

### Task 3: Refine the main site and the entry-card relationship

**Files:** Modify `pages/site/index.astro`, existing section components (`Hero.astro`, `Audience.astro`, `Services.astro`, `ProgramSummary.astro`, `Process.astro`, `FamilySummary.astro`, `ConditionsSummary.astro`, `Contact.astro`), and related content only as required. Preserve `pages/index.astro` and `EntryLanding.astro` as the short entry experience. Test `homepage.spec.ts`, `lead-form.spec.ts`, and `entry-landing.spec.ts`.

- [ ] Add tests for the main-site section order, primary contact path, and link from the conditions teaser to `/umovy/`.
- [ ] Remove duplicate explanations across “з чого почати”, process, program, and final contact blocks while preserving verified content.
- [ ] Keep the main CTA and form behavior truthful: verify submission and validation end-to-end; if submission is not active, render confirmed contact actions instead of implying delivery.
- [ ] Add one approved, factual space-photo teaser linking to `/umovy/`; omit it until a specific image and location-safety decision are approved.
- [ ] Verify the root `/` still clearly links to `/site/` and retains its distinct concise purpose.
- [ ] Run focused homepage/form/entry tests and inspect desktop and mobile output.

**Expected:** `/site/` presents a clear, non-repetitive path; `/` remains a separate short entry card.

### Task 4: Make the directions page scannable

**Files:** Modify the `napriamy` entry in `supporting-pages.ts`, its rendering in `[slug].astro`, and only its scoped rules in `global.css`. Test `supporting-pages.spec.ts`.

- [ ] Add route assertions for the three directions, three formats, and working consultation/contact destinations.
- [ ] Present each confirmed direction with a short introduction and a consistent list of 3–5 confirmed topics; remove repeated generic paragraphs.
- [ ] Present inpatient, outpatient, and home-visit formats as a compact comparison only where each is verified as available.
- [ ] Keep images of rooms out of direction cards; preserve the illustrative visual language and avoid results guarantees.
- [ ] Run route tests and inspect the page at 320, 390, 768, and 1440 px.

**Expected:** Visitors can scan the confirmed directions and formats without confusing room photos for evidence of treatment.

### Task 5: Structure the program page around the first conversation

**Files:** Modify the `programa` entry in `supporting-pages.ts`, its rendering in `[slug].astro`, and only program-scoped rules in `global.css`. Test `supporting-pages.spec.ts` and `publication.spec.ts`.

- [ ] Add assertions for the first-contact sequence, three discussion themes, and absence of repeated direction-page copy.
- [ ] Explain contact → clarify the request → discuss available formats → agree on a next step, without promising timing, price, free service, enrollment, or a guaranteed outcome.
- [ ] Break approved program descriptions into headings and short lists; keep critical content visible without requiring an accordion.
- [ ] Gate lists of procedures, methods, frequency, and support roles on confirmation by the center; omit unconfirmed specifics.
- [ ] Run route and publication tests and inspect the page at mobile and desktop widths.

**Expected:** The program route clarifies what can be discussed without asserting one fixed path for every person.

### Task 6: Build the conditions page and approved photo gallery

**Files:** Modify the `umovy` entry in `supporting-pages.ts` and `[slug].astro`; create `PhotoGallery.astro` only if it removes real duplicated markup; add approved derivative assets under `src/assets/conditions-gallery/`; update scoped styles. Test `supporting-pages.spec.ts` and `accessibility.spec.ts`.

- [ ] Add gallery assertions for 5–7 unique approved images, factual captions, accurate alt text, reserved dimensions, and no unexpected address or personal-data content.
- [ ] Select candidates from `design/havenhub-design-specs/assets/` only after the center confirms currentness, consent, safe location disclosure, and the represented room/area.
- [ ] Create web-ready copies without modifying originals; inspect image content and confirm derivatives contain no EXIF/GPS. If fewer than five photos pass, request a reshoot instead of lowering the bar.
- [ ] Use Astro `Picture`/`Image` from `astro:assets` for local source assets, with responsive widths and sizes; do not serve raw full-size uploads from `public/`.
- [ ] Render a static responsive gallery with no autoplay. Do not add a lightbox in the first version.
- [ ] Keep meals, gym, sauna, leisure, exact location, capacity, schedule, and conditions hidden unless each claim is confirmed.
- [ ] Verify gallery keyboard/screen-reader behavior, mobile image layout, built image sizes, and no horizontal overflow.

**Expected:** `/umovy/` shows a truthful, responsive view of the center, and its gallery contains only approved, privacy-checked media.

### Task 7: Refine support for family and close contacts

**Files:** Modify the `rodyni` entry in `supporting-pages.ts`, its rendering in `[slug].astro`, and scoped styles. Reuse the approved gallery source only for one distinct contextual image if allowed. Test `supporting-pages.spec.ts` and `accessibility.spec.ts`.

- [ ] Add assertions for the empathic first step, “important to know” callout, two practical steps, discussion topics, and non-duplicated CTA.
- [ ] Keep the tone non-judgmental and avoid assigning treatment responsibility to relatives or claiming participation without the person's consent.
- [ ] Include only center-confirmed support formats and participation details.
- [ ] Use no more than one approved contextual photo; do not create a second gallery or use bedroom imagery as a metaphor for emotional support.
- [ ] Run route/accessibility tests and inspect narrow mobile and desktop layouts.

**Expected:** `/rodyni/` gives relatives a clear, respectful contact path without claims about consent or services that have not been confirmed.

### Task 8: Cross-route acceptance and release gate

**Files:** Test-only unless a verified gap is found: the existing E2E specs and route components listed above. Do not change unrelated pages or publication configuration.

- [ ] Run focused Playwright suites for shared chrome, homepage/form, supporting pages, accessibility, and publication behavior.
- [ ] Run `pnpm --filter @vcard/clinic-web check`, `pnpm --filter @vcard/clinic-web test:publication`, and `pnpm --filter @vcard/clinic-web build:production`.
- [ ] Inspect `/site/`, `/napriamy/`, `/programa/`, `/umovy/`, `/rodyni/`, and 404 in Chromium at 320, 390, 768, 1024, and 1440 px; also inspect browser zoom at 200%.
- [ ] Verify navigation, forms, phone and messenger destinations, keyboard focus, reduced motion, contrast, image loading, broken requests, and console errors.
- [ ] Confirm production noindex/publication behavior and compare failures against the baseline captured in Task 1.
- [ ] Run `git diff --check` and review final status; preserve unrelated dirty/generated files and do not commit, push, or deploy.

**Release gate:** No page or photo ships until factual content and photo permissions are approved; no new regression is accepted in responsive, accessibility, route, or publication checks.
