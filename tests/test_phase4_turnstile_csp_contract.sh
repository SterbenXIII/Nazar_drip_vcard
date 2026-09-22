#!/usr/bin/env bash
set -euo pipefail

caddy='ops/docker/caddy/Caddyfile'
turnstile='apps/web/src/components/Turnstile.astro'

grep -q 'https://challenges.cloudflare.com/turnstile/v0/api.js' "$turnstile"

csp=$(grep 'Content-Security-Policy' "$caddy")
for directive in 'script-src' 'connect-src' 'frame-src'; do
  printf '%s\n' "$csp" | grep -q "$directive[^;]*https://challenges.cloudflare.com" || {
    echo "FAIL: $directive does not allow Cloudflare Turnstile" >&2
    exit 1
  }
done

echo 'Phase 4 Turnstile CSP contract: PASS'
