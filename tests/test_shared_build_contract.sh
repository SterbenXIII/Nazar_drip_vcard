#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @vcard/shared build >/dev/null

if rg -nP "from ['\"]\.\.?/[^'\"]+(?<!\.js)['\"]" packages/shared/dist --glob '*.js'; then
  echo 'shared dist contains extensionless relative ESM imports' >&2
  exit 1
fi
