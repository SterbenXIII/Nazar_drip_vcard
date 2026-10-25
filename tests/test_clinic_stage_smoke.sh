#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
TEST_DIR=$(mktemp -d)
trap 'rm -rf -- "$TEST_DIR"' EXIT
mkdir -p "$TEST_DIR/bin"

cat > "$TEST_DIR/bin/curl" <<'CURL_STUB'
#!/usr/bin/env bash
set -euo pipefail
method=GET
credentials=''
write_status=0
url=''
while (($# > 0)); do
  case "$1" in
    --request) method="$2"; shift 2 ;;
    --user) credentials="$2"; shift 2 ;;
    --write-out) write_status=1; shift 2 ;;
    http://*|https://*) url="$1"; shift ;;
    *) shift ;;
  esac
done

status=000
if [[ "$url" == 'http://192.0.2.1:5678/api/health' ]]; then
  status=${API_PORT_STATUS:-000}
elif [[ "$url" == https://* ]]; then
  if [[ "$url" == */api/leads/submit ]]; then
    if [[ -z "$credentials" ]]; then status=401; else status=${LEAD_VALIDATION_STATUS:-400}; fi
  elif [[ -z "$credentials" ]]; then
    status=401
  elif [[ "$credentials" == 'stage:deliberately-invalid-stage-password' ]]; then
    status=${WRONG_CREDENTIAL_STATUS:-401}
  else
    status=200
  fi
elif [[ "$url" == http://* ]]; then
  status=308
fi

if ((write_status)); then
  printf '%s' "$status"
  [[ "$status" != '000' ]] || exit 7
elif [[ -n "$url" && "$url" == https://* && "${OMIT_NOINDEX:-0}" != '1' ]]; then
  printf '<meta name="robots" content="noindex,nofollow">\n'
  if [[ "${ROBOTS_TRAILING_BODY:-0}" == '1' ]]; then
    head -c 1048576 /dev/zero | tr '\0' 'x'
  fi
fi
CURL_STUB
chmod +x "$TEST_DIR/bin/curl"

assert_smoke_fails() {
  local label="$1"
  shift
  if env PATH="$TEST_DIR/bin:$PATH" DOMAIN_NAME=example.test VPS_IP=192.0.2.1 \
    STAGE_BASIC_AUTH_PASSWORD=synthetic-stage-password "$@" \
    bash "$ROOT_DIR/scripts/ci/check_clinic_stage.sh" >/dev/null 2>&1; then
    echo "FAIL: staging smoke accepted $label" >&2
    exit 1
  fi
}

env PATH="$TEST_DIR/bin:$PATH" DOMAIN_NAME=example.test VPS_IP=192.0.2.1 \
  STAGE_BASIC_AUTH_PASSWORD=synthetic-stage-password ROBOTS_TRAILING_BODY=1 \
  bash "$ROOT_DIR/scripts/ci/check_clinic_stage.sh" >/dev/null

assert_smoke_fails 'incorrect Basic Auth credentials' env WRONG_CREDENTIAL_STATUS=200
assert_smoke_fails 'missing noindex metadata' env OMIT_NOINDEX=1
assert_smoke_fails 'an externally reachable API port' env API_PORT_STATUS=200

echo 'PASS: clinic staging smoke contracts'
