#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
TEST_DIR=$(mktemp -d)
trap 'rm -rf -- "$TEST_DIR"' EXIT
mkdir -p "$TEST_DIR/project/scripts" "$TEST_DIR/bin"
cp "$ROOT_DIR/ops/scripts/monitor.sh" "$ROOT_DIR/ops/scripts/daily_report.sh" "$TEST_DIR/project/scripts/"

cat > "$TEST_DIR/bin/docker" <<'DOCKER_STUB'
#!/usr/bin/env bash
set -euo pipefail

if [[ "$1" == 'ps' ]]; then
  for container in vcard-api vcard-clinic-web vcard-proxy; do
    [[ "$container" == "${DOCKER_STOPPED:-}" ]] || printf '%s\n' "$container"
  done
  exit 0
fi

if [[ "$1" == 'inspect' ]]; then
  container="${@: -1}"
  if [[ "$container" == "${DOCKER_STOPPED:-}" ]]; then
    printf 'exited|none\n'
  elif [[ "$container" == "${DOCKER_UNHEALTHY:-}" ]]; then
    printf 'running|unhealthy\n'
  elif [[ "$container" == 'vcard-api' ]]; then
    printf 'running|healthy\n'
  else
    printf 'running|none\n'
  fi
  exit 0
fi

if [[ "$1" == 'exec' && "${API_HEALTH_FAIL:-0}" == '1' ]]; then
  exit 22
fi

exit 0
DOCKER_STUB

cat > "$TEST_DIR/bin/curl" <<'CURL_STUB'
#!/usr/bin/env bash
set -euo pipefail
for argument in "$@"; do
  case "$argument" in
    text=*) printf '%s\n' "${argument#text=}" >> "$CURL_CAPTURE" ;;
  esac
done
exit 0
CURL_STUB
chmod +x "$TEST_DIR/bin/docker" "$TEST_DIR/bin/curl"

assert_monitor_fails() {
  local label="$1"
  shift
  if env PATH="$TEST_DIR/bin:$PATH" TELEGRAM_BOT_TOKEN=test-token TELEGRAM_MASTER_ID=123 \
    CURL_CAPTURE="$TEST_DIR/telegram.log" "$@" \
    bash "$TEST_DIR/project/scripts/monitor.sh" >/dev/null 2>&1; then
    echo "FAIL: monitor accepted $label" >&2
    exit 1
  fi
}

env PATH="$TEST_DIR/bin:$PATH" TELEGRAM_BOT_TOKEN=test-token TELEGRAM_MASTER_ID=123 \
  CURL_CAPTURE="$TEST_DIR/telegram.log" bash "$TEST_DIR/project/scripts/monitor.sh" >/dev/null
assert_monitor_fails 'a stopped service' env DOCKER_STOPPED=vcard-clinic-web
assert_monitor_fails 'an unhealthy service' env DOCKER_UNHEALTHY=vcard-proxy
assert_monitor_fails 'an API health error' env API_HEALTH_FAIL=1

: > "$TEST_DIR/telegram.log"
env PATH="$TEST_DIR/bin:$PATH" TELEGRAM_BOT_TOKEN=test-token TELEGRAM_MASTER_ID=123 \
  CURL_CAPTURE="$TEST_DIR/telegram.log" bash "$TEST_DIR/project/scripts/daily_report.sh" >/dev/null
if grep -Eiq 'no (critical )?issues? (detected )?in the last 24h|без інцидентів за 24' "$TEST_DIR/telegram.log"; then
  echo 'FAIL: daily report claims a 24-hour incident history it does not collect' >&2
  exit 1
fi
grep -q 'healthy: all containers running and API health passed' "$TEST_DIR/telegram.log"

: > "$TEST_DIR/telegram.log"
if env PATH="$TEST_DIR/bin:$PATH" DOCKER_STOPPED=vcard-api TELEGRAM_BOT_TOKEN=test-token \
  TELEGRAM_MASTER_ID=123 CURL_CAPTURE="$TEST_DIR/telegram.log" \
  bash "$TEST_DIR/project/scripts/daily_report.sh" >/dev/null 2>&1; then
  echo 'FAIL: daily report accepted degraded current service health' >&2
  exit 1
fi
grep -q 'degraded: one or more current health checks failed' "$TEST_DIR/telegram.log"
[[ $(wc -l < "$TEST_DIR/telegram.log" | tr -d ' ') == 1 ]]

echo 'PASS: clinic monitoring contracts'
