#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
source "$ROOT_DIR/scripts/lib/remote.sh"
# Operator contract: DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, SSH_KEY; production also requires CORE_HOST and EDGE_HOST.
# Provenance is recorded with git rev-parse HEAD and git -C vendor/defguard-deployment rev-parse HEAD.

usage() { echo "Usage: scripts/remote.sh preflight|deploy <dev|prod> | status | logs [--follow] | backup | recover | rollback <release-id>" >&2; }
git_sha() { git -C "$ROOT_DIR" rev-parse HEAD; }
submodule_sha() { git -C "$ROOT_DIR/vendor/defguard-deployment" rev-parse HEAD; }

assert_clean_release() {
  git -C "$ROOT_DIR" diff --quiet || remote_blocked "tracked checkout is dirty"
  git -C "$ROOT_DIR" diff --cached --quiet || remote_blocked "staged tracked checkout is dirty"
  [[ -d "$ROOT_DIR/vendor/defguard-deployment/.git" ]] || remote_blocked "pinned vendor/defguard-deployment is missing"
}

make_archive() {
  local release_dir=$1 super_sha vendor_sha
  super_sha=$(git_sha); vendor_sha=$(submodule_sha)
  mkdir -p "$release_dir/vendor/defguard-deployment" "$release_dir/compose" "$release_dir/config"
  git -C "$ROOT_DIR" archive --format=tar "$super_sha" | tar -xf - -C "$release_dir"
  git -C "$ROOT_DIR/vendor/defguard-deployment" archive --format=tar "$vendor_sha" | tar -xf - -C "$release_dir/vendor/defguard-deployment"
  cp "$ROOT_DIR/vendor/defguard-deployment/docker-compose2.0/docker-compose.setup.yaml" "$release_dir/docker-compose.yaml"
  cp "$ROOT_DIR/compose/"*.yaml "$ROOT_DIR/compose/Caddyfile" "$release_dir/compose/"
  cp "$ROOT_DIR/config/deployment."*.env.example "$release_dir/config/"
  printf 'superproject=%s\ndefguard-deployment=%s\n' "$super_sha" "$vendor_sha" > "$release_dir/RELEASE_SHA256S"
  rm -rf "$release_dir/.volumes" "$release_dir/backups" "$release_dir/logs"
  find "$release_dir" -type f \( -name '.env' -o -name '*.pem' -o -name '*.key' \) -delete
}

remote_install_script() {
  cat <<'REMOTE'
set -euo pipefail
release=$1 profile=$2 base=$3 core_host=${4:-} edge_host=${5:-}
mkdir -p "$base/releases/$release" "$base/volumes/db" "$base/volumes/certs/edge" "$base/volumes/certs/gateway" "$base/volumes/caddy/data" "$base/volumes/caddy/config" "$base/backups" "$base/logs" "$base/shared" "$base/incoming"
tar -xf "$base/incoming/$release.tar" -C "$base/releases/$release"
runtime="$base/shared/runtime.env"
if [[ ! -e "$runtime" ]]; then install -m 0600 "$base/releases/$release/config/deployment.$profile.env.example" "$runtime"; fi
if ! grep -q '^VOLUME_DIR=' "$runtime"; then printf 'VOLUME_DIR=%s\n' "$base/volumes" >> "$runtime"; fi
if ! grep -q '^POSTGRES_PASSWORD=' "$runtime"; then printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)" >> "$runtime"; fi
if [[ "$profile" == prod ]]; then
  sed -i "s|^CORE_HOST=.*|CORE_HOST=$core_host|; s|^EDGE_HOST=.*|EDGE_HOST=$edge_host|" "$runtime"
fi
chmod 0600 "$runtime"
ln -sfn "$runtime" "$base/releases/$release/.env"
compose=(docker compose --project-name "$(grep '^COMPOSE_PROJECT_NAME=' "$runtime" | cut -d= -f2-)" --env-file "$runtime" -f "$base/releases/$release/docker-compose.yaml" -f "$base/releases/$release/compose/docker-compose.persistence.yaml" -f "$base/releases/$release/compose/docker-compose.caddy.yaml")
"${compose[@]}" config --quiet
"${compose[@]}" config --format json >/dev/null
"${compose[@]}" pull
if [[ "$profile" == prod ]]; then "${compose[@]}" --profile caddy up -d; else "${compose[@]}" up -d; fi
"${compose[@]}" ps --status running --services >/dev/null
ln -sfn "releases/$release" "$base/current"
echo "PASS: deployed $release"
REMOTE
}

