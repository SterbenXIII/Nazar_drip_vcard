#!/usr/bin/env bash
set -euo pipefail

: "${DOMAIN_NAME:?DOMAIN_NAME is required}"
: "${VPS_IP:?VPS_IP is required}"
: "${STAGE_BASIC_AUTH_PASSWORD:?STAGE_BASIC_AUTH_PASSWORD is required}"

BASE_URL="https://$DOMAIN_NAME"
WWW_URL="https://www.$DOMAIN_NAME"

check_status() {
  local label="$1" expected="$2" url="$3" status
  shift 3
  status=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 20 \
    "$@" "$url") || status=000
  if [[ "$status" != "$expected" ]]; then
    echo "FAIL: $label expected HTTP $expected, received $status." >&2
    return 1
  fi
  echo "PASS: $label HTTP $status."
}

check_robots() {
  local label="$1" url="$2"
  if curl --fail --silent --max-time 20 --user "stage:$STAGE_BASIC_AUTH_PASSWORD" "$url" \
    | grep -Fi 'content="noindex,nofollow"' >/dev/null; then
    echo "PASS: $label keeps staging robots metadata."
  else
    echo "FAIL: $label is missing noindex,nofollow metadata." >&2
    return 1
  fi
}

for host_url in "$BASE_URL" "$WWW_URL"; do
  label=${host_url#https://}
  check_status "$label homepage with valid credentials" 200 "$host_url/" \
    --user "stage:$STAGE_BASIC_AUTH_PASSWORD"
  check_status "$label API health with valid credentials" 200 "$host_url/api/health" \
    --user "stage:$STAGE_BASIC_AUTH_PASSWORD"
  check_status "$label homepage without credentials" 401 "$host_url/"
  check_status "$label homepage with invalid credentials" 401 "$host_url/" \
    --user 'stage:deliberately-invalid-stage-password'
  check_status "$label HTTP redirect" 308 "http://$label/"
  check_status "$label HTTP lead submission redirects to HTTPS" 308 "http://$label/api/leads/submit" \
    --request POST --data '{}'
  check_status "$label HTTPS lead validation reaches API" 400 "$host_url/api/leads/submit" \
    --user "stage:$STAGE_BASIC_AUTH_PASSWORD" --request POST \
    --header 'Content-Type: application/json' --data '{}'
  check_robots "$label" "$host_url/"
done

api_port_status=$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --connect-timeout 5 --max-time 10 "http://$VPS_IP:5678/api/health") || api_port_status=000
if [[ "$api_port_status" != '000' ]]; then
  echo "FAIL: API port 5678 is externally reachable (HTTP $api_port_status)." >&2
  exit 1
fi

echo 'PASS: staging HTTPS, authentication, robots, API lead validation, and API port checks.'
