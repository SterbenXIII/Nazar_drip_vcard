#!/usr/bin/env bash
set -euo pipefail

failures=0

assert_contains() {
  if ! rg -q --fixed-strings -- "$2" "$1"; then
    echo "FAIL: $1 is missing: $2" >&2
    failures=$((failures + 1))
  fi
}

assert_not_contains() {
  if rg -q --fixed-strings -- "$2" "$1"; then
    echo "FAIL: $1 contains forbidden text: $2" >&2
    failures=$((failures + 1))
  fi
}

assert_contains .github/workflows/deploy.yml 'vcard-clinic-web'
assert_not_contains .github/workflows/deploy.yml 'name: 📦 Build and push Web'
assert_contains ops/docker/compose/docker-compose.yml 'container_name: vcard-clinic-web'
assert_contains ops/docker/compose/docker-compose.proxy.yml 'DOMAIN_NAME=${DOMAIN_NAME:-localhost}'
assert_contains ops/docker/compose/docker-compose.proxy.yml 'STAGE_BASIC_AUTH_HASH=${STAGE_BASIC_AUTH_HASH:-}'
assert_contains ops/docker/compose/docker-compose.proxy.yml "'443:443'"
assert_contains ops/docker/caddy/Caddyfile '{$DOMAIN_NAME}, www.{$DOMAIN_NAME}'
assert_contains ops/docker/caddy/Caddyfile 'http://{$DOMAIN_NAME}, http://www.{$DOMAIN_NAME}'
assert_contains ops/docker/caddy/Caddyfile 'redir https://{host}{uri} 308'
assert_contains ops/docker/caddy/Caddyfile 'basic_auth {'
assert_contains ops/docker/caddy/Caddyfile 'stage {$STAGE_BASIC_AUTH_HASH}'
assert_contains ops/docker/caddy/Caddyfile 'reverse_proxy clinic-web:8080'
assert_contains ops/docker/caddy/Caddyfile 'reverse_proxy api:5678'
assert_contains ops/docker/caddy/Caddyfile 'path /api/leads/submit*'
assert_contains ops/docker/caddy/Caddyfile 'Stage lead submissions are disabled'
assert_not_contains ops/docker/caddy/Caddyfile 'Strict-Transport-Security'
assert_contains apps/clinic-web/Dockerfile 'pnpm --filter @vcard/clinic-web build:staging'
assert_not_contains ops/ansible/playbook.yml 'n8n_encryption_key | default'
assert_contains ops/ansible/playbook.yml 'TELEGRAM_ALLOWED_CHAT_IDS'
assert_contains ops/ansible/playbook.yml 'stage_basic_auth_password | default'
assert_contains ops/ansible/tasks/08_healthcheck.yml 'status_code: 401'
assert_contains ops/ansible/tasks/08_healthcheck.yml 'status_code: 308'
assert_contains ops/ansible/tasks/08_healthcheck.yml 'status_code: 403'
assert_contains ops/scripts/monitor.sh 'SCRIPT_DIR/../.env'
assert_contains ops/scripts/monitor.sh 'vcard-clinic-web'
assert_contains ops/scripts/monitor.sh 'vcard-proxy'
assert_not_contains ops/scripts/monitor.sh 'vcard-web'
assert_contains ops/scripts/daily_report.sh 'SCRIPT_DIR/../.env'
assert_contains ops/ansible/playbook.yml 'https://{{ domain_name }}/api/health (HTTP Basic Auth required)'
assert_not_contains ops/ansible/playbook.yml 'http://{{ vps_ip }}/api/health'
assert_contains .github/workflows/deploy.yml 'https://${{ env.DOMAIN_NAME }}'
assert_contains .github/workflows/deploy.yml 'DOMAIN_NAME: havenhub.tech'
assert_contains .github/workflows/deploy.yml 'caddy hash-password --plaintext "$STAGE_BASIC_AUTH_PASSWORD"'
assert_contains .github/workflows/deploy.yml 'STAGE_BASIC_AUTH_PASSWORD: ${{ secrets.STAGE_BASIC_AUTH_PASSWORD }}'
assert_contains .github/workflows/rollback.yml 'https://${{ env.DOMAIN_NAME }}'
assert_contains .github/workflows/rollback.yml 'DOMAIN_NAME: havenhub.tech'
assert_contains .github/workflows/rollback.yml 'STAGE_BASIC_AUTH_PASSWORD: ${{ secrets.STAGE_BASIC_AUTH_PASSWORD }}'
assert_contains Makefile 'check-stage-auth'
assert_contains Makefile 'STAGE_BASIC_AUTH_PASSWORD'
assert_contains Makefile 'Legacy VPS setup helper is disabled for the authenticated HTTPS stage.'

if (( failures > 0 )); then
  exit 1
fi

echo 'PASS: clinic VPS protected HTTPS staging contract'
