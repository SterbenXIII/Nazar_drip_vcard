# Code Review — TODO List & Proposals

> Last updated: March 2026 — re-scanned after the Node.js 24 migration and second round of fixes.
> ✅ Completed items have been removed. Items marked with ⚠️ were partially addressed.

---

## 🔴 Critical — Fix Before Production

### 1. Sensitive files committed to git — **IMMEDIATE ACTION REQUIRED** `[@all]`

**Problem:** Multiple sensitive files are tracked by git and present in the repository history:

| File                                                                 | Risk                                                                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `ops/certs/certbot/conf/accounts/{acme-account-id}/private_key.json` | Let's Encrypt ACME RSA private key — enables certificate hijacking and revocation |
| `apps/api/data/leads.db` / `leads.db-shm` / `leads.db-wal`           | Real customer PII (names, phone numbers, districts)                               |
| `data/leads.db` (repo root)                                          | Duplicate lead database                                                           |
| `ops/certs/local/vcard.local-key.pem`                                | Dev TLS private key                                                               |

**Proposal:**

1. **Rotate the Let's Encrypt ACME key immediately** via the ACME provider — the existing key is compromised.
2. Remove all sensitive files from git history using `git filter-repo` or BFG Repo Cleaner.
3. Add to `.gitignore`:

```
ops/certs/
apps/api/data/
data/
*.db
*.db-shm
*.db-wal
*.pem
*.key.json
```

**Files:** `.gitignore`, `ops/certs/`, `apps/api/data/`, `data/`

---

### 2. Rate limiter uses wrong algorithm — throttle, not a rate limit `[@vcard/api]`

**Problem:** The current rate limiter in `apps/api/src/app.ts`:

```ts
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_WINDOW = 60 * 1000  // 1 min
const MAX_REQUESTS = 5

if (now - lastRequest < RATE_LIMIT_WINDOW / MAX_REQUESTS) { ... }
```

This divides the window by the request count, enforcing a **12-second minimum gap** between requests from a single IP — not 5 requests per minute. A legitimate user who submits the form twice in 11 seconds gets blocked, while an attacker making one request per 12 seconds can submit indefinitely.

Additionally, `rateLimitMap` is never cleaned up → **unbounded memory leak**.

Also, `x-forwarded-for` is used as the IP source without trusting only known proxy headers — this can be spoofed by clients directly hitting the API on port 5678.

**Proposal:** Replace with a sliding-window counter (or use `hono-rate-limiter`):

```ts
const rateLimitMap = new Map<string, number[]>()

app.use(`/api${API_ROUTES.LEAD_SUBMIT}`, async (c, next) => {
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
    'anon'
  const now = Date.now()
  const timestamps = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW)

  if (timestamps.length >= MAX_REQUESTS) {
    return c.json({ error: 'Too many requests' }, 429)
  }

  timestamps.push(now)
  rateLimitMap.set(ip, timestamps)

  // Periodic cleanup to prevent unbounded growth
  if (rateLimitMap.size > 10_000) {
    for (const [key, ts] of rateLimitMap) {
      if (ts.every((t) => now - t > RATE_LIMIT_WINDOW)) rateLimitMap.delete(key)
    }
  }
  await next()
})
```

**File:** `apps/api/src/app.ts`

---

### 3. Caddy CSP is missing GTM/GA — analytics silently blocked in production `[docker]`

**Problem:** `ops/docker/caddy/Caddyfile` sets:

```
Content-Security-Policy "... script-src 'self' https://*.viber.com; ..."
```

`https://www.googletagmanager.com` is **not** in `script-src`. Google Tag Manager (hardcoded in `Analytics.astro`) will be blocked by the browser CSP when traffic flows through Caddy (production), breaking all analytics tracking silently.

**Proposal:** Update the Caddyfile CSP:

