#!/usr/bin/env bash
# shellcheck disable=SC2016
set -euo pipefail

deploy='.github/workflows/deploy.yml'
rollback='.github/workflows/rollback.yml'
playbook='ops/ansible/playbook.yml'
deployment='ops/ansible/tasks/05_deployment.yml'
ansible_readme='ops/ansible/README.md'
env_template='ops/ansible/env.j2'
env_example='.env.example'
api_env='apps/api/src/config/env.config.ts'
api_app='apps/api/src/app.ts'
lead_route='apps/api/src/routes/lead.routes.ts'
turnstile='apps/api/src/utils/turnstile.util.ts'
caddy='ops/docker/caddy/Caddyfile'
compose='ops/docker/compose/docker-compose.yml'

assert_contains() {
  local file_name="$1"
  local expected="$2"
  rg -q --fixed-strings -- "$expected" "$file_name" || {
    echo "FAIL: $file_name is missing: $expected" >&2
    exit 1
  }
}

assert_not_contains() {
  local file_name="$1"
  local forbidden="$2"
  if rg -q --fixed-strings -- "$forbidden" "$file_name"; then
    echo "FAIL: $file_name contains forbidden text: $forbidden" >&2
    exit 1
  fi
}

assert_contains "$deploy" 'group: deploy-production'
assert_contains "$rollback" 'group: deploy-production'
assert_contains "$deploy" 'cancel-in-progress: false'
assert_contains "$rollback" 'cancel-in-progress: false'
assert_not_contains "$deploy" 'cancel-in-progress: true'
assert_not_contains "$rollback" 'cancel-in-progress: true'

assert_contains "$rollback" 'ROLLBACK_SHA: ${{ inputs.commit_sha }}'
assert_contains "$rollback" '[[ "$ROLLBACK_SHA" =~ ^[0-9a-f]{40}$ ]]'
assert_contains "$rollback" '--extra-vars "rollback_mode=true"'
assert_contains "$deployment" 'pull --quiet'
assert_contains "$playbook" 'better-sqlite3'
assert_contains "$playbook" 'database.backup(process.env.BACKUP_PATH)'
assert_contains "$playbook" 'docker exec --user node vcard-api test -s'
assert_contains "$playbook" 'rollback_mode'
assert_contains "$ansible_readme" 'older image is supported only when its migrations remain readable'
assert_contains "$ansible_readme" 'TURNSTILE_SECRET_KEY` is optional by the current product contract'
assert_contains "$env_template" 'SMTP_HOST='
assert_contains "$env_template" 'SMTP_PORT='
assert_contains "$env_template" 'SMTP_PASS='
assert_contains "$env_example" 'TURNSTILE_SECRET_KEY='
assert_contains "$api_env" 'EMAIL requires SMTP_USER, SMTP_HOST, SMTP_PASS'
assert_contains "$deploy" 'SMTP_USER: ${{ secrets.SMTP_USER }}'
assert_contains "$deploy" 'SMTP_HOST: ${{ secrets.SMTP_HOST }}'
assert_contains "$deploy" 'SMTP_PASS: ${{ secrets.SMTP_PASS }}'
assert_contains "$deploy" 'GMAIL_REFRESH_TOKEN: ${{ secrets.GMAIL_REFRESH_TOKEN }}'
assert_contains "$caddy" 'header_up X-Forwarded-For {remote_host}'
assert_contains "$caddy" 'header_up -CF-Connecting-IP'
assert_contains "$api_app" 'Production Caddy overwrites this header'
assert_not_contains "$compose" "'5678:5678'"
assert_not_contains "$api_app" 'CF-Connecting-IP'
assert_not_contains "$lead_route" 'CF-Connecting-IP'
assert_not_contains "$lead_route" 'x-forwarded-for'
assert_contains "$turnstile" 'const TURNSTILE_TIMEOUT_MS = 5000'
assert_contains "$turnstile" 'AbortSignal.timeout(TURNSTILE_TIMEOUT_MS)'
assert_contains "$turnstile" 'if (!verifyRes.ok)'
assert_not_contains "$turnstile" "formData.append('remoteip'"
assert_not_contains "$rollback" 'IMAGE_TAG:-latest'
assert_not_contains "$rollback" 'image_tag=latest'

pull_line=$(rg -n -m 1 'pull --quiet' "$deployment" | cut -d: -f1)
up_line=$(rg -n -m 1 'up -d --force-recreate --remove-orphans' "$deployment" | cut -d: -f1)
if (( pull_line >= up_line )); then
  echo "FAIL: image pull must precede service recreation" >&2
  exit 1
fi

backup_line=$(rg -n -m 1 'Create SQLite backup before rollback mutation' "$playbook" | cut -d: -f1)
deployment_tasks_line=$(rg -n -m 1 'include_tasks: tasks/01_preflight_system.yml' "$playbook" | cut -d: -f1)
if (( backup_line >= deployment_tasks_line )); then
  echo "FAIL: rollback backup must precede main deployment tasks" >&2
  exit 1
fi

echo 'PASS: Phase 2 deployment contracts'
