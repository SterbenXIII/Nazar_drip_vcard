#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
REMOTE="$ROOT_DIR/scripts/remote.sh"
LIB="$ROOT_DIR/scripts/lib/remote.sh"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_file() {
  [[ -f "$ROOT_DIR/$1" ]] || fail "missing $1"
}

assert_contains() {
  local file=$1
  local pattern=$2
  rg -q --fixed-strings "$pattern" "$ROOT_DIR/$file" || fail "$file lacks: $pattern"
}

assert_not_contains() {
  local file=$1
  local pattern=$2
  ! rg -q --fixed-strings "$pattern" "$ROOT_DIR/$file" || fail "$file contains forbidden: $pattern"
}

for file in \
  config/deployment.dev.env.example \
  config/deployment.prod.env.example \
  compose/docker-compose.persistence.yaml \
  scripts/remote.sh \
  scripts/lib/remote.sh \
  docs/deployment/remote-ssh-compose.md; do
  assert_file "$file"
done

assert_file tests/run.sh
assert_contains tests/run.sh "test_remote_deployment.sh"

assert_contains config/deployment.dev.env.example "ENVIRONMENT=dev"
assert_contains config/deployment.dev.env.example "TLS_MODE=off"
assert_contains config/deployment.prod.env.example "ENVIRONMENT=prod"
assert_contains config/deployment.prod.env.example "CORE_HOST="
assert_contains config/deployment.prod.env.example "EDGE_HOST="
assert_contains config/deployment.prod.env.example "TLS_MODE=acme"
assert_contains compose/docker-compose.persistence.yaml '!override'
assert_contains compose/docker-compose.persistence.yaml '${VOLUME_DIR}/db'
assert_contains compose/docker-compose.persistence.yaml '${VOLUME_DIR}/caddy/data'
assert_contains compose/docker-compose.caddy.yaml 'profiles: [caddy]'
assert_contains compose/docker-compose.caddy.yaml 'ports: !override []'
assert_contains compose/Caddyfile 'reverse_proxy core:8000'
assert_contains compose/Caddyfile 'reverse_proxy edge:8080'

assert_contains scripts/remote.sh 'DEPLOY_HOST'
assert_contains scripts/remote.sh 'DEPLOY_USER'
assert_contains scripts/remote.sh 'DEPLOY_PATH'
assert_contains scripts/remote.sh 'SSH_KEY'
assert_contains scripts/remote.sh 'git rev-parse HEAD'
assert_contains scripts/remote.sh 'git -C vendor/defguard-deployment rev-parse HEAD'
assert_contains scripts/remote.sh 'down -v'
assert_not_contains scripts/remote.sh 'sudo '
assert_not_contains scripts/remote.sh 'docker compose down -v'
assert_contains scripts/lib/remote.sh 'openssl rand'
assert_contains scripts/lib/remote.sh '0600'
assert_contains scripts/lib/remote.sh 'NOT VERIFIED'
assert_contains docs/deployment/remote-ssh-compose.md 'real WireGuard client'
assert_contains scripts/remote.sh 'pg_dump'
assert_contains scripts/remote.sh 'redact_stream'
assert_contains scripts/remote.sh 'current'
assert_contains scripts/remote.sh 'restore_project'
assert_contains scripts/remote.sh 'VOLUME_DIR='

preflight_output=$(mktemp "$ROOT_DIR/.remote-preflight.XXXXXX")
trap 'rm -f "$preflight_output"' EXIT
if "$REMOTE" preflight dev >"$preflight_output" 2>&1; then
  fail 'preflight without SSH variables unexpectedly passed'
fi
rg -q 'BLOCKED' "$preflight_output" || fail 'missing BLOCKED verdict'

ssh_key=$(mktemp "$ROOT_DIR/.remote-key.XXXXXX")
trap 'rm -f "$preflight_output" "$ssh_key"' EXIT
if DEPLOY_HOST=example.invalid DEPLOY_USER=deploy DEPLOY_PATH=/srv/defguard SSH_KEY="$ssh_key" \
  "$REMOTE" preflight prod >"$preflight_output" 2>&1; then
  fail 'production preflight without hostnames unexpectedly passed'
fi
rg -q 'CORE_HOST and EDGE_HOST' "$preflight_output" || fail 'missing production hostname block'

CORE_HOST=core.example.test EDGE_HOST=edge.example.test bash -c "source '$LIB'; require_prod_hosts"

echo 'PASS: remote deployment contract'
