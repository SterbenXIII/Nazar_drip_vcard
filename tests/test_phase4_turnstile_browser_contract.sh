#!/usr/bin/env bash
set -euo pipefail

form="apps/web/src/components/ContactForm.astro"
widget="apps/web/src/components/Turnstile.astro"
script="apps/web/src/scripts/contact-form.ts"
example=".env.example"

grep -q "Turnstile" "$form"
grep -q "PUBLIC_TURNSTILE_SITE_KEY" "$form"
grep -q "PUBLIC_TURNSTILE_SITE_KEY" "$example"
grep -q "INPUT_TURNSTILE" "$script"

if grep -q "1x00000000000000000000AA" "$widget"; then
  echo 'Turnstile must not silently enable the test key' >&2
  exit 1
fi

echo 'Phase 4 Turnstile browser contract: PASS'