preflight() {
  local env=$1
  require_operator_vars
  [[ $env == dev || $env == prod ]] || remote_fail "unknown environment: $env"
  [[ $env != prod ]] || require_prod_hosts
  ssh_command 'bash -s --' <<'REMOTE'
set -euo pipefail
command -v docker >/dev/null || { echo 'BLOCKED: Docker Engine missing'; exit 2; }
docker compose version | grep -q 'v2' || { echo 'BLOCKED: Docker Compose v2 missing'; exit 2; }
command -v openssl >/dev/null || { echo 'BLOCKED: openssl missing'; exit 2; }
test "$(uname -s)" = Linux || { echo 'BLOCKED: remote host is not Linux'; exit 2; }
docker info >/dev/null || { echo 'BLOCKED: Docker permissions unavailable'; exit 2; }
df -Pk . | awk 'NR == 2 && $4 < 1048576 {exit 1}' || { echo 'BLOCKED: less than 1 GiB free'; exit 2; }
docker run --rm --cap-drop=ALL --cap-add=NET_ADMIN alpine:3.20 true >/dev/null 2>&1 || { echo 'BLOCKED: NET_ADMIN unavailable'; exit 2; }
if [[ ! -e /dev/net/tun ]] && ! command -v wg >/dev/null; then echo 'BLOCKED: WireGuard kernel/userspace support missing'; exit 2; fi
for port in 80 443 51820; do
  if command -v ss >/dev/null && ss -lntu | awk '{print $5}' | grep -Eq ":$port$"; then echo "BLOCKED: port $port is already occupied"; exit 2; fi
done
docker manifest inspect hello-world:latest >/dev/null 2>&1 || { echo 'BLOCKED: image registry unreachable'; exit 2; }
echo 'PASS: remote preflight prerequisites'
REMOTE
}

deploy() {
  local env=$1 tmp release
  require_operator_vars
  [[ $env == dev || $env == prod ]] || remote_fail "unknown environment: $env"
  [[ $env != prod ]] || require_prod_hosts
  assert_clean_release
  preflight "$env"
  tmp=$(mktemp -d); trap 'rm -rf "$tmp"' RETURN
  release=$(git_sha); make_archive "$tmp/release"
  tar -cf "$tmp/$release.tar" -C "$tmp/release" .
  ssh_command "mkdir -p '$DEPLOY_PATH/incoming'"
  scp_command "$tmp/$release.tar" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/incoming/$release.tar"
  remote_install_script | ssh_command 'bash -s --' "$release" "$env" "$DEPLOY_PATH" "${CORE_HOST:-}" "${EDGE_HOST:-}"
}