```
Content-Security-Policy "default-src 'self' viber: tel: mailto: https://wa.me; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.viber.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.telegram.org https://*.viber.com https://www.google-analytics.com; frame-src 'self' viber: tel: mailto: https://wa.me;"
```

**File:** `ops/docker/caddy/Caddyfile`

---

### 4. Telegram webhook secret checked after identity middleware, not before `[@vcard/api]`

**Problem:** In `apps/api/src/app.ts`:

```ts
app.post(API_ROUTES.TELEGRAM_WEBHOOK, telegramAuth, async (requestContext) => {
  const secret = requestContext.req.header('X-Telegram-Bot-Api-Secret-Token')
  if (ENV.WEBHOOK_SECRET && secret !== ENV.WEBHOOK_SECRET) { ... }  // ← too late
```

`telegramAuth` parses the JSON body and checks user identity before the secret token is validated. Any request with a valid user ID in the body JSON can reach the middleware before being rejected. The secret token check (which is the primary authentication layer) should be first.

**Proposal:** Move the secret-token check to a middleware that runs before `telegramAuth`:

```ts
const webhookSecretGuard = createMiddleware(async (c, next) => {
  if (ENV.WEBHOOK_SECRET) {
    const incoming = c.req.header('x-telegram-bot-api-secret-token')
    if (incoming !== ENV.WEBHOOK_SECRET) {
      return c.json({ error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS }, 403)
    }
  }
  await next()
})

app.post(API_ROUTES.TELEGRAM_WEBHOOK, webhookSecretGuard, telegramAuth, ...)
```

**File:** `apps/api/src/app.ts`, `apps/api/src/middleware/auth.ts`

---

### 5. Third-party GitHub Actions still use mutable tags `[ci]`

**Problem:** Multiple workflows still use `@master` or floating version tags for third-party actions:

```yaml
uses: appleboy/telegram-action@master      # all 4 workflows
uses: aquasecurity/trivy-action@master     # deploy.yml
uses: hadolint/hadolint-action@v3.1.0     # ci.yml (floating major)
```

A compromised upstream repo or a force-pushed tag would execute malicious code with access to all CI secrets.

**Proposal:** Pin every third-party action to a specific commit SHA:

```yaml
# appleboy/telegram-action — pin to a verified release SHA
uses: appleboy/telegram-action@fc361a4b84d832f30b2c3afde69c6e7af57bc5ab
# aquasecurity/trivy-action v0.24.0
uses: aquasecurity/trivy-action@6e7b7d1fd3e4fef0c5fa8cce1229c54b2c9bd0d8
# hadolint/hadolint-action v3.1.0
uses: hadolint/hadolint-action@54c9adbab1582c2ef04b2016b760714a4bfde3cf
```

**Files:** `.github/workflows/deploy.yml`, `.github/workflows/rollback.yml`, `.github/workflows/ci.yml`, `.github/workflows/deploy-ssh.yml`, `.github/workflows/deploy-init-ssl.yml`

---

### 6. Docker healthcheck uses `node -e "fetch(...)"` — fragile `[@vcard/api]`

**Problem:** Both `ops/docker/api/Dockerfile` and `ops/docker/compose/docker-compose.yml` use:

```dockerfile
CMD node -e "fetch('http://localhost:5678/api/health')..."
```

This relies on the Node.js runtime existing in the container and global `fetch` being available. It is unnecessarily fragile compared to using a standard OS tool.

**Proposal:** Replace with `wget` (already installed as `sqlite3` brings it in transitively):

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD wget -qO- http://localhost:5678/api/health || exit 1
```

Apply the same change in `docker-compose.yml`.

**File:** `ops/docker/api/Dockerfile`, `ops/docker/compose/docker-compose.yml`

---

### 7. GitHub token still passed as `--extra-vars` in Ansible (process list visible) `[ci, devops]`

**Problem:** In `.github/workflows/deploy.yml`:

```yaml
--extra-vars "github_token=${{ secrets.GITHUB_TOKEN }}"
```

Process arguments are visible in `/proc/$PID/cmdline` on the runner. Ansible also logs `--extra-vars` in verbose mode (`-vv`), potentially exposing the token in CI logs.

**Proposal:** Pass via environment variable (Ansible's `lookup('env', ...)` already reads `ENV`):

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
# In playbook.yml vars:
github_token: "{{ lookup('env', 'GITHUB_TOKEN') }}"
```

