#!/usr/bin/env bash
set -euo pipefail

web_package='apps/web/package.json'

if rg -q --fixed-strings '"pngjs"' "$web_package"; then
  echo 'FAIL: pngjs remains in the web package' >&2
  exit 1
fi

if rg -q --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!dist/**' \
  --fixed-strings 'from '\''pngjs'\''' apps tests scripts; then
  echo 'FAIL: source still imports pngjs' >&2
  exit 1
fi

if rg -q --fixed-strings 'pngjs@' pnpm-lock.yaml; then
  echo 'FAIL: pngjs remains in the lockfile' >&2
  exit 1
fi

echo 'PASS: pngjs removal contract'
