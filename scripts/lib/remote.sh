#!/usr/bin/env bash
set -euo pipefail

REMOTE_TIMEOUT=${REMOTE_TIMEOUT:-15}

remote_blocked() { echo "BLOCKED: $*" >&2; return 2; }
remote_fail() { echo "FAIL: $*" >&2; return 1; }

require_operator_vars() {
  local name
  for name in DEPLOY_HOST DEPLOY_USER DEPLOY_PATH SSH_KEY; do
    [[ -n ${!name:-} ]] || remote_blocked "$name is required"
  done
  [[ -f "$SSH_KEY" ]] || remote_blocked "SSH_KEY does not point to a file"
}

ssh_command() {
  ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout="$REMOTE_TIMEOUT" \
    -o ServerAliveInterval=5 -o ServerAliveCountMax=2 "$DEPLOY_USER@$DEPLOY_HOST" "$@"
}

scp_command() {
  scp -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout="$REMOTE_TIMEOUT" "$@"
}

require_prod_hosts() {
  local core=${CORE_HOST:-} edge=${EDGE_HOST:-}
  [[ -n "$core" && -n "$edge" ]] || remote_blocked "CORE_HOST and EDGE_HOST are required for production"
}

redact_stream() {
  sed -E 's/(password|token|secret|private[-_ ]?key)([=:][^[:space:]]+|[[:space:]]+[^[:space:]]+)/\1=[REDACTED]/gi'
}

generate_remote_secret() {
  local runtime_env=$1
  if ! grep -q '^POSTGRES_PASSWORD=' "$runtime_env"; then
    printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)" >> "$runtime_env"
  fi
  chmod 0600 "$runtime_env"
}

readiness() {
  local compose_cmd=$1 deadline=$((SECONDS + REMOTE_TIMEOUT))
  while (( SECONDS < deadline )); do
    if eval "$compose_cmd ps --status running --services" >/dev/null 2>&1; then
      echo "PASS: services running"
      return 0
    fi
    sleep 1
  done
  echo "NOT VERIFIED: readiness timeout" >&2
  return 3
}
