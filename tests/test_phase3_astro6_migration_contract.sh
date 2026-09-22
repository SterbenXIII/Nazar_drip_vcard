#!/usr/bin/env bash
set -euo pipefail

web_package='apps/web/package.json'
lockfile='pnpm-lock.yaml'

if rg -q --fixed-strings '"astro": "5.17.1"' "$web_package" ||
  rg -q --fixed-strings 'specifier: 5.17.1' "$lockfile" ||
  rg -q --fixed-strings 'astro@5.17.1' "$lockfile"; then
  echo 'FAIL: Astro 5 remains in the web dependency graph' >&2
  exit 1
fi

echo 'PASS: Astro 5 migration history contract'
