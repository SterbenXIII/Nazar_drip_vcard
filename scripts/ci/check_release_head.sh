#!/usr/bin/env bash
set -euo pipefail

: "${RELEASE_SHA:?RELEASE_SHA is required}"
: "${MAIN_REPOSITORY_URL:?MAIN_REPOSITORY_URL is required}"
: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
: "${GITHUB_STEP_SUMMARY:?GITHUB_STEP_SUMMARY is required}"

if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'FAIL: release SHA is invalid; refusing VPS mutation.' >&2
  exit 1
fi

current_main=$(git ls-remote "$MAIN_REPOSITORY_URL" refs/heads/main | awk 'NR == 1 {print $1}')
if [[ -z "$current_main" ]]; then
  echo 'FAIL: could not read current main SHA; refusing VPS mutation.' >&2
  exit 1
fi

if [[ "$current_main" != "$RELEASE_SHA" ]]; then
  echo 'deployment_result=superseded' >> "$GITHUB_OUTPUT"
  {
    echo '## Deployment skipped'
    printf 'Release %s was superseded by %s on main.\n' "$RELEASE_SHA" "$current_main"
    echo 'No VPS mutation or Telegram notification was performed.'
  } >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi

echo 'deployment_result=deployed' >> "$GITHUB_OUTPUT"
