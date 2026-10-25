# Clinic staging CI/CD specification

## Outcome

The first live staging release serves `apps/clinic-web` and `apps/api` through Caddy at
`havenhub.tech` and `www.havenhub.tech`. A green, authoritative CI on `main` automatically
starts CD. Each release runs the exact source revision and container images that passed its
checks. A failed release gate or superseded candidate cannot change running services;
bootstrap may install missing prerequisites before service creation.

## Scope and fixed decisions

- Deploy API, clinic-web and Caddy only. Telegram is the notification channel. Keep `apps/web`,
  n8n and PostgreSQL outside this release; give legacy web a separate, non-gating CI workflow.
- The GitHub Environment remains named `production`, while clinic-web is built in `staging`
  mode. Keep `noindex,nofollow`, Basic Auth user `stage` and HTTPS on both hosts.
- `POST /api/leads/submit` must return `403` before reaching the API on HTTP and authenticated
  HTTPS. No live lead submissions in this release. Keep the API private behind the proxy.
- Preserve the existing Compose project, SQLite named volume and protected
  `apps/api/allowed_chats.json` bind mount. Production needs a non-empty numeric
  `TELEGRAM_ALLOWED_CHAT_IDS`; write the file with mode `0600` and make it readable by the
  API runtime UID without exposing IDs.
- Use the existing repository variable names `VPS_IP` and `DEPLOY_PATH`, repository secret
  `HOSTINGER_SSH_KNOWN_HOSTS`, and `production` environment secrets already configured for
  SSH, Basic Auth and Telegram. Do not introduce a second secret transport.
- CD starts from successful `CI` on `main` for `push` or manual dispatch; PR and scheduled CI
  must never mutate the VPS. Rollback remains manual and uses a previous successful release.
- Active High/Critical package findings block release. One exact, time-limited exception is
  allowed only if its package cannot be reached at runtime and no upstream fix exists; malformed
  or unavailable audit data blocks release. Legacy-only findings are reported separately.
- The target is Ubuntu 26.04 LTS, current SSH account `root`, public IPv4 `72.61.138.53`,
  and the existing DNS names. Published AAAA records must resolve to the VPS before deployment.
- Preserve the user's original care-format pictures. Do not edit generated
  `apps/clinic-web/output/` or `.playwright-cli/` material.
- Never commit credentials, Telegram IDs, keys, certificates, database content or runtime
  configuration. No automatic rollback after a failed deploy: forward-only migrations may make
  the old API incompatible with the current database.

## Acceptance

1. CI tests only the active release and its deployment contracts, including a fail-closed
   security gate. Required jobs cannot be skipped while the release gate succeeds.
2. The published API and clinic images are the bytes exercised by CD smoke checks. Their
   immutable digests, OCI revisions, checked-out SHA and release manifest agree on the VPS.
3. A fresh Ubuntu 26.04 host bootstraps through Ansible. Runtime checks prove allowlist access,
   SQLite persistence and backup integrity without logging protected data.
4. Both public hosts present trusted TLS, Basic Auth, staging metadata, a healthy API and
   blocked lead submissions. Operational Telegram notification follows successful smoke checks.
5. Manual rollback is rehearsed with synthetic data on an isolated host. The first live release
   records enough evidence for a later rollback, but no live rollback is claimed until a previous
   successful live release exists. A failure after service recreation requires operator
   reconciliation before another deployment.

## Evidence baseline (2026-10-25)

- The [latest main push CI](https://github.com/SterbenXIII/Nazar_drip_vcard/actions/runs/40122270264)
  failed at audit and Chromium installation; its
  [CD run](https://github.com/SterbenXIII/Nazar_drip_vcard/actions/runs/40122300136)
  was skipped. Live deployment was not observed.
- The existing `CI` tests `apps/web`; clinic CI is separately scoped. Current deployment
  contracts pass narrow textual tests but do not prove VPS runtime behavior.
- The unpatched `http-cache-semantics` advisory is
  [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp), affecting
  versions `<= 4.2.0`. Any exception still requires a fresh runtime reachability proof.

## Operational boundary

Implement and verify locally first. Before the first external deployment, validate the actual
SSH host fingerprint, DNS A/AAAA ownership, VPS access, ports 80/443, backup availability and
the current protected secret values without printing them. Historical exposed credentials and
keys identified in `AGENTS.md` must be revoked or rotated before public launch; history rewriting
is a separate decision. A local test or documentation check
does not count as live readiness. Commit, push, DNS changes and VPS mutation are separate
execution actions, not part of approving this document.
