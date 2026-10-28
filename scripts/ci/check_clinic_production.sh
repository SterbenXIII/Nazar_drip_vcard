#!/usr/bin/env bash
set -euo pipefail

: "${DOMAIN_NAME:?DOMAIN_NAME is required}"
: "${LEGACY_DOMAIN_NAME:?LEGACY_DOMAIN_NAME is required}"
: "${STAGE_BASIC_AUTH_PASSWORD:?STAGE_BASIC_AUTH_PASSWORD is required}"

base="https://$DOMAIN_NAME"
check_status() {
  local label="$1" expected="$2" url="$3" status
  shift 3
  status=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 20 "$@" "$url") || status=000
  if [[ "$status" != "$expected" ]]; then
    echo "FAIL: $label expected HTTP $expected, received $status." >&2
    return 1
  fi
  echo "PASS: $label HTTP $status."
}

check_status 'production homepage' 200 "$base/"
check_status 'production API health' 200 "$base/api/health"
check_status 'www redirects to the canonical host' 308 "https://www.$DOMAIN_NAME/"
check_status 'apex HTTP redirects to HTTPS' 308 "http://$DOMAIN_NAME/"
check_status 'www HTTP redirects to HTTPS' 308 "http://www.$DOMAIN_NAME/"
check_status 'old domain redirects to production' 308 "https://$LEGACY_DOMAIN_NAME/"
check_status 'old www domain redirects to production' 308 "https://www.$LEGACY_DOMAIN_NAME/"
check_status 'invalid production lead reaches validation' 400 "$base/api/leads/submit" \
  --request POST --header 'Content-Type: application/json' --data '{}'
check_status 'staging homepage requires authentication' 401 'https://staging.havenhub.com.ua/'
check_status 'staging remains authenticated and available' 200 'https://staging.havenhub.com.ua/' \
  --user "stage:$STAGE_BASIC_AUTH_PASSWORD"

production_html=$(curl --fail --silent --max-time 20 "$base/")
printf '%s\n' "$production_html" | grep -Fi 'https://havenhub.com.ua/' >/dev/null
if printf '%s\n' "$production_html" | grep -qi 'noindex'; then
  echo 'FAIL: production page contains noindex metadata.' >&2
  exit 1
fi

stage_html=$(curl --fail --silent --max-time 20 --user "stage:$STAGE_BASIC_AUTH_PASSWORD" \
  'https://staging.havenhub.com.ua/')
printf '%s\n' "$stage_html" | grep -Fi 'content="noindex,nofollow"' >/dev/null
curl --fail --silent --max-time 20 --user "stage:$STAGE_BASIC_AUTH_PASSWORD" \
  'https://staging.havenhub.com.ua/robots.txt' | grep -F 'Disallow: /' >/dev/null

api_port_status=$(curl --silent --output /dev/null --write-out '%{http_code}' --connect-timeout 5 --max-time 10 \
  "http://${VPS_IP:-127.0.0.1}:5678/api/health") || api_port_status=000
if [[ "$api_port_status" != '000' ]]; then
  echo "FAIL: API port 5678 is externally reachable (HTTP $api_port_status)." >&2
  exit 1
fi

echo 'PASS: public production routes, canonical redirects, staging protection, and non-persisting API validation.'