Remove `--extra-vars "github_token=..."` from the `ansible-playbook` command line.

**File:** `.github/workflows/deploy.yml`, `ops/ansible/playbook.yml`

---

## 🟡 Moderate — Address Soon

### 8. `console.*` calls remaining in production service files `[@vcard/api]`

**Problem:** Despite the Pino logger existing, these production files still use `console.*`:

| File                                                                       | Issue                           |
| -------------------------------------------------------------------------- | ------------------------------- |
| `apps/api/src/services/providers/email.provider.ts`                        | 2× `console.error`              |
| `apps/api/src/services/providers/messaging/telegram-messaging.provider.ts` | `console.log` + `console.error` |
| `apps/api/src/middleware/auth.ts`                                          | `console.warn`                  |
| `apps/api/src/core/factories/database.factory.ts`                          | `console.log`                   |
| `apps/api/src/utils/turnstile.util.ts`                                     | `console.error`                 |

These bypass structured Pino logging, will not appear in JSON production logs, and expose internal details in plaintext.

**Proposal:** Replace each occurrence with the imported `logger` from `@/config/logger`:

```ts
import { logger } from '@/config/logger'

// instead of: console.error(msg)
logger.error({ msg })
// instead of: console.log(msg)
logger.info({ msg })
```

**Files:** all files listed above

---

### 9. Turnstile integration — resolved in Phase 4 `[@vcard/web]`

**Historical problem:** `apps/web/src/components/Turnstile.astro` existed (with an always-pass test key) but was not rendered in `ContactForm.astro`. The client still read the token field, so the configured server verifier could never receive a browser token.

**Phase 4 resolution:**

- `ContactForm.astro` renders `Turnstile.astro` only when the public site key is configured.
- `contact-form.ts` includes the browser token when the widget is enabled.
- No public test-key fallback remains.
- Empty `PUBLIC_TURNSTILE_SITE_KEY` keeps the form functional without the widget.

**Files:** `apps/web/src/components/ContactForm.astro`, `apps/web/src/components/Turnstile.astro`, `apps/web/src/scripts/contact-form.ts`

---

### 10. Configure a test runner — no `test` script, no test framework wired `[@vcard/api]`

**Problem:** There is no `"test"` script in `apps/api/package.json`. Integration test files exist under `src/tests/manual/` but cannot be executed via the standard `pnpm test` command. The orphaned `@jest/globals` dev dependency has been removed (cleanup done), but a proper test runner is still missing.

**Proposal:** Add vitest (preferred for ESM/TypeScript projects without CommonJS compromise) and wire up the script:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Then move or convert any applicable manual test logic in `src/tests/manual/` to proper vitest test cases.

**File:** `apps/api/package.json`, `apps/api/src/tests/`

---

### 11. `DATABASE_PATH` not configurable via environment variable `[@vcard/api]`

**Problem:** `DATABASE_PATHS.LEADS_DB` is hardcoded to `'data/leads.db'`. Operators cannot change the storage path without editing source code.

**Proposal:** Add an optional `DATABASE_PATH` env var to `env.config.ts`:

```ts
DATABASE_PATH: z.string().optional().default('data/leads.db'),
```

Then use `ENV.DATABASE_PATH` in `DatabaseService` instead of `DATABASE_PATHS.LEADS_DB`.

**File:** `apps/api/src/config/env.config.ts`, `apps/api/src/services/database.service.ts`

---

### 12. IP address not stored in leads table — limits spam investigation `[@vcard/api]`

