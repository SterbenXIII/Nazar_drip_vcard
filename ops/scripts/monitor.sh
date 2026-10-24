#!/bin/bash
# monitor.sh - Basic container health check

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

# Load environment variables if .env exists
if [ -f "$SCRIPT_DIR/../.env" ]; then
  source "$SCRIPT_DIR/../.env"
fi

# Check Docker containers
CONTAINERS=("vcard-api" "vcard-clinic-web" "vcard-proxy")
FAILED_CONTAINERS=()

for container in "${CONTAINERS[@]}"; do
  if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    FAILED_CONTAINERS+=("$container")
  fi
done

if [ ${#FAILED_CONTAINERS[@]} -ne 0 ]; then
  MESSAGE="🚨 *Container Alert!* The following containers are down: ${FAILED_CONTAINERS[*]}"
  echo "$MESSAGE"

  # Send Telegram notification if token and ID are available
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_MASTER_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
      -d "chat_id=$TELEGRAM_MASTER_ID" \
      -d "text=$MESSAGE" \
      -d "parse_mode=Markdown"
  fi
else
  echo "✅ All containers are healthy."
fi
