#!/usr/bin/env bash
set -euo pipefail

ui_file="apps/web/src/i18n/ui.ts"
seo_file="apps/web/src/components/SeoHead.astro"
validator="apps/web/scripts/validate-build.ts"

grep -q "getHreflang" "$ui_file"
grep -q "getHreflang" "$seo_file"
grep -q 'hreflang="uk-UA"' "$validator"
grep -q 'hreflang="ru-UA"' "$validator"

if rg -n "hreflang: alternateLocale|hreflang: locale" apps/web/src/pages apps/web/src/components/SeoHead.astro; then
  echo 'short hreflang values remain in page metadata' >&2
  exit 1
fi

echo 'Phase 4 locale contract: PASS'
