#!/usr/bin/env bash
set -euo pipefail

failures=0
CADDY_IMAGE_REF='docker.io/library/caddy:2-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f'

assert_contains() {
  if ! grep -Fq -- "$2" "$1"; then
    echo "FAIL: $1 is missing: $2" >&2
    failures=$((failures + 1))
  fi
}

assert_not_contains() {
  if grep -Fq -- "$2" "$1"; then
    echo "FAIL: $1 contains forbidden text: $2" >&2
    failures=$((failures + 1))
  fi
}

assert_exists_and_trackable() {
  if [[ ! -f "$1" ]]; then
    echo "FAIL: required clinic image is missing: $1" >&2
    failures=$((failures + 1))
  elif git check-ignore -q -- "$1"; then
    echo "FAIL: required clinic image is ignored by Git: $1" >&2
    failures=$((failures + 1))
  fi
}

assert_contains .github/workflows/deploy.yml 'vcard-clinic-web'
assert_not_contains .github/workflows/deploy.yml 'name: 📦 Build and push Web'
assert_contains ops/docker/compose/docker-compose.yml 'container_name: vcard-clinic-web'
assert_contains ops/docker/compose/docker-compose.proxy.yml 'DOMAIN_NAME=${CADDY_DOMAIN_NAME:-${DOMAIN_NAME:-localhost}}'
assert_not_contains ops/docker/compose/docker-compose.proxy.yml 'staging-gateway'
assert_contains ops/docker/compose/docker-compose.staging-proxy.yml 'name: vcard-staging-gateway'
assert_contains ops/docker/compose/docker-compose.proxy.yml 'STAGE_BASIC_AUTH_HASH=${STAGE_BASIC_AUTH_HASH:-}'
assert_contains ops/docker/compose/docker-compose.proxy.yml 'CADDY_IMAGE_REF:-docker.io/library/caddy:2-alpine@sha256:'
assert_contains ops/docker/compose/docker-compose.proxy.yml "$CADDY_IMAGE_REF"
assert_not_contains ops/docker/compose/docker-compose.proxy.yml 'staging-gateway'
assert_contains ops/docker/compose/docker-compose.staging-proxy.yml 'name: vcard-staging-gateway'
assert_contains ops/docker/compose/docker-compose.staging.yml 'internal: true'
assert_contains ops/docker/compose/docker-compose.staging.yml 'name: compose-staging_api_data'
assert_contains ops/docker/compose/docker-compose.yml 'name: compose_api_data'
assert_contains ops/docker/compose/docker-compose.proxy.yml "'443:443'"
assert_contains ops/docker/caddy/Caddyfile '{$DOMAIN_NAME}, www.{$DOMAIN_NAME}'
assert_contains ops/docker/caddy/Caddyfile 'Content-Security-Policy "default-src'
assert_contains ops/docker/caddy/Caddyfile 'http://{$DOMAIN_NAME}, http://www.{$DOMAIN_NAME}'
assert_contains ops/docker/caddy/Caddyfile 'redir https://{host}{uri} 308'
assert_contains ops/docker/caddy/Caddyfile 'basic_auth {'
assert_contains ops/docker/caddy/Caddyfile 'stage {$STAGE_BASIC_AUTH_HASH}'
assert_contains ops/docker/caddy/Caddyfile 'reverse_proxy clinic-web:8080'
assert_contains ops/docker/caddy/Caddyfile 'reverse_proxy api:5678'
assert_contains ops/docker/caddy/Caddyfile 'handle /api/*'
assert_not_contains ops/docker/caddy/Caddyfile 'Stage lead submissions are disabled'
assert_not_contains ops/docker/caddy/Caddyfile 'Strict-Transport-Security'
assert_contains apps/clinic-web/Dockerfile 'pnpm --filter @vcard/clinic-web build:staging'
assert_contains ops/docker/compose/docker-compose.production.yml "CLINIC_ALLOW_PRODUCTION_BUILD: 'true'"
assert_not_contains apps/clinic-web/src/components/Services.astro '../../../../design/'
assert_exists_and_trackable apps/clinic-web/src/assets/care-formats/consultation.png
assert_exists_and_trackable apps/clinic-web/src/assets/care-formats/residential.png
assert_exists_and_trackable apps/clinic-web/src/assets/care-formats/home-visit.png
assert_not_contains ops/ansible/playbook.yml 'n8n_encryption_key | default'
assert_contains ops/ansible/playbook.yml 'TELEGRAM_ALLOWED_CHAT_IDS'
assert_contains ops/ansible/playbook.yml 'stage_basic_auth_password | default'
assert_contains ops/ansible/tasks/08_healthcheck.yml 'status_code: 401'
assert_contains ops/ansible/tasks/08_healthcheck.yml 'status_code: 308'
assert_contains ops/ansible/tasks/08_healthcheck.yml 'status_code: 400'
assert_contains ops/ansible/tasks/08_healthcheck.yml 'https://www.{{ domain_name }}'
assert_contains scripts/ci/check_clinic_stage.sh 'deliberately-invalid-stage-password'
assert_contains ops/ansible/tasks/08_healthcheck.yml "'nofollow' not in"
assert_contains ops/ansible/tasks/04_environment.yml "src: '{{ playbook_dir }}/../scripts/{{ item }}'"
assert_contains ops/ansible/tasks/04_environment.yml "dest: '{{ project_dir }}/scripts/{{ item }}'"
assert_contains ops/ansible/templates/monitor.cron.j2 '{{ project_dir }}/scripts/monitor.sh'
assert_contains ops/scripts/monitor.sh 'SCRIPT_DIR/../.env'
assert_contains ops/scripts/monitor.sh 'vcard-clinic-web'
assert_contains ops/scripts/monitor.sh 'vcard-proxy'
assert_contains ops/scripts/monitor.sh 'docker inspect --format'
assert_contains ops/scripts/monitor.sh 'http://localhost:5678/api/health'
assert_not_contains ops/scripts/monitor.sh 'vcard-web'
assert_contains ops/scripts/daily_report.sh 'SCRIPT_DIR/../.env'
assert_not_contains ops/scripts/daily_report.sh 'No critical issues detected in the last 24h'
assert_contains ops/ansible/playbook.yml 'Public smoke checks: inspect workflow step status; response bodies and credentials are not recorded.'
assert_not_contains ops/ansible/playbook.yml 'docker logs'
assert_not_contains ops/ansible/playbook.yml 'http://{{ vps_ip }}/api/health'
assert_contains .github/workflows/deploy.yml 'https://${{ env.STAGING_DOMAIN_NAME }}'
assert_contains .github/workflows/deploy.yml 'DOMAIN_NAME: ${{ env.STAGING_DOMAIN_NAME }}'
assert_contains .github/workflows/deploy.yml 'STAGING_DOMAIN_NAME: staging.havenhub.com.ua'
assert_contains .github/workflows/deploy.yml 'CLINIC_CANONICAL_ORIGIN=https://havenhub.com.ua'
assert_not_contains .github/workflows/deploy.yml 'TELEGRAM_BOT_TOKEN: ${{ secrets.'
assert_contains .github/workflows/promote-production.yml 'workflow_dispatch:'
assert_contains .github/workflows/promote-production.yml 'havenhub-production-v1'
assert_contains .github/workflows/promote-production.yml 'DOMAIN_NAME: havenhub.com.ua'
assert_not_contains .github/workflows/promote-production.yml 'run: bash scripts/ci/check_clinic_production.sh'
assert_contains .github/workflows/deploy.yml 'CADDY_IMAGE_REF: docker.io/library/caddy:2-alpine@sha256:'
assert_contains .github/workflows/deploy.yml "$CADDY_IMAGE_REF"
assert_contains .github/workflows/deploy.yml 'caddy hash-password --plaintext "$STAGE_BASIC_AUTH_PASSWORD"'
assert_contains .github/workflows/deploy.yml 'STAGE_BASIC_AUTH_PASSWORD: ${{ secrets.STAGE_BASIC_AUTH_PASSWORD }}'
assert_contains .github/workflows/deploy.yml 'run: bash scripts/ci/check_clinic_stage.sh'
assert_not_contains .github/workflows/deploy.yml 'docker logs candidate-api'
assert_not_contains .github/workflows/deploy.yml 'ssh -vvv'
assert_contains .github/workflows/rollback.yml 'https://${{ env.DOMAIN_NAME }}'
assert_contains .github/workflows/rollback.yml 'DOMAIN_NAME: havenhub.com.ua'
assert_contains .github/workflows/rollback.yml 'CADDY_IMAGE_REF: docker.io/library/caddy:2-alpine@sha256:'
assert_contains .github/workflows/rollback.yml "$CADDY_IMAGE_REF"
assert_contains .github/workflows/rollback.yml 'STAGE_BASIC_AUTH_PASSWORD: ${{ secrets.STAGE_BASIC_AUTH_PASSWORD }}'
assert_not_contains .github/workflows/rollback.yml 'run: bash scripts/ci/check_clinic_production.sh'
assert_contains ops/ansible/playbook.yml 'scripts/ci/check_clinic_production.sh'
assert_contains ops/ansible/playbook.yml 'delegate_to: localhost'
assert_contains ops/ansible/playbook.yml 'public_production_smoke.rc == 0'
assert_contains ops/ansible/playbook.yml 'Public production smoke failed; the previous Caddy configuration will be restored.'