**Problem:** The `leads` table has no `ip_address` column. Spam analysis and GDPR subject-access requests cannot correlate submissions to a network source.

**Proposal:**

1. Add a new migration `002_add_ip_to_leads.ts` that adds `ip_address TEXT` (nullable).
2. Extract IP in `lead.routes.ts`:

```ts
const ip =
  context.req.header('CF-Connecting-IP') ??
  context.req.header('x-forwarded-for')?.split(',')[0].trim() ??
  null
await coordinator.handleIncomingLead({ ...validatedData, ip, timestamp: new Date() })
```

**File:** `apps/api/src/config/database/schemas/lead.schema.ts`, `apps/api/src/routes/lead.routes.ts`, new migration file

---

### 13. `nginx.prod.conf` has a conflicting CSP — inconsistent security policy `[docker]`

**Problem:** `ops/docker/nginx/nginx.prod.conf` defines a `Content-Security-Policy` header that differs from Caddy's policy:

- Nginx CSP allows: `challenges.cloudflare.com` (Turnstile), `www.googletagmanager.com`
- Caddy CSP allows: `*.viber.com`, `wa.me` — but **not** GTM

It is unclear which file is actually used in production. Having two different CSPs in the codebase creates confusion and makes auditing impossible.

**Proposal:** Choose a single CSP source (Caddy is the production reverse proxy), delete or clearly mark `nginx.prod.conf` as unused/legacy, and consolidate all security headers into the Caddyfile.

**File:** `ops/docker/nginx/nginx.prod.conf`, `ops/docker/caddy/Caddyfile`

---

### 14. GTM container ID still hardcoded in `siteConfig` (not env var) `[@vcard/web]`

**Problem:** `apps/web/src/config/site.ts`:

```ts
analytics: {
  gtmId: 'GTM-K9N6B54V',  // ← hardcoded production ID
},
```

This makes it impossible to use a different GTM container in staging without editing source code.

**Proposal:** Load from env variable at build time:

```ts
analytics: {
  gtmId: import.meta.env.PUBLIC_GTM_ID || '',
},
```

Add `PUBLIC_GTM_ID=GTM-K9N6B54V` to `.env.example` and the CI/CD env vars.

**File:** `apps/web/src/config/site.ts`, `.env.example`

---

### 15. OG image path `/og/${slug}.png` references a non-existent directory `[@vcard/web]`

**Problem:** `SeoHead.astro` references per-service Open Graph images at `/og/${slug}.png`. There is no `apps/web/public/og/` directory. Every service page has a broken OG image (404), killing Facebook, Telegram, and Twitter previews.

**Proposal (short-term):** Fall back to the generic image:

```ts
const defaultOgImage = '/assets/og-preview.svg'
```

**Proposal (long-term):** Generate PNG OG images at build time using `satori` or `@astrojs/og`, placing them in `public/og/` named by slug.

**File:** `apps/web/src/components/SeoHead.astro`

---

### 16. OG fallback image is SVG — not supported by social platforms `[@vcard/web]`

**Problem:** `/assets/og-preview.svg` is an SVG file. The Open Graph spec requires raster images (PNG/JPEG). Facebook, Slack, Discord, and Telegram all ignore or reject SVG OG images.

**Proposal:** Convert `og-preview.svg` to a 1200×630 PNG and update the reference:

```ts
const defaultOgImage = '/assets/og-preview.png'
```

**File:** `apps/web/src/components/SeoHead.astro`, `apps/web/public/assets/`

---

### 17. `docker system prune -f` in Final System Cleanup not guarded `[devops]`

**Problem:** `ops/ansible/playbook.yml` still calls:

```yaml
ansible.builtin.command: 'docker system prune -f'
```

as the "Final System Cleanup" step. This runs **after** the main deployment block, including after the `rescue:` block for failures. If deployment partially fails, this prune deletes previously-working images needed for rollback.

