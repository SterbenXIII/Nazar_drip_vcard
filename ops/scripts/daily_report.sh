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
REPORT_DATE=$(date +'%Y-%m-%d')

if SUPPRESS_TELEGRAM=1 bash "$SCRIPT_DIR/monitor.sh" >/dev/null; then
  CURRENT_STATUS='healthy: all containers running and API health passed'
  exit_status=0
else
  CURRENT_STATUS='degraded: one or more current health checks failed'
  exit_status=1
fi
MESSAGE="Staging status report ($REPORT_DATE): $CURRENT_STATUS."

if [[ -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_MASTER_ID" ]]; then
  if ! curl --fail --silent --output /dev/null --max-time 10 \
    --data-urlencode "chat_id=$TELEGRAM_MASTER_ID" \
    --data-urlencode "text=$MESSAGE" \
    "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage"; then
    echo 'Telegram daily report could not be sent.' >&2
    exit_status=1
  fi
fi

echo "$MESSAGE"
exit "$exit_status"
