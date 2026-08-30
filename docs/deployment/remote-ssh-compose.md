# Remote SSH deployment

This is a repeatable SSH/Docker Compose path for a separate Linux host. It
does not install packages, run `sudo`, alter macOS/Colima targets, or use the
demo server. Nginx remains a manual fallback.

## Operator inputs

Only these variables are used:

```sh
export DEPLOY_HOST=host.example
export DEPLOY_USER=deploy
export DEPLOY_PATH=/srv/defguard
export SSH_KEY=$HOME/.ssh/defguard
```

The host must already have Docker Engine, Compose v2, WireGuard kernel or
userspace support, required ports, registry access, and Docker permissions.

Dev uses `config/deployment.dev.env.example`, direct Compose ports, and no
Caddy/ACME. Production uses the `caddy` profile and requires both
`CORE_HOST` and `EDGE_HOST`; DNS, public ports, ACME, backups, firewall policy,
and the WireGuard public endpoint remain operator-owned prerequisites.

The first DefGuard setup wizard remains manual: create the admin user, internal
and public URLs, VPN public endpoint, and client enrollment in the UI.

## Releases and operations

Each release contains exact superproject and `vendor/defguard-deployment` SHAs
under `releases/<commit>`. `current` moves only after Compose config, pull,
startup, and bounded readiness checks. Persistent data is below `volumes/`;
`shared/runtime.env` is mode `0600` and is never archived.

Use the `remote-*` Make targets for preflight, deploy, status, bounded logs,
backup, recovery, and rollback. Recovery/rollback never use `down -v` or delete
volumes/backups. Restore drills must use a separate Compose namespace/volumes.

Commands report `PASS`, `BLOCKED`, `FAIL`, or `NOT VERIFIED`. HTTP 200, running
containers, a UDP listener, or counters do not prove a real WireGuard handshake.
Production is not accepted without an enrolled real WireGuard client, matching
peer, non-zero latest handshake, RX/TX movement, and VPN test-resource access.
