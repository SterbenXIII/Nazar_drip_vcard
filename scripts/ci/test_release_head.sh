#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
TEST_DIR=$(mktemp -d)
trap 'rm -rf -- "$TEST_DIR"' EXIT
mkdir -p "$TEST_DIR/repo"
git -C "$TEST_DIR/repo" init -b main >/dev/null
git -C "$TEST_DIR/repo" config user.name 'Clinic CD lab'
git -C "$TEST_DIR/repo" config user.email 'clinic-lab@example.invalid'
printf 'synthetic main\n' > "$TEST_DIR/repo/README"
git -C "$TEST_DIR/repo" add README
git -C "$TEST_DIR/repo" commit -m 'synthetic main' >/dev/null
git -C "$TEST_DIR/repo" clone --bare . "$TEST_DIR/main.git" >/dev/null
main_sha=$(git -C "$TEST_DIR/repo" rev-parse HEAD)
stale_sha=$(printf '0%.0s' {1..40})

run_gate() {
  local release_sha="$1" output="$2" summary="$3"
  RELEASE_SHA="$release_sha" \
    MAIN_REPOSITORY_URL="file://$TEST_DIR/main.git" \
    GITHUB_OUTPUT="$output" \
    GITHUB_STEP_SUMMARY="$summary" \
    bash "$ROOT_DIR/scripts/ci/check_release_head.sh"
}

run_gate "$main_sha" "$TEST_DIR/current.output" "$TEST_DIR/current.summary"
grep -qx 'deployment_result=deployed' "$TEST_DIR/current.output"
[[ ! -s "$TEST_DIR/current.summary" ]]

if run_gate invalid "$TEST_DIR/invalid.output" "$TEST_DIR/invalid.summary" 2>/dev/null; then
  echo 'FAIL: invalid release SHA was accepted.' >&2
  exit 1
fi
[[ ! -e "$TEST_DIR/invalid.output" ]]

run_gate "$stale_sha" "$TEST_DIR/stale.output" "$TEST_DIR/stale.summary"
grep -qx 'deployment_result=superseded' "$TEST_DIR/stale.output"
grep -q 'No VPS mutation or Telegram notification was performed.' "$TEST_DIR/stale.summary"

echo 'PASS: release head gate contracts'
