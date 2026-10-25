#!/usr/bin/env bash
# shellcheck disable=SC2016
set -euo pipefail

deploy='.github/workflows/deploy.yml'
rollback='.github/workflows/rollback.yml'
playbook='ops/ansible/playbook.yml'
deployment='ops/ansible/tasks/05_deployment.yml'
backup='ops/ansible/tasks/backup_sqlite.yml'
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
  grep -Fq -- "$expected" "$file_name" || {
    echo "FAIL: $file_name is missing: $expected" >&2
    exit 1
  }
}

assert_not_contains() {
  local file_name="$1"
  local forbidden="$2"
  if grep -Fq -- "$forbidden" "$file_name"; then
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
assert_contains "$backup" 'require("better-sqlite3")'
assert_contains "$backup" 'source.backup(process.env.BACKUP_PATH)'
assert_contains "$backup" '--workdir /app/apps/api'
assert_not_contains "$playbook" 'docker exec --user node'
assert_contains "$playbook" 'rollback_mode'
assert_contains "$ansible_readme" 'older image is supported only when its migrations remain readable'
assert_contains "$ansible_readme" 'stage build uses `CLINIC_SITE_MODE=staging`'
assert_contains "$env_template" 'TELEGRAM_BOT_TOKEN='
assert_contains "$env_example" 'TELEGRAM_BOT_TOKEN='
assert_contains "$api_env" 'EMAIL requires SMTP_USER, SMTP_HOST, SMTP_PASS'
assert_contains "$deploy" "ENABLED_PROVIDERS: 'TELEGRAM'"
assert_not_contains "$deploy" 'SMTP_USER: ${{ secrets.SMTP_USER }}'
assert_not_contains "$deploy" 'GMAIL_REFRESH_TOKEN: ${{ secrets.GMAIL_REFRESH_TOKEN }}'
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

assert_contains "$playbook" 'include_tasks: tasks/backup_sqlite.yml'
assert_not_contains "$playbook" 'Create SQLite backup before rollback mutation'
assert_contains "$playbook" 'releases/current.json'
assert_contains "$backup" 'current_release_manifest'
assert_contains "$backup" 'docker'
assert_contains "$backup" 'label=com.docker.compose.volume=api_data'
assert_contains "$playbook" "compose_project_name: 'compose'"
assert_contains "$backup" 'label=com.docker.compose.project={{ compose_project_name }}'
assert_contains "$deployment" '--project-name "{{ compose_project_name }}"'
assert_contains "$backup" '--workdir /app/apps/api'
assert_contains "$backup" 'source.backup(process.env.BACKUP_PATH)'
assert_contains "$backup" '"integrity_check"'
assert_contains "$backup" 'chmod 700'
assert_contains "$backup" 'chmod 600'
assert_contains "$playbook" 'reconciliation-required.json'
assert_contains "$playbook" 'lab_mode: false'
assert_contains "$playbook" "project_dir is match('^/opt/clinic-cd-lab(/|$)')"
assert_contains "$deployment" 'Create reconciliation marker before service recreation'
assert_contains "$deployment" 'if [[ "$LAB_MODE" != '\''1'\'' ]]; then'
assert_contains "$backup" 'if [[ "$LAB_MODE" != '\''1'\'' ]]; then'
assert_contains "$deployment" 'up -d --remove-orphans'
assert_not_contains "$deployment" '--force-recreate'
assert_contains "$deployment" 'up -d --remove-orphans'
assert_not_contains "$deployment" '--force-recreate'
assert_contains "$deployment" 'releases/reconciliation-required.json'
assert_contains "$deployment" 'Verify candidate API schema compatibility against the SQLite snapshot'
assert_contains "$deployment" 'check-database-schema.js /app/data/leads.db'
assert_not_contains "$deployment" '--env-file "$ENV_FILE"'
assert_contains "$deployment" '--env "NODE_ENV=$NODE_ENV"'
assert_contains "$deployment" '--env "ENABLED_PROVIDERS=$ENABLED_PROVIDERS"'
assert_contains apps/api/package.json 'check-database-schema.ts'
assert_contains apps/api/src/utils/check-database-schema.ts 'findMissingSchemaRequirements'
assert_contains "$rollback" 'git merge-base --is-ancestor'
assert_contains "$rollback" 'gh api'
assert_contains "$rollback" 'docker pull "$API_IMAGE_REF"'
assert_contains "$rollback" 'API_IMAGE_REF: ${{ steps.validate_release.outputs.api_image_ref }}'
assert_contains "$rollback" 'CLINIC_WEB_IMAGE_REF: ${{ steps.validate_release.outputs.clinic_web_image_ref }}'
assert_contains "$rollback" 'current.json'
assert_contains "$deploy" 'releases/current.json'
assert_contains "$deploy" 'reconciliation-required.json'
assert_not_contains "$playbook" 'docker system prune -f --volumes'

system_tasks_line=$(grep -n -m 1 -F 'include_tasks: tasks/01_preflight_system.yml' "$playbook" | cut -d: -f1)
backup_tasks_line=$(grep -n -m 1 -F 'include_tasks: tasks/backup_sqlite.yml' "$playbook" | cut -d: -f1)
project_tasks_line=$(grep -n -m 1 -F 'include_tasks: tasks/03_project.yml' "$playbook" | cut -d: -f1)
if (( backup_tasks_line <= system_tasks_line || backup_tasks_line >= project_tasks_line )); then
  echo 'FAIL: SQLite backup must run after Docker bootstrap and before repository checkout' >&2
  exit 1
fi

pull_line=$(grep -n -m 1 -F 'pull --quiet' "$deployment" | cut -d: -f1)
up_line=$(grep -n -m 1 -F 'up -d --remove-orphans' "$deployment" | cut -d: -f1)
if (( pull_line >= up_line )); then
  echo "FAIL: image pull must precede service recreation" >&2
  exit 1
fi

backup_line=$(grep -n -m 1 -F 'Create consistent SQLite snapshot' "$backup" | cut -d: -f1)
up_line=$(grep -n -m 1 -F 'up -d --remove-orphans' "$deployment" | cut -d: -f1)
marker_line=$(grep -n -m 1 -F 'Create reconciliation marker before service recreation' "$deployment" | cut -d: -f1)
schema_probe_line=$(grep -n -m 1 -F 'Verify candidate API schema compatibility against the SQLite snapshot' "$deployment" | cut -d: -f1)
if (( backup_line < 1 || schema_probe_line >= marker_line || marker_line >= up_line )); then
  echo 'FAIL: snapshot and candidate schema probe must precede the marker and service recreation' >&2
  exit 1
fi

echo 'PASS: Phase 2 deployment contracts'
