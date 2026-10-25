# Clinic staging CI/CD readiness

Date: 2026-10-25
Plan: [CI repair and clinic staging CD](../plans/2026-10-25-ci-repair-clinic-cd.md)
Spec: [CI/CD design](../specs/2026-10-25-ci-repair-clinic-cd.md)

## Decision

**Task 9 staging deployment and smoke checks passed** for
`abb4878c023c7f61eeeebeee579acf35f46cd569`. This verifies the staging path, not
readiness for collecting real leads or a public production release. Historical
credential/key rotation remains unverified; the provider backup schedule is
weekly, and the required daily SQLite backup and live rollback remain unverified.

The release was triggered by merged PR #7. CI run
[40223729739](https://github.com/SterbenXIII/Nazar_drip_vcard/actions/runs/40223729739)
and deploy run
[40223918442](https://github.com/SterbenXIII/Nazar_drip_vcard/actions/runs/40223918442)
completed successfully. The earlier run for `15dd3aa60d2e0c83e63452d3ea780c16f47e1982`
failed before Ansible; it did not change the VPS.

## Verification matrix

| Check                                                                        | Status       | Evidence                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actionlint` on CI, clinic, legacy, deploy, and rollback workflows           | PASS         | Containerized `rhysd/actionlint:latest` completed with exit 0.                                                                                                                                           |
| Ansible syntax                                                               | PASS         | `ansible-playbook ... playbook.yml --syntax-check`.                                                                                                                                                      |
| Docker Compose configuration                                                 | PASS         | Production and proxy Compose files passed `config --quiet`.                                                                                                                                              |
| Audit parser tests                                                           | PASS         | 8/8 tests.                                                                                                                                                                                               |
| API tests                                                                    | PASS         | 38/38 tests across 10 files.                                                                                                                                                                             |
| Clinic Astro, ESLint, Stylelint, and package Prettier checks                 | PASS         | `pnpm --filter @vcard/clinic-web check`; 0 Astro diagnostics.                                                                                                                                            |
| Clinic publication matrix                                                    | PASS         | 1/1 Playwright test.                                                                                                                                                                                     |
| TypeScript workspace check                                                   | PASS         | `pnpm typecheck`.                                                                                                                                                                                        |
| DNS parser tests                                                             | PASS         | 6/6 Python unit tests.                                                                                                                                                                                   |
| Clinic CI, staging smoke, deployment, monitoring, and release-head contracts | PASS         | Six shell contract scripts completed successfully.                                                                                                                                                       |
| Current-tree secret scan                                                     | PASS         | `make secret-scan`; no leaks found.                                                                                                                                                                      |
| Codex Security diff scan                                                     | PASS         | Completed scan `fe830d50-795b-4f1c-a3d5-4777040cfdc7`; 26 changed-file inventory items reviewed, 0 reportable findings. Live systems were excluded.                                                      |
| Ubuntu 26.04 disposable rehearsal                                            | PASS         | Fresh VM, Docker bootstrap, two image builds, first deploy, same-SHA repeat, update, stale-SHA rejection, backup gates/integrity, reconciliation gate, and manual rollback completed.                    |
| CI and GHCR release for `abb4878c023c7f61eeeebeee579acf35f46cd569`           | PASS         | CI run `40223729739`; API digest `sha256:e19a3f36998ddecc822689e4b0c4aef0b221f8f5d17da8d1913128a886241e1b`; clinic-web digest `sha256:f3fb62289eee1c40faf38a89ec201f3372e25a1ced982f68d46d8fd6a5d7ceee`. |
| Live SSH, DNS, and VPS resource preflight                                    | PASS         | Deploy run `40223918442`; trusted VPS host-key fingerprint matched; DNS and VPS resource gates passed.                                                                                                   |
| Ansible staging deploy                                                       | PASS         | Deploy run `40223918442`, exact release SHA above.                                                                                                                                                       |
| Apex and www HTTPS smoke checks                                              | PASS         | Both hosts returned 200 with valid Basic Auth, 401 without/with invalid credentials, 308 HTTP redirect, 403 lead POST over HTTP/HTTPS, and staging robots metadata.                                      |
| Root `pnpm lint`                                                             | FAIL         | Repository-wide ESLint reaches 218 existing issues, including `.worktrees/clinic-vps-http-deployment` and unrelated clinic scripts.                                                                      |
| Root `pnpm format:check`                                                     | FAIL         | Reports pre-existing/generated and unrelated files; changed readiness, plan, and Ansible README are checked separately.                                                                                  |
| Root `pnpm mdlint`                                                           | FAIL         | 136 existing issues in 46 files, including `.worktrees`, generated graph reports, and unrelated docs.                                                                                                    |
| Full-history secret scan                                                     | BLOCKED      | Prior redacted scan recorded four historical findings. Rotation/revocation is not verified; no history rewrite or baseline was made.                                                                     |
| Live external reachability of API port 5678                                  | NOT VERIFIED | A bounded TCP probe from this host timed out; this does not establish whether the VPS firewall or another network path filtered it.                                                                      |
| Live rollback                                                                | NOT VERIFIED | This is the first live release; there is no prior live release to restore.                                                                                                                               |

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

## Remaining gates before enabling real lead collection or a public release

1. Rotate/revoke credentials and keys represented by the four historical secret
   findings. Decide separately whether history rewriting is authorized.
2. Confirm the runtime Telegram allowlist and verify that external connections to
   port `5678` are blocked.
3. Add and verify a separate daily SQLite backup and restore before enabling real
   lead collection; the provider schedule shown earlier is weekly.
4. Perform a live rollback only after a prior live release exists, following the
   documented schema and backup checks. Automatic rollback remains disabled.

## Rollback boundary

The lab verified a manual image rollback against a compatible SQLite schema. API
migrations are forward-only, so an older image is not safe merely because it is
available. If live deployment leaves `releases/reconciliation-required.json`,
stop further deploys and rollbacks, compare checkout/images/manifest/database
with the recorded verified backup, and recover only from that evidence. Automatic
rollback remains disabled. Live rollback remains **NOT VERIFIED** until a prior
live release exists.