**Proposal:** Replace with the targeted pruning already used in `07_cleanup.yml` (dangling images only), or guard with a `when: deployment_succeeded | default(false)` variable set only on successful deployment.

**File:** `ops/ansible/playbook.yml`

---

### 18. Docker base images pinned to version strings but not digest `[docker]`

**Problem:** Both Dockerfiles were recently migrated to `node:24-bookworm-slim` (floating minor/patch tag) and `nginx:1.25.4-alpine`. Docker tags are mutable — a force-pushed tag can silently change the underlying image.

**Proposal:** Pin to the full SHA256 image digest for fully reproducible builds:

```dockerfile
# node:24-bookworm-slim — get digest with: docker pull node:24-bookworm-slim && docker inspect --format '{{index .RepoDigests 0}}' node:24-bookworm-slim
FROM node:24-bookworm-slim@sha256:<digest-here> AS base
# nginx:1.25.4-alpine
FROM nginx:1.25.4-alpine@sha256:<digest-here> AS runtime
```

Use Renovate or Dependabot to automate digest updates when a new secure patch is released.

**File:** `ops/docker/api/Dockerfile`, `ops/docker/web/Dockerfile`

---

### 19. Add `<meta name="robots" content="noindex">` for thin city/district pages `[@vcard/web]`

**Problem:** City hub pages (`/lviv`, `/ru/lviv`) and district hub pages (`/lviv/lychakiv`) are generated with only breadcrumb + service grid content. These pages have limited unique text and could be penalised by Google's thin-content detector.

**Proposal:** Conditionally add `noindex` meta in `SeoHead.astro` for hub pages, or extend the `robots` content prop to accept a custom value per page:

```astro
<meta name="robots" content={robotsContent ?? 'index, follow, ...'} />
```

Then in city/district pages:

```astro
<Layout robotsContent="noindex, follow" ... />
```

**File:** `apps/web/src/components/SeoHead.astro`, `apps/web/src/layouts/Layout.astro`, city/district page files

---

## 🟢 Minor — Nice to Have

### 20. `console.log` in `DatabaseFactory.create()` should use Pino logger `[@vcard/api]`

**Problem:** `apps/api/src/core/factories/database.factory.ts` uses:

```ts
console.log(`[DatabaseFactory] create() called with type: ${config.type}`)
```

`DatabaseFactory` is not actively used at runtime (DatabaseService is used directly), but if it ever is, this log bypasses structured logging.

**Proposal:** Replace with `logger.debug(...)` from `@/config/logger`.

**File:** `apps/api/src/core/factories/database.factory.ts`

---

### 21. Pin transitive runtime dependencies to exact versions `[@vcard/api, @vcard/web]`

**Problem:** Most runtime dependencies use `^` caret ranges (e.g. `"hono": "^4.0.0"`). Minor-version bumps are applied automatically by `pnpm install --frozen-lockfile` only during lock file regeneration, but the range itself allows drift.

**Proposal:** Switch all production `dependencies` entries to exact versions:

```json
"hono": "4.7.4"  // not "^4.7.4"
```

Use `pnpm audit` (already in CI) to monitor for CVEs, and use Dependabot/Renovate to automate version bump PRs.

**File:** `apps/api/package.json`, `apps/web/package.json`

---

### 22. `DL3008` still globally ignored in `.hadolint.yaml` `[ci, docker]`

**Problem:** `.hadolint.yaml` globally suppresses `DL3008` (pin apt package versions). This silences warnings for all Dockerfiles, including cases where pinning would improve reproducibility.

**Proposal:** Remove DL3008 from the global `ignored` list. Use inline `# hadolint ignore=DL3008` comments only on the specific `RUN apt-get install ...` lines where pinning is intentionally skipped, with a justification comment.

**File:** `.hadolint.yaml`

---

### 23. `siteConfig.social` has empty `instagram` and `facebook` fields `[@vcard/web]`

