#!/usr/bin/env bash
set -euo pipefail

web_package='apps/web/package.json'
layout='apps/web/src/layouts/Layout.astro'

assert_not_contains() {
  local file_name="$1"
  local forbidden="$2"
  if rg -q --fixed-strings -- "$forbidden" "$file_name"; then
    echo "FAIL: $file_name contains removed Pagefind contract: $forbidden" >&2
    exit 1
  fi
}

assert_not_contains "$web_package" 'pagefind'
rg -q --fixed-strings '"postbuild": "tsx src/scripts/seo-audit.ts"' "$web_package"
assert_not_contains "$layout" "components/Search.astro"
assert_not_contains pnpm-lock.yaml 'pagefind'

if rg -l --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!graphify-out/**' \
  --glob '!.git/**' 'pagefind|PagefindUI|data-pagefind' apps/web; then
  echo 'FAIL: apps/web contains removed Pagefind references' >&2
  exit 1
fi

test ! -e apps/web/src/components/Search.astro

echo 'PASS: Phase 3 Pagefind removal contract'
