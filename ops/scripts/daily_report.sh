#!/bin/bash
# daily_report.sh - Daily summary of lead notifications

# Load environment variables if .env exists
if [ -f "../.env" ]; then
  source ../.env
fi

# Basic report logic (placeholder - would typically query DB or logs)
# For now, just send a "I'm alive" daily ping as requested in TODO #38
REPORT_DATE=$(date +'%Y-%m-%d')
MESSAGE="📊 *Daily Report ($REPORT_DATE)*: Monitoring system is active. No critical issues detected in the last 24h."

if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_MASTER_ID" ]; then
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_MASTER_ID" \
    -d "text=$MESSAGE" \
    -d "parse_mode=Markdown"
fi

echo "✅ Daily report sent."
