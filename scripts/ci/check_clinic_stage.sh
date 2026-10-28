#!/usr/bin/env bash
set -euo pipefail

: "${DOMAIN_NAME:?DOMAIN_NAME must be the staging hostname}"
: "${STAGE_BASIC_AUTH_PASSWORD:?STAGE_BASIC_AUTH_PASSWORD is required}"

BASE_URL="https://$DOMAIN_NAME"
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

check_status 'staging homepage' 200 "$BASE_URL/" --user "stage:$STAGE_BASIC_AUTH_PASSWORD"
check_status 'staging API health' 200 "$BASE_URL/api/health" --user "stage:$STAGE_BASIC_AUTH_PASSWORD"
check_status 'unauthenticated staging request' 401 "$BASE_URL/"
check_status 'invalid staging credentials' 401 "$BASE_URL/" --user 'stage:deliberately-invalid-stage-password'
check_status 'staging HTTP redirect' 308 "http://$DOMAIN_NAME/"
check_status 'staging lead validation' 400 "$BASE_URL/api/leads/submit" --user "stage:$STAGE_BASIC_AUTH_PASSWORD" \
  --request POST --header 'Content-Type: application/json' --data '{}'
check_status 'staging sitemap disabled' 404 "$BASE_URL/sitemap.xml" --user "stage:$STAGE_BASIC_AUTH_PASSWORD"

html=$(curl --fail --silent --max-time 20 --user "stage:$STAGE_BASIC_AUTH_PASSWORD" "$BASE_URL/")
printf '%s\n' "$html" | grep -Fi 'content="noindex,nofollow"' >/dev/null
if printf '%s\n' "$html" | grep -Eiq 'rel=["\x27]canonical'; then
  echo 'FAIL: staging HTML contains a canonical URL.' >&2
  exit 1
fi
curl --fail --silent --max-time 20 --user "stage:$STAGE_BASIC_AUTH_PASSWORD" "$BASE_URL/robots.txt" \
  | grep -F 'Disallow: /' >/dev/null
headers=$(curl --fail --silent --head --max-time 20 --user "stage:$STAGE_BASIC_AUTH_PASSWORD" "$BASE_URL/")
printf '%s\n' "$headers" | grep -Eiq '^x-robots-tag: noindex, nofollow'

api_port_status=$(curl --silent --output /dev/null --write-out '%{http_code}' --connect-timeout 5 --max-time 10 \
  "http://${VPS_IP:-127.0.0.1}:5678/api/health") || api_port_status=000
if [[ "$api_port_status" != '000' ]]; then
  echo "FAIL: API port 5678 is externally reachable (HTTP $api_port_status)." >&2
  exit 1
fi

echo 'PASS: staging HTTPS, Basic Auth, noindex, API validation, and private API port.'