healthcheck_line=$(grep -n -m 1 -F 'include_tasks: tasks/08_healthcheck.yml' ops/ansible/playbook.yml | cut -d: -f1)
smoke_line=$(grep -n -m 1 -F 'scripts/ci/check_clinic_production.sh' ops/ansible/playbook.yml | cut -d: -f1)
cutover_line=$(grep -n -m 1 -F 'dest: '\''{{ project_dir }}/releases/domain-cutover.json'\''' ops/ansible/playbook.yml | cut -d: -f1)
if [[ -n "$healthcheck_line" && -n "$smoke_line" && -n "$cutover_line" ]] && (( smoke_line <= healthcheck_line || smoke_line >= cutover_line )); then
  echo 'FAIL: public production smoke must run after healthchecks and before cutover is recorded' >&2
  failures=$((failures + 1))
fi
assert_contains scripts/ci/validate_release_manifest.py "havenhub-production-v1"
assert_contains scripts/ci/validate_staging_release_manifest.py 'staging_clinic_web_image_ref'
assert_contains ops/ansible/tasks/staging_caddy.yml 'compose-staging_api_data'
assert_contains ops/ansible/tasks/production_caddy.yml 'production DNS addresses'
assert_contains ops/ansible/tasks/restore_previous_caddy.yml 'Caddyfile'
assert_not_contains .github/workflows/rollback.yml 'docker logs'
assert_contains Makefile 'check-stage-auth'
assert_contains Makefile 'STAGE_BASIC_AUTH_PASSWORD'
assert_contains Makefile 'Legacy VPS setup helper is disabled for the authenticated HTTPS stage.'
assert_contains .github/workflows/deploy.yml 'github.event.workflow_run.head_repository.id == github.event.workflow_run.repository.id'
assert_contains .github/workflows/deploy.yml "github.event.workflow_run.head_branch == 'main'"
assert_contains .github/workflows/deploy.yml 'ref: ${{ github.event.workflow_run.head_sha }}'
assert_contains .github/workflows/deploy.yml 'api_image_ref'
assert_contains .github/workflows/deploy.yml 'clinic_web_image_ref'
assert_contains .github/workflows/deploy.yml 'run: bash scripts/ci/check_release_head.sh'
assert_contains scripts/ci/check_release_head.sh 'git ls-remote'
assert_contains scripts/ci/check_release_head.sh 'deployment_result=superseded'
assert_contains .github/workflows/deploy.yml 'release.json'
assert_contains .github/workflows/deploy.yml 'platforms: linux/amd64'
assert_contains .github/workflows/deploy.yml 'docker network create --internal candidate-network'
assert_contains .github/workflows/deploy.yml '--network candidate-network'
assert_contains .github/workflows/deploy.yml '--network-alias api'
assert_contains .github/workflows/deploy.yml 'docker push "$api_tag"'
assert_contains .github/workflows/deploy.yml 'api_image_ref=ghcr.io/$repo/vcard-api@$api_digest'
assert_not_contains .github/workflows/deploy.yml 'actions/upload-artifact@'
assert_contains .github/workflows/deploy.yml 'mv -f -- "$pending" "$target"'
assert_contains ops/ansible/tasks/05_deployment.yml 'chmod 700 "$docker_config"'
assert_contains ops/ansible/tasks/05_deployment.yml "trap 'rm -rf"
assert_contains ops/ansible/tasks/05_deployment.yml 'org.opencontainers.image.revision'
assert_contains apps/clinic-web/Dockerfile 'org.opencontainers.image.revision'
assert_contains ops/docker/api/Dockerfile 'org.opencontainers.image.revision'
assert_contains ops/docker/compose/docker-compose.yml 'API_IMAGE_REF'
assert_contains ops/docker/compose/docker-compose.yml 'CLINIC_WEB_IMAGE_REF'
assert_contains ops/ansible/tasks/03_project.yml "version: '{{ release_sha }}'"
assert_not_contains ops/ansible/tasks/03_project.yml 'version: main'
assert_contains ops/ansible/tasks/05_deployment.yml 'api_image_ref'
assert_contains ops/ansible/tasks/05_deployment.yml 'clinic_web_image_ref'
assert_not_contains ops/ansible/playbook.yml 'x-access-token:'
assert_contains .github/workflows/deploy.yml 'pip install ansible-core==2.21.5'
assert_contains .github/workflows/deploy.yml 'python3 scripts/ci/check_stage_dns.py'
assert_contains .github/workflows/deploy.yml 'python3 scripts/ci/extract_vps_ipv6.py'
assert_not_contains .github/workflows/deploy.yml 'address["local"]'
assert_contains .github/workflows/rollback.yml 'python-version: '\''3.12'\'''
assert_contains .github/workflows/rollback.yml 'pip install ansible-core==2.21.5'
assert_contains .github/workflows/rollback.yml 'python3 scripts/ci/extract_vps_ipv6.py'
assert_not_contains .github/workflows/rollback.yml 'address["local"]'
assert_not_contains .github/workflows/deploy.yml 'systemctl is-active docker'
assert_contains ops/ansible/tasks/01_preflight_system.yml 'docker info'
assert_contains ops/ansible/tasks/01_preflight_system.yml 'docker compose version'
assert_not_contains ops/ansible/tasks/01_preflight_system.yml 'docker>=6.0.0'
assert_contains ops/ansible/tasks/05_deployment.yml 'owner: '\''{{ api_runtime_uid }}'\'''
assert_contains ops/ansible/tasks/05_deployment.yml 'group: '\''{{ api_runtime_gid }}'\'''
assert_contains ops/ansible/tasks/06_permissions.yml 'Destination "/app/data"'
assert_not_contains ops/ansible/tasks/06_permissions.yml 'data_dir'

if (( failures > 0 )); then
  exit 1
fi

echo 'PASS: clinic VPS protected HTTPS staging contract'
