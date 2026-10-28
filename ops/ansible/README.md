# HAVENHUB deployment

The production deployment uses GitHub Actions, Ansible, Docker Compose, and Caddy on the
existing Hostinger VPS. Do not deploy by changing the VPS checkout manually.

## Environments

- After CI succeeds on `main`, `deploy.yml` builds immutable API, staging-web, and
  production-web images, then deploys only staging.
- Staging runs in its own Compose project with `compose-staging_api_data`, a private
  Docker network, and Mailpit. It has no production Telegram or SMTP credentials and
  publishes no API or Mailpit ports.
- Staging is available at `https://staging.havenhub.com.ua` behind HTTP Basic Auth.
  It sends `noindex,nofollow`, disallows crawling in `robots.txt`, and has no sitemap
  or canonical URL.
- Production promotion is a manual `promote-production.yml` run for the full SHA that
  passed CI and staging. It promotes the exact API and production-web digests recorded
  by staging; production uses the existing `compose_api_data` SQLite volume.
- `https://havenhub.com.ua` is the canonical production host. `www`, HTTP, and the old
  `havenhub.tech` hosts redirect to it. Staging stays protected after promotion.

## DNS

DNS is managed at NIC.UA. Checks on 2026-10-28 show `@` and `www` point to
`72.61.138.53`; MX points to `mail.havenhub.com.ua`, and `mail` points to
`135.181.41.169`. Do not change nameservers, `@`, `www`, MX, `mail`, SPF, DKIM, DMARC,
or other mail records as part of this migration.

Before the first staging activation, add this single record at NIC.UA:

| Type | Name      | Value          |
| ---- | --------- | -------------- |
| A    | `staging` | `72.61.138.53` |

The staging workflow and Ansible both verify that the hostname resolves only to the VPS.
They do not write DNS. Production promotion separately checks the existing apex and
`www` records before changing Caddy.

## GitHub settings

Set repository variable `VPS_IP` to the VPS IPv4 address. `DEPLOY_PATH` is optional and
defaults to `/home/emerald-recovery`.

Provide `HOSTINGER_SSH_KEY`, `HOSTINGER_SSH_USER`, and
`HOSTINGER_SSH_KNOWN_HOSTS` to the `staging` and `production` environments. Set
`STAGE_BASIC_AUTH_PASSWORD` in both environments to the same password (at least 16
characters) so promotion can verify staging without changing its credentials. Keep
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_MASTER_ID`, `TELEGRAM_ALLOWED_CHAT_IDS`, and optional
`TELEGRAM_NOTIFY_IDS` and `WEBHOOK_SECRET` in `production` only. GitHub provides
`GITHUB_TOKEN`; no separate token secret is needed.

Actions derives the Basic Auth hash. The plaintext password is used for protected smoke
checks and is not written to the VPS. Ansible writes the production Telegram allowlist
with mode `0600` and `no_log: true`.

## Release safety and rollback

Staging writes manifests under `releases/staging/` only. Production promotion writes
`releases/<sha>.json` and atomically updates `releases/current.json` only after public
health checks pass. Production manifests use the `havenhub-production-v1` contract;
rollback rejects legacy staging-only manifests.

Before replacing the production API, Ansible validates the current release, takes a
SQLite backup with the SQLite backup API, checks its integrity, and records a
reconciliation marker. The production API port `5678` is not published. The existing
web container remains running while the new production web image is checked. A failed
cutover restores the saved Caddy configuration; automatic API rollback is disabled
because forward-only database migrations may make an older API incompatible.

The first production promotion still requires the existing `releases/current.json` and
exactly one Compose `api_data` volume when production data exists. The backup task accepts
the legacy five-field release manifest. If the manifest is missing or the volume and
manifest do not agree, deployment stops before changing services; do not bypass that
gate or recreate the database volume. Confirm the VPS state and resolve the discrepancy
before promotion.

The rollback workflow can select an earlier successful `havenhub-production-v1`
release after a newer one has been promoted. During staging-only deployment, the old
`havenhub.tech` route stays behind Basic Auth. Successful production promotion changes
that host to a redirect to the new apex. If health checks fail during the first promotion,
the same Ansible run restores the saved pre-cutover Caddy route and leaves the existing
web container available. After a successful first promotion there is no earlier
`havenhub-production-v1` release for the rollback workflow to select; the saved Caddy
configuration and old web container remain available for a manual first-release recovery.
The Caddy recovery does not restore the API image or roll back SQLite.

If `releases/reconciliation-required.json` remains after a failed production deploy,
stop further deploys and rollbacks. Compare the marker, running image revisions,
checkout, SQLite snapshot, and current manifest before reconciling state. Never delete
the marker or database volume as a shortcut.

## Local checks

Install the required Ansible collection with `ansible-galaxy collection install -r
ops/ansible/requirements.yml`. Run `ansible-playbook --syntax-check` against both
`ops/ansible/playbook.yml` and `ops/ansible/staging-playbook.yml` before release.
`tests/deployment/ubuntu2604_lab.sh` exercises the existing production deploy and
rollback flow in a disposable local VM; it does not verify public DNS, HTTPS, or the
Hostinger VPS.