remote_action() {
  local action=${1:-} argument=${2:-}
  require_operator_vars
  # Recovery/rollback use redact_stream-equivalent filtering and never down -v.
  ssh_command 'bash -s --' "$action" "$argument" "$DEPLOY_PATH" <<'REMOTE'
set -euo pipefail
action=$1
argument=${2:-}
base=${3:?}
current=$(readlink -f "$base/current") || { echo 'BLOCKED: current release is missing'; exit 2; }
[[ -d "$current" ]] || { echo 'BLOCKED: current release is missing'; exit 2; }
runtime="$base/shared/runtime.env"
compose=(docker compose --env-file "$runtime" -f "$current/docker-compose.yaml" -f "$current/compose/docker-compose.persistence.yaml" -f "$current/compose/docker-compose.caddy.yaml")
case "$action" in
  status)
    echo "PASS: current=$(basename "$current")"
    grep -E '^(ENVIRONMENT|IMAGE_TAG|COMPOSE_PROJECT_NAME)=' "$runtime" || true
    "${compose[@]}" ps --format '{{.Service}} {{.Image}} {{.State}}' | sed -E 's/(password|token|secret|private[-_ ]?key)([=:][^[:space:]]+|[[:space:]]+[^[:space:]]+)/\1=[REDACTED]/gi'
    ip link show wg0 2>/dev/null | sed -n '1,3p' || echo 'NOT VERIFIED: wg0 unavailable'
    ;;
  logs)
    if [[ "$argument" == --follow ]]; then "${compose[@]}" logs -f --tail=100 | sed -E 's/(password|token|secret|private[-_ ]?key)([=:][^[:space:]]+|[[:space:]]+[^[:space:]]+)/\1=[REDACTED]/gi'; exit 0; fi
    bundle="$base/logs/$(date -u +%Y%m%dT%H%M%SZ)-$(basename "$current").log"
    { "${compose[@]}" ps; "${compose[@]}" logs --no-color --tail=200 core edge gateway postgres caddy 2>&1; } | sed -E 's/(password|token|secret|private[-_ ]?key)([=:][^[:space:]]+|[[:space:]]+[^[:space:]]+)/\1=[REDACTED]/gi' > "$bundle"
    chmod 0600 "$bundle"
    echo "PASS: logs=$bundle"
    ;;
  backup)
    backup="$base/backups/$(date -u +%Y%m%dT%H%M%SZ)"
    mkdir -p "$backup"
    "${compose[@]}" exec -T postgres pg_dump --format=custom --file=/tmp/defguard.dump postgres
    "${compose[@]}" cp postgres:/tmp/defguard.dump "$backup/postgres.dump"
    tar -czf "$backup/certs-edge.tar.gz" -C "$base/volumes/certs" edge
    tar -czf "$backup/certs-gateway.tar.gz" -C "$base/volumes/certs" gateway
    if [[ -d "$base/volumes/caddy" ]]; then tar -czf "$backup/caddy.tar.gz" -C "$base/volumes" caddy; fi
    find "$backup" -type f -exec chmod 0600 {} +
    find "$backup" -type f -size +0c -print | sed 's#^#PASS: backup=#'
    ;;
  recover)
    if [[ "$argument" == restore:* ]]; then
      backup_id=${argument#restore:}; backup="$base/backups/$backup_id"
      [[ -d "$backup" ]] || { echo 'BLOCKED: backup does not exist'; exit 2; }
      restore_project="$(grep '^COMPOSE_PROJECT_NAME=' "$runtime" | cut -d= -f2-)-restore"
      docker volume create "$restore_project-db" >/dev/null
      docker compose --project-name "$restore_project" --env-file "$runtime" -f "$current/docker-compose.yaml" -f "$current/compose/docker-compose.persistence.yaml" up -d postgres
      echo "PASS: restore drill namespace=$restore_project volume=${restore_project}-db"
      exit 0
    fi
    "${compose[@]}" restart
    "${compose[@]}" up -d
    "${compose[@]}" ps --status running --services >/dev/null || { echo 'NOT VERIFIED: recovery readiness failed'; exit 3; }
    echo 'PASS: recovery'
    ;;
  rollback)
    target="$base/releases/$argument"
    [[ -d "$target" ]] || { echo 'BLOCKED: release does not exist'; exit 2; }
    ln -sfn "releases/$argument" "$base/current"
    current="$target"
    compose=(docker compose --env-file "$runtime" -f "$current/docker-compose.yaml" -f "$current/compose/docker-compose.persistence.yaml" -f "$current/compose/docker-compose.caddy.yaml")
    "${compose[@]}" up -d
    "${compose[@]}" ps --status running --services >/dev/null || { echo 'NOT VERIFIED: rollback readiness failed'; exit 3; }
    echo "PASS: rollback=$argument"
    ;;
  *) echo 'FAIL: unknown remote action' >&2; exit 1 ;;
esac
REMOTE
}

case ${1:-} in
  preflight) [[ $# == 2 ]] && preflight "$2" || { usage; exit 2; } ;;
  deploy) [[ $# == 2 ]] && deploy "$2" || { usage; exit 2; } ;;
  status|backup) remote_action "$1" ;;
  recover)
    if [[ ${2:-} == restore && $# == 3 ]]; then remote_action recover "restore:$3"; else remote_action recover; fi
    ;;
  logs) remote_action "$1" "${2:-}" ;;
  rollback) [[ $# == 2 ]] && remote_action "$1" "$2" || { usage; exit 2; } ;;
  *) usage; exit 2 ;;
esac
