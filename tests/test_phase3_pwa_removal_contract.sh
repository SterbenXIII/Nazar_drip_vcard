#!/usr/bin/env bash
set -euo pipefail

web_package='apps/web/package.json'
astro_config='apps/web/astro.config.mjs'
layout='apps/web/src/layouts/Layout.astro'
welcome='apps/web/src/components/WelcomeModal.astro'
env_types='apps/web/src/env.d.ts'
env_types_legacy='apps/web/src/types/env.d.ts'
lockfile='pnpm-lock.yaml'
guidance='docs/frontend-enhancements.md'

assert_not_contains() {
  local file_name="$1"
  local forbidden="$2"
  if rg -q --fixed-strings -- "$forbidden" "$file_name"; then
    echo "FAIL: $file_name contains removed PWA contract: $forbidden" >&2
    exit 1
  fi
}

assert_not_contains "$web_package" '@vite-pwa/astro'
assert_not_contains "$web_package" '@vite-pwa/assets-generator'
assert_not_contains "$web_package" 'generate:pwa-icons'
assert_not_contains "$astro_config" '@vite-pwa/astro'
assert_not_contains "$astro_config" 'SKIP_PWA'
assert_not_contains "$layout" 'PwaHead'
assert_not_contains "$welcome" 'install-btn'
assert_not_contains "$welcome" 'beforeinstallprompt'
assert_not_contains "$layout" 'navigator.serviceWorker.register'
rg -q --fixed-strings 'registration.unregister()' "$layout"
assert_not_contains "$env_types" 'virtual:pwa'
assert_not_contains "$env_types" 'vite-plugin-pwa'
assert_not_contains "$env_types_legacy" 'vite-plugin-pwa'
assert_not_contains "$lockfile" '@vite-pwa/astro'
assert_not_contains "$lockfile" 'vite-plugin-pwa'
assert_not_contains "$guidance" '@vite-pwa/astro'
assert_not_contains "$guidance" 'generate:pwa-icons'
test ! -e apps/web/pwa-assets.config.ts
test ! -e apps/web/src/pwa.ts
test ! -e apps/web/src/components/layout/PwaHead.astro
test ! -e apps/web/scripts/generate-placeholder-pngs.js
test ! -e apps/web/public/pwa-64x64.png
test ! -e apps/web/public/pwa-192x192.png
test ! -e apps/web/public/pwa-512x512.png
test ! -e apps/web/public/maskable-icon-512x512.png
test ! -e apps/web/public/assets/pwa-screenshot-wide.png
test ! -e apps/web/public/assets/pwa-screenshot-narrow.png

echo 'PASS: Phase 3 PWA removal contract'
