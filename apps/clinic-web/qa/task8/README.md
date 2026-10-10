# Task 8 — HAVENHUB accessibility and integration handoff

Date: 2026-10-10. Branch: `codex/havenhub-supporting-pages`. Scope: `apps/clinic-web`, isolated worktree. Public release and merge are **not authorized** by this handoff.

## Findings and fixes

- RED → GREEN: activating the skip link previously left keyboard focus outside `main#content`. Added `tabindex="-1"` on homepage, four supporting pages, and 404. Browser tests confirm focus transfer.
- RED → GREEN: normal-mode navigation referenced nonexistent `#about`, `#services`, and `#faq` sections. Anchors now target actual landing sections; regression tests check every link.
- RED → GREEN: isolated Docker image omitted a Task 7 Astro-config dependency (`emit-seo-artifacts.mjs`). Dockerfile now copies it; image build passed.
- RED → GREEN: non-root Nginx could not read a `0600` root-owned config. Image now copies that file with `nginx` ownership and mode `0644`; Nginx continues running as non-root.
- The Docker smoke script was written for a superseded form prototype. It now checks the current *absence* of the form, closed metadata, favicon, non-existent route 404s, navigation, responsive layout, CTAs, client network isolation and assets.

## QA matrix

| Gate | Result | Evidence and limitation |
| --- | --- | --- |
| Astro, ESLint, Stylelint, Prettier | PASS | `pnpm --filter @vcard/clinic-web check` |
| Normal Chromium UI | PASS | 20 tests, 4 intentionally skipped unbuilt supporting pages |
| Staging Chromium UI | PASS | 28 tests, 3 intentional skips (two private media fixtures, one normal-only check) |
| Axe / keyboard / 320 CSS px on five pages | PASS | `e2e/accessibility.spec.ts`, Chromium staging |
| Reduced-motion handling | PASS | Playwright `emulateMedia({ reducedMotion: 'reduce' })` |
| 200%-equivalent CSS-viewport and 200% text resizing | PASS | Simulated text resize; **not** actual browser UI zoom |
| True browser zoom 200% | BLOCKED | Headless Chromium keyboard browser zoom keys did not change its zoom level; manual real browser test needed |
| Unknown HTTP / 404 | PASS | Local Docker Nginx, 404 navigation, closed normal route inventory |
| Synthetic staging media regression | PASS | 9/9 Playwright checks using synthetic placeholders; original artwork remains unverified |
| Current-tree secret scan | PASS | Gitleaks: no current working-tree leaks |
| Historical secret scan | FAIL — existing risk | Redacted Gitleaks scan identifies four historical findings; rotation/history remediation require separate authorization |
| Full-repo Markdown lint | FAIL — pre-existing unrelated issue | `.agents/agents/explorer.md` MD041 first-line heading; Task 8 Markdown passes its focused lint |
| Graphify local update | PASS | `graphify update .`; output remains ignored and uncommitted |
| Docker image and browser smoke | PASS | `make clinic-docker-build`, `make clinic-docker-up`, `make clinic-docker-check`; isolated stack stopped afterward |
| Full `clinic-web acceptance` | BLOCKED | Host runs Node 26.5.0; native `better-sqlite3` cannot load under ABI 147. Re-run with verified compatible Node 24 environment; no reinstall was attempted |
| Independent Codex reviewer | BLOCKED | `codex review --uncommitted` cannot parse existing `config.toml`: `agents` boolean conflicts with required role structure |
| Production CDN/headers, domain, approvals | BLOCKED | No confirmed domain/owner sign-off or authorized deployment |

## Visual evidence

Actual local normal-build Chromium renders (no customer submissions or personal data):

- [Mobile full page, 390 CSS px](landing-390.png)
- [Desktop full page, 1440 CSS px](landing-1440.png)

Reviewed both images for visible clipping, missing sections and CTA visibility. Browser plugin unavailable; Playwright was used. These images show normal draft mode, not protected staging or production.

## Read-only content and release review

- Content differentiates the alcohol, drug and gaming dependency categories from treatment formats; home visits are limited to Lviv and Lviv oblast.
- The 24/7 claim is confined to the hotline; only the first initial consultation is described as free. No unsupported outcomes, fabricated qualifications, reviews or full confidentiality promises were added.
- Normal mode remains `noindex,nofollow` and emits only `/` and `/404`; supporting pages are unavailable until staging/approved production. Task 7 production SEO gates remain separate.
- Privately supplied IMG_0905 and IMG_0907 bytes are **not** included in public `dist`; license, source provenance, real private asset delivery and authenticated staging host remain unverified.
- No lead form or Telegram bot endpoint is activated. B0, production authorization, canonical domain, CDN HTTP policy and historical secret rotation remain separate approval gates.

**Verdict: Task 8 implementation and local-browser/Docker evidence are PARTIAL overall. Do not merge into a release branch or deploy until required independent review and acceptance, actual zoom 200%, and release-owner approvals are resolved.**
