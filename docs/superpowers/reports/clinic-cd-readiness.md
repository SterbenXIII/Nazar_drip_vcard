# Clinic staging CI/CD readiness

Date: 2026-10-25
Plan: [CI repair and clinic staging CD](../plans/2026-10-25-ci-repair-clinic-cd.md)
Spec: [CI/CD design](../specs/2026-10-25-ci-repair-clinic-cd.md)

## Decision

**Task 8 evidence is collected; Task 9 is BLOCKED.** The disposable lab and local
checks passed, but there is no reviewed release candidate commit. `HEAD`
`ce9344bf60aa4c7c5d032847848c7a59a22f4261` is the base revision; implementation
changes remain uncommitted. Do not use that base SHA as the candidate release.

No GitHub workflow, VPS, public DNS, or live deployment was changed or invoked.
The lab used synthetic commits `6106d91562311e0f6d6d5d5b3e201f4bbc84c705`
and `a9bfcbeb40970a3eba8d859d1bb769f1b17e266a`; they exist only in its temporary
local Git remote and are not release candidates.

## Verification matrix

| Check                                                                        | Status       | Evidence                                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actionlint` on CI, clinic, legacy, deploy, and rollback workflows           | PASS         | Containerized `rhysd/actionlint:latest` completed with exit 0.                                                                                                                        |
| Ansible syntax                                                               | PASS         | `ansible-playbook ... playbook.yml --syntax-check`.                                                                                                                                   |
| Docker Compose configuration                                                 | PASS         | Production and proxy Compose files passed `config --quiet`.                                                                                                                           |
| Audit parser tests                                                           | PASS         | 8/8 tests.                                                                                                                                                                            |
| API tests                                                                    | PASS         | 38/38 tests across 10 files.                                                                                                                                                          |
| Clinic Astro, ESLint, Stylelint, and package Prettier checks                 | PASS         | `pnpm --filter @vcard/clinic-web check`; 0 Astro diagnostics.                                                                                                                         |
| Clinic publication matrix                                                    | PASS         | 1/1 Playwright test.                                                                                                                                                                  |
| TypeScript workspace check                                                   | PASS         | `pnpm typecheck`.                                                                                                                                                                     |
| DNS parser tests                                                             | PASS         | 6/6 Python unit tests.                                                                                                                                                                |
| Clinic CI, staging smoke, deployment, monitoring, and release-head contracts | PASS         | Six shell contract scripts completed successfully.                                                                                                                                    |
| Current-tree secret scan                                                     | PASS         | `make secret-scan`; no leaks found.                                                                                                                                                   |
| Codex Security diff scan                                                     | PASS         | Completed scan `fe830d50-795b-4f1c-a3d5-4777040cfdc7`; 26 changed-file inventory items reviewed, 0 reportable findings. Live systems were excluded.                                   |
| Ubuntu 26.04 disposable rehearsal                                            | PASS         | Fresh VM, Docker bootstrap, two image builds, first deploy, same-SHA repeat, update, stale-SHA rejection, backup gates/integrity, reconciliation gate, and manual rollback completed. |
| Root `pnpm lint`                                                             | FAIL         | Repository-wide ESLint reaches 218 existing issues, including `.worktrees/clinic-vps-http-deployment` and unrelated clinic scripts.                                                   |
| Root `pnpm format:check`                                                     | FAIL         | Reports pre-existing/generated and unrelated files; changed readiness, plan, and Ansible README are checked separately.                                                               |
| Root `pnpm mdlint`                                                           | FAIL         | 136 existing issues in 46 files, including `.worktrees`, generated graph reports, and unrelated docs.                                                                                 |
| Full-history secret scan                                                     | BLOCKED      | Prior redacted scan recorded four historical findings. Rotate/revoke exposed credentials and keys before Task 9; no history rewrite or baseline was made.                             |
| Candidate commit SHA                                                         | BLOCKED      | Changes are uncommitted; current `HEAD` is the base revision.                                                                                                                         |
| Live GitHub, DNS, VPS, public TLS, Telegram, deploy, and rollback checks     | NOT VERIFIED | No live systems or credentials were used in this task.                                                                                                                                |

### Ubuntu 26.04 lab details

Log: `/var/folders/px/lglfl_hn4zx5gqrzfzs2x4rh0000gn/T/clinic-cd-ubuntu2604-20261025T163647Z.log`.

- A clean Ubuntu 26.04 VM started without Docker. Ansible installed Docker Engine
  29.9.2 and Docker Compose 5.6.1.
- First deploy and update passed the HTTPS smoke checks for `localhost` and
  `www.localhost`: valid Basic Auth returned 200, missing/invalid credentials
  returned 401, HTTP redirected with 308, lead POST returned 403 over HTTP and
  HTTPS, robots policy remained enabled, and API health returned 200.
- Repeating the same SHA preserved container IDs, the named SQLite volume, and a
  synthetic control row. Submitting a stale SHA left checkout and containers
  unchanged.
- Missing candidate image and inaccessible backup directory both blocked before
  service recreation. The SQLite snapshot passed `integrity_check` and retained
  the control row.
- A simulated interruption after Compose recreation left the reconciliation
  marker and did not automatically roll back. Manual rollback restored the
  previous image pair and preserved the same volume and control row.
- The API runtime UID (1000) could read the protected allowlist and write its
  SQLite volume. The lab VM was deleted on completion.
- Security review found no reportable vulnerabilities. The `lab_mode` guard
  checks the localhost domain, lab path, and local image tags, but does not
  itself require Ansible's local connection. The rehearsal inventory uses
  `ansible_connection=local`; never set `lab_mode=true` for a VPS deployment.

## Required before Task 9

1. Produce and review a commit on the intended deployment branch. Use that exact
   commit SHA as the candidate; do not use either synthetic lab SHA.
2. Rotate/revoke credentials and keys represented by the four historical secret
   findings. Decide separately whether history rewriting is authorized.
3. Verify the production GitHub environment, required secrets/variables,
   environment protections, branch protections, and pinned SSH host key.
4. Verify live A and AAAA routing for both `havenhub.tech` and `www.havenhub.tech`,
   inbound 80/443 reachability, Caddy public certificate issuance, Basic Auth,
   noindex policy, API health, lead POST 403, and that port 5678 is not public.
5. Confirm VPS provider backup status and the runtime Telegram allowlist. The
   provider schedule shown earlier was weekly; add and verify a separate daily
   SQLite backup before enabling real lead collection.
6. Follow one trusted `CI → GHCR → Ansible → smoke checks` run by run ID and exact
   commit SHA. Do not treat this local rehearsal as live deployment proof.

## Rollback boundary

The lab verified a manual image rollback against a compatible SQLite schema. API
migrations are forward-only, so an older image is not safe merely because it is
available. If live deployment leaves `releases/reconciliation-required.json`,
stop further deploys and rollbacks, compare checkout/images/manifest/database
with the recorded verified backup, and recover only from that evidence. Automatic
rollback remains disabled. Live rollback remains **NOT VERIFIED** until a prior
live release exists.