**Problem:** `siteConfig.social.instagram` and `siteConfig.social.facebook` are empty strings. They are wired into `BUSINESS.sameAs` with a `.filter(Boolean)`, so they are correctly excluded for now. But the pending TODO comment `// Add if needed` has been there since the beginning.

**Proposal:** Populate with actual profile URLs when available (Google Business Profile, Instagram, Facebook). Even adding Google Business Profile URL is enough to significantly improve entity disambiguation.

**File:** `apps/web/src/config/site.ts`

---

### 24. `tsc-alias` dev dependency in `@vcard/api` is unused `[@vcard/api]`

**Problem:** `tsc-alias` is listed in `apps/api/package.json` devDependencies but is not referenced in any script. The API build uses `esbuild` for bundling (which resolves path aliases natively), so `tsc-alias` serves no purpose.

**Proposal:** Remove `tsc-alias` from `apps/api/package.json` devDependencies (it remains valid in the root `package.json` if used by other tooling):

```bash
pnpm --filter @vcard/api remove tsc-alias
```

**File:** `apps/api/package.json`

---

## Summary Table

| #   | Severity    | Area     | Short description                                                                        |
| --- | ----------- | -------- | ---------------------------------------------------------------------------------------- |
| 1   | 🔴 Critical | Security | Sensitive files (private keys, DB with PII) committed to git                             |
| 2   | 🔴 Critical | API      | Rate limiter uses wrong algorithm + memory leak                                          |
| 3   | 🔴 Critical | DevOps   | Caddy CSP missing GTM/GA — analytics blocked in production                               |
| 4   | 🔴 Critical | API      | Webhook secret checked after identity middleware, not before                             |
| 5   | 🔴 Critical | CI       | Third-party Actions still use mutable `@master` / floating tags                          |
| 6   | 🔴 Critical | DevOps   | API Dockerfile healthcheck uses fragile `node -e "fetch(...)"`                           |
| 7   | 🔴 Critical | CI       | GitHub token still in `--extra-vars` (process list visible)                              |
| 8   | 🟡 Moderate | API      | `console.*` remaining in email, telegram, auth, factory, turnstile                       |
| 9   | 🟡 Moderate | Web      | Turnstile dead code — widget not rendered, token always null                             |
| 10  | 🟡 Moderate | API      | Test runner not wired (no `test` script, no framework)                                   |
| 11  | 🟡 Moderate | API      | `DATABASE_PATH` not configurable via env var                                             |
| 12  | 🟡 Moderate | API      | IP address not stored in leads table                                                     |
| 13  | 🟡 Moderate | DevOps   | `nginx.prod.conf` has conflicting CSP vs Caddy                                           |
| 14  | 🟡 Moderate | SEO      | GTM container ID hardcoded in `siteConfig` (not env var)                                 |
| 15  | 🟡 Moderate | SEO      | OG image `/og/${slug}.png` path doesn't exist                                            |
| 16  | 🟡 Moderate | SEO      | OG fallback image is SVG — rejected by social platforms                                  |
| 17  | 🟡 Moderate | DevOps   | `docker system prune -f` in Final Cleanup not guarded                                    |
| 18  | 🟡 Moderate | DevOps   | Docker base images (`node:24-bookworm-slim`, `nginx:1.25.4-alpine`) not pinned to digest |
| 19  | 🟡 Moderate | SEO      | Missing `noindex` for thin city/district hub pages                                       |
| 20  | 🟢 Minor    | API      | `console.log` in `DatabaseFactory` should use Pino logger                                |
| 21  | 🟢 Minor    | All      | Pin runtime dependencies to exact versions                                               |
| 22  | 🟢 Minor    | CI       | `DL3008` still globally ignored in `.hadolint.yaml`                                      |
| 23  | 🟢 Minor    | SEO      | `siteConfig.social` has empty Instagram/Facebook fields                                  |
| 24  | 🟢 Minor    | API      | `tsc-alias` dev dependency unused in `@vcard/api`                                        |
