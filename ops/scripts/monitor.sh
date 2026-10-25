#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ENV_FILE="$SCRIPT_DIR/../.env"

read_env_value() {
  local key="$1" line value
  [[ -r "$ENV_FILE" ]] || return 0
  while IFS= read -r line; do
    [[ "$line" == "$key="* ]] || continue
    value=${line#*=}
    value=${value#\"}
    value=${value%\"}
    printf '%s' "$value"
    return 0
  done < "$ENV_FILE"
}

TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-$(read_env_value TELEGRAM_BOT_TOKEN)}
TELEGRAM_MASTER_ID=${TELEGRAM_MASTER_ID:-$(read_env_value TELEGRAM_MASTER_ID)}
SUPPRESS_TELEGRAM=${SUPPRESS_TELEGRAM:-0}
CONTAINERS=(vcard-api vcard-clinic-web vcard-proxy)
FAILED_SERVICES=()

for container in "${CONTAINERS[@]}"; do
  state=$(docker inspect --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
    "$container" 2>/dev/null) || state='missing|none'
  IFS='|' read -r container_state health_state <<< "$state"

  if [[ "$container_state" != 'running' ]]; then
    FAILED_SERVICES+=("$container=$container_state")
  elif [[ "$health_state" != 'none' && "$health_state" != 'healthy' ]]; then
    FAILED_SERVICES+=("$container=$health_state")
  elif [[ "$container" == 'vcard-api' && "$health_state" != 'healthy' ]]; then
    FAILED_SERVICES+=("$container=healthcheck-$health_state")
  fi
done

if ! docker exec vcard-api curl --fail --silent --output /dev/null --max-time 5 \
  http://localhost:5678/api/health >/dev/null 2>&1; then
  FAILED_SERVICES+=(vcard-api=http-health-failed)
fi

if ((${#FAILED_SERVICES[@]} > 0)); then
  MESSAGE="Clinic staging health check failed: ${FAILED_SERVICES[*]}"
  echo "$MESSAGE"
  if [[ "$SUPPRESS_TELEGRAM" != '1' && -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_MASTER_ID" ]]; then
    if ! curl --fail --silent --output /dev/null --max-time 10 \
      --data-urlencode "chat_id=$TELEGRAM_MASTER_ID" \
      --data-urlencode "text=$MESSAGE" \
      "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage"; then
      echo 'Telegram health alert could not be sent.' >&2
    fi
  fi
  exit 1
fi

echo 'All staging containers are running; API health check passed.'
