#!/usr/bin/env bash
set -euo pipefail

web_package='apps/web/package.json'
lockfile='pnpm-lock.yaml'

rg -q --fixed-strings '"astro": "7.3.1"' "$web_package"
rg -q --fixed-strings 'specifier: 7.3.1' "$lockfile"
rg -q --fixed-strings 'astro@7.3.1' "$lockfile"
rg -q --fixed-strings 'sharp@0.35.4' "$lockfile"

if rg -q --fixed-strings '"astro": "6.4.6"' "$web_package"; then
  echo 'FAIL: Astro 6 remains in the web package' >&2
  exit 1
fi

echo 'PASS: Astro 7 migration contract'
