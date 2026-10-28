#!/usr/bin/env bash
set -euo pipefail

LAB_ROOT=/opt/clinic-cd-lab

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

expect_playbook_failure() {
  local name="$1" log_path="$2" expected_pattern="$3"
  shift 3
  if "$@" >"$log_path" 2>&1; then
    fail "$name unexpectedly succeeded"
  fi
  if ! grep -Eqi 'failed=1|FAILED|fatal:' "$log_path"; then
    tail -n 60 "$log_path" >&2
    fail "$name failed without an Ansible task failure"
  fi
  if ! grep -Eqi "$expected_pattern" "$log_path"; then
    tail -n 60 "$log_path" >&2
    fail "$name failed for an unexpected reason"
  fi
  echo "PASS: $name refused before service recreation."
}

archive_source() {
  local repo_root="$1" archive_path="$2"
  python3 - "$repo_root" "$archive_path" <<'PY'
import os
import subprocess
import sys
import tarfile
from pathlib import Path

root = Path(sys.argv[1])
archive_path = Path(sys.argv[2])
paths = subprocess.check_output(
    ['git', '-C', str(root), 'ls-files', '-z', '--cached', '--others', '--exclude-standard']
).split(b'\0')
excluded_dirs = {
    '.git', '.superpowers', '.codex', '.omx', '__pycache__', 'graphify-out', 'node_modules',
    'dist', 'coverage', 'test-results', 'playwright-report', '.playwright-cli',
}
excluded_prefixes = {
    'apps/clinic-web/output', 'apps/web/.lighthouseci', 'ops/certs', 'data',
    'backups', '.playwright-cli',
}
excluded_files = {
    'apps/api/allowed_chats.json', 'ops/ansible/vars/secrets.yml',
}

def include(name: str) -> bool:
    parts = Path(name).parts
    if name in excluded_files or any(part in excluded_dirs for part in parts):
        return False
    if any(name == prefix or name.startswith(prefix + '/') for prefix in excluded_prefixes):
        return False
    if name.startswith(('apps/api/data/', 'apps/api/src/tests/fixtures/private/')):
        return False
    if name == '.env.example':
        return True
    if any(part.startswith('.env') for part in parts):
        return False
    suffix = Path(name).suffix.lower()
    if suffix in {'.db', '.sqlite', '.sqlite3', '.pem', '.key', '.p12', '.pfx', '.session', '.pyc', '.pyo'}:
        return False
    return True

with tarfile.open(archive_path, 'w:gz') as archive:
    for raw in paths:
        if not raw:
            continue
        name = os.fsdecode(raw)
        path = root / name
        if include(name) and path.is_file() and not path.is_symlink():
            archive.add(path, arcname=name, recursive=False)
PY
}

record_manifest() {
  local release_sha="$1" api_image_ref="$2" clinic_image_ref="$3"
  python3 - "$LAB_ROOT/project" "$release_sha" "$api_image_ref" "$clinic_image_ref" <<'PY'
import json
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
release_sha, api_ref, clinic_ref = sys.argv[2:]
manifest = {
    'manifest_version': 'havenhub-production-v1',
    'release_sha': release_sha,
    'api_image_ref': api_ref,
    'clinic_web_image_ref': clinic_ref,
    'ci_run_id': '10001',
    'deploy_run_id': '20001',
}
payload = json.dumps(manifest, sort_keys=True, separators=(',', ':')) + '\n'
for target in (root / 'releases' / f'{release_sha}.json', root / 'releases' / 'current.json'):
    temporary = target.with_name(f'.{target.name}.lab-pending')
    temporary.write_text(payload, encoding='utf-8')
    temporary.chmod(0o600)
    os.replace(temporary, target)
(root / 'releases' / 'reconciliation-required.json').unlink(missing_ok=True)
PY
}

write_vars() {
  local release_sha="$1" api_ref="$2" clinic_ref="$3" rollback="$4" resume_reconciliation="${5:-false}"
  python3 - "$LAB_ROOT/ansible-vars.json" "$release_sha" "$api_ref" "$clinic_ref" "$rollback" "$resume_reconciliation" <<'PY'
import json
import sys
from pathlib import Path

target = Path(sys.argv[1])
release_sha, api_ref, clinic_ref, rollback, resume_reconciliation = sys.argv[2:]
values = {
    'domain_name': 'localhost',
    'deploy_path': '/opt/clinic-cd-lab/project',
    'project_dir': '/opt/clinic-cd-lab/project',
    'backup_dir': '/opt/clinic-cd-lab/project/backups',
    'repository_url': 'file:///opt/clinic-cd-lab/origin.git',
    'github_repository_path': '',
    'github_repository_url': '',
    'release_sha': release_sha,
    'api_image_ref': api_ref,
    'clinic_web_image_ref': clinic_ref,
    'rollback_mode': rollback == 'true',
    'resume_reconciliation': resume_reconciliation == 'true',
    'lab_mode': True,
}
target.write_text(json.dumps(values), encoding='utf-8')
target.chmod(0o600)
PY
}

run_deploy() {
  local release_sha="$1" api_ref="$2" clinic_ref="$3" rollback="$4" log_path="$5" resume_reconciliation="${6:-false}"
  write_vars "$release_sha" "$api_ref" "$clinic_ref" "$rollback" "$resume_reconciliation"
  (
    cd "$LAB_ROOT/source/ops/ansible"
    /opt/clinic-cd-lab/venv/bin/ansible-playbook \
      -i "$LAB_ROOT/inventory.ini" playbook.yml \
      --extra-vars "@$LAB_ROOT/ansible-vars.json"
  ) >"$log_path" 2>&1 || {
    tail -n 80 "$log_path" >&2
    return 1
  }
  tail -n 5 "$log_path"
}

build_release_images() {
  local source_dir="$1" release_sha="$2" include_api="$3"
  local build_log="$LAB_ROOT/docker-build.log"
  if [[ "$include_api" == 'true' ]]; then
    docker build --pull --build-arg "VCS_REF=$release_sha" --build-arg DOMAIN_NAME=localhost \
      --file "$source_dir/ops/docker/api/Dockerfile" --target runtime \
      --tag "local/vcard-api:$release_sha" "$source_dir" >"$build_log" 2>&1 || {
      tail -n 80 "$build_log" >&2
      return 1
    }
  fi
  docker build --pull --build-arg "VCS_REF=$release_sha" \
    --file "$source_dir/apps/clinic-web/Dockerfile" \
    --tag "local/vcard-clinic-web:$release_sha" "$source_dir" >"$build_log" 2>&1 || {
      tail -n 80 "$build_log" >&2
      return 1
    }
  echo "PASS: built requested images for $release_sha."
}

running_container_ids() {
  docker inspect --format '{{.Id}}' vcard-api vcard-clinic-web vcard-proxy | sort
}

assert_release_running() {
  local release_sha="$1" api_ref="local/vcard-api:$1" clinic_ref="local/vcard-clinic-web:$1"
  test "$(git -C "$LAB_ROOT/project" rev-parse HEAD)" = "$release_sha"
  for spec in "vcard-api:$api_ref" "vcard-clinic-web:$clinic_ref"; do
    local name=${spec%%:*} ref=${spec#*:}
    test "$(docker inspect --format '{{.Config.Image}}' "$name")" = "$ref"
    local image_id
    image_id=$(docker inspect --format '{{.Image}}' "$name")
    test "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_id")" = "$release_sha"
  done
}

check_control_row() {
  docker exec --workdir /app/apps/api vcard-api node -e '
    const Database = require("better-sqlite3")
    const db = new Database("/app/data/leads.db", { readonly: true, fileMustExist: true })
    const row = db.prepare("SELECT name FROM leads WHERE id = ?").get(901)
    if (row?.name !== "synthetic clinic CD persistence row") process.exit(1)
    if (db.pragma("integrity_check", { simple: true }) !== "ok") process.exit(1)
    db.close()
  '
}

run_lab_inside() {
  local os_release
  # shellcheck disable=SC1091
  os_release=$(source /etc/os-release && printf '%s %s' "$ID" "$VERSION_ID")
  [[ "$os_release" == 'ubuntu 26.04' ]] || fail "expected Ubuntu 26.04, got $os_release"
  if command -v docker >/dev/null 2>&1; then
    fail 'fresh Ubuntu VM already has Docker; bootstrap test would not be meaningful'
  fi
  echo 'PASS: Ubuntu 26.04 VM starts without Docker.'

  mkdir -p "$LAB_ROOT/source"
  tar -xzf /home/ubuntu/clinic-cd-source.tar.gz -C "$LAB_ROOT/source"
  install -m 0755 /home/ubuntu/ubuntu2604_lab.sh "$LAB_ROOT/ubuntu2604_lab.sh"

  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl git gnupg python3-pip python3-venv
  python3 -m venv "$LAB_ROOT/venv"
  "$LAB_ROOT/venv/bin/pip" install --quiet ansible-core==2.21.5
  "$LAB_ROOT/venv/bin/ansible-galaxy" collection install \
    -r "$LAB_ROOT/source/ops/ansible/requirements.yml"

  git -C "$LAB_ROOT/source" init --quiet --initial-branch=main
  git -C "$LAB_ROOT/source" config user.name 'Clinic CD Lab'
  git -C "$LAB_ROOT/source" config user.email 'clinic-cd-lab@example.invalid'
  git -C "$LAB_ROOT/source" add -A
  git -C "$LAB_ROOT/source" commit -qm 'synthetic clinic release'
  local first_sha
  first_sha=$(git -C "$LAB_ROOT/source" rev-parse HEAD)
  git clone --quiet --bare "$LAB_ROOT/source" "$LAB_ROOT/origin.git"
  git -C "$LAB_ROOT/source" remote add origin "file://$LAB_ROOT/origin.git"

  cat >"$LAB_ROOT/inventory.ini" <<'EOF'
[vps]
lab ansible_connection=local ansible_host=192.0.2.1 ansible_user=root ansible_python_interpreter=/usr/bin/python3
EOF
  cat >"$LAB_ROOT/bootstrap.yml" <<'EOF'
---
- name: Bootstrap Docker on disposable Ubuntu 26.04
  hosts: vps
  gather_facts: true
  become: false
  vars:
    project_dir: /opt/clinic-cd-lab/project
    domain_name: localhost
    node_env: production
  tasks:
    - ansible.builtin.include_tasks: /opt/clinic-cd-lab/source/ops/ansible/tasks/01_preflight_system.yml
EOF

  "$LAB_ROOT/venv/bin/ansible-playbook" \
    -i "$LAB_ROOT/inventory.ini" "$LAB_ROOT/bootstrap.yml" \
    >"$LAB_ROOT/bootstrap.log" 2>&1 || {
    tail -n 80 "$LAB_ROOT/bootstrap.log" >&2
    return 1
  }
  docker --version
  docker compose version
  echo 'PASS: Ansible installed Docker Engine and Compose from a clean VM.'

  export VPS_IP=127.0.0.1 DOMAIN_NAME=localhost DEPLOY_PATH="$LAB_ROOT/project"
  export NODE_ENV=production BACKEND_PORT=5678 ENABLED_PROVIDERS=TELEGRAM
  export TELEGRAM_BOT_TOKEN=synthetic-lab-token TELEGRAM_MASTER_ID=123456789
  export TELEGRAM_ALLOWED_CHAT_IDS=123456789 TELEGRAM_NOTIFY_IDS=123456789
  export WEBHOOK_SECRET=synthetic-lab-webhook-secret GITHUB_TOKEN='' GITHUB_ACTOR=clinic-lab
  export STAGE_BASIC_AUTH_PASSWORD='clinic-lab-only-password-2026'
  export CADDY_IMAGE_REF='docker.io/library/caddy:2-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f'
  export STAGE_BASIC_AUTH_HASH
  STAGE_BASIC_AUTH_HASH=$(docker run --rm --entrypoint sh \
    --env "STAGE_BASIC_AUTH_PASSWORD=$STAGE_BASIC_AUTH_PASSWORD" "$CADDY_IMAGE_REF" \
    -c 'caddy hash-password --plaintext "$STAGE_BASIC_AUTH_PASSWORD"')
  test -n "$STAGE_BASIC_AUTH_HASH"
  grep -q '^127\.0\.0\.1[[:space:]].*www\.localhost' /etc/hosts || \
    printf '127.0.0.1 www.localhost\n' >> /etc/hosts

  docker network create web-gateway >/dev/null
  cat >"$LAB_ROOT/clinic-stage.Caddyfile" <<'CADDY'
http://localhost, http://www.localhost {
  redir https://{host}{uri} 308
}

localhost, www.localhost {
  basic_auth {
    stage {$STAGE_BASIC_AUTH_HASH}
  }
  header X-Robots-Tag "noindex, nofollow"
  handle /robots.txt {
    respond "User-agent: *\nDisallow: /" 200
  }
  handle /api/* {
    reverse_proxy api:5678
  }
  handle {
    reverse_proxy clinic-web:8080
  }
}
CADDY
  CADDY_IMAGE_REF="$CADDY_IMAGE_REF" \
    CADDYFILE_PATH="$LAB_ROOT/clinic-stage.Caddyfile" \
    CADDY_INCLUDES_PATH="$LAB_ROOT/source/ops/docker/caddy" \
    CADDY_DOMAIN_NAME=localhost \
    STAGE_BASIC_AUTH_HASH="$STAGE_BASIC_AUTH_HASH" \
    docker compose --project-name compose \
      -f "$LAB_ROOT/source/ops/docker/compose/docker-compose.proxy.yml" up -d caddy

  build_release_images "$LAB_ROOT/source" "$first_sha" true
  run_deploy "$first_sha" "local/vcard-api:$first_sha" \
    "local/vcard-clinic-web:$first_sha" false "$LAB_ROOT/first-deploy.log"
  assert_release_running "$first_sha"
  bash "$LAB_ROOT/source/scripts/ci/check_clinic_stage.sh"
  test -f "$LAB_ROOT/project/releases/reconciliation-required.json" || \
    fail 'first deployment did not retain its reconciliation marker'
  echo 'PASS: initial deployment retained its reconciliation marker.'
  record_manifest "$first_sha" "local/vcard-api:$first_sha" \
    "local/vcard-clinic-web:$first_sha"
  echo 'PASS: synthetic release manifest recorded.'
  check_control_row >/dev/null 2>&1 && fail 'control row exists before synthetic insertion'
  echo 'PASS: SQLite started without the synthetic control row.'
  docker exec --workdir /app/apps/api vcard-api node -e '
    const fs = require("node:fs")
    const directory = fs.statSync("/app/data")
    const database = fs.statSync("/app/data/leads.db")
    console.log(`cwd=${process.cwd()} uid=${process.getuid()} data_uid=${directory.uid} data_mode=${directory.mode.toString(8)}`)
    console.log(`database_uid=${database.uid} database_mode=${database.mode.toString(8)} database_size=${database.size}`)
  '
  echo 'PASS: SQLite volume is readable by the API runtime user.'
  docker exec --workdir /app/apps/api vcard-api node -e '
    const Database = require("better-sqlite3")
    const db = new Database("/app/data/leads.db")
    db.prepare("INSERT INTO leads (id, name, phone, district, services, source, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(901, "synthetic clinic CD persistence row", "+37000000000", "lab", "lab test", "synthetic", new Date().toISOString())
    db.close()
  '
  echo 'PASS: synthetic lead inserted into SQLite.'

  local volume_name first_ids
  volume_name=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Type}} {{.Name}}{{end}}{{end}}' vcard-api)
  [[ "$volume_name" == volume\ * ]]
  volume_name=${volume_name#volume }
  first_ids=$(running_container_ids)
  run_deploy "$first_sha" "local/vcard-api:$first_sha" \
    "local/vcard-clinic-web:$first_sha" false "$LAB_ROOT/repeat-deploy.log"
  test "$(running_container_ids)" = "$first_ids"
  test "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}' vcard-api)" = "$volume_name"
  check_control_row
  record_manifest "$first_sha" "local/vcard-api:$first_sha" \
    "local/vcard-clinic-web:$first_sha"
  echo 'PASS: same-SHA deployment preserved container IDs, SQLite volume and control row.'

  printf 'synthetic update for Ubuntu lab\n' > "$LAB_ROOT/source/.clinic-cd-lab-update"
  git -C "$LAB_ROOT/source" add .clinic-cd-lab-update
  git -C "$LAB_ROOT/source" commit -qm 'synthetic clinic update'
  git -C "$LAB_ROOT/source" push --quiet origin main
  local update_sha
  update_sha=$(git -C "$LAB_ROOT/source" rev-parse HEAD)

  local stale_before stale_output stale_summary
  stale_before=$(running_container_ids)
  stale_output="$LAB_ROOT/stale.output"
  stale_summary="$LAB_ROOT/stale.summary"
  RELEASE_SHA="$first_sha" MAIN_REPOSITORY_URL="file://$LAB_ROOT/origin.git" \
    GITHUB_OUTPUT="$stale_output" GITHUB_STEP_SUMMARY="$stale_summary" \
    bash "$LAB_ROOT/source/scripts/ci/check_release_head.sh"
  grep -qx 'deployment_result=superseded' "$stale_output"
  grep -q 'No VPS mutation or Telegram notification was performed.' "$stale_summary"
  test "$(git -C "$LAB_ROOT/project" rev-parse HEAD)" = "$first_sha"
  test "$(running_container_ids)" = "$stale_before"
  echo 'PASS: stale CI SHA left the VPS checkout and running containers unchanged.'

  build_release_images "$LAB_ROOT/source" "$update_sha" false
  stale_before=$(running_container_ids)
  expect_playbook_failure 'missing candidate image' "$LAB_ROOT/missing-image.log" \
    'Read numeric API runtime UID and GID|No such image|pull access denied' \
    run_deploy "$update_sha" "local/vcard-api:$update_sha" \
      "local/vcard-clinic-web:$update_sha" false "$LAB_ROOT/missing-image-ansible.log"
  test "$(running_container_ids)" = "$stale_before"
  test "$(git -C "$LAB_ROOT/project" rev-parse HEAD)" = "$update_sha"

  printf 'blocked backup parent\n' > "$LAB_ROOT/blocked-backups"
  stale_before=$(running_container_ids)
  local backup_vars="$LAB_ROOT/blocked-backup-vars.json"
  python3 - "$backup_vars" "$update_sha" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
path.write_text(json.dumps({
    'domain_name': 'localhost',
    'deploy_path': '/opt/clinic-cd-lab/project',
    'project_dir': '/opt/clinic-cd-lab/project',
    'backup_dir': '/opt/clinic-cd-lab/blocked-backups/child',
    'repository_url': 'file:///opt/clinic-cd-lab/origin.git',
    'github_repository_path': '',
    'release_sha': sys.argv[2],
    'api_image_ref': f'local/vcard-api:{sys.argv[2]}',
    'clinic_web_image_ref': f'local/vcard-clinic-web:{sys.argv[2]}',
    'lab_mode': True,
}), encoding='utf-8')
path.chmod(0o600)
PY
  if (
    cd "$LAB_ROOT/project/ops/ansible"
    "$LAB_ROOT/venv/bin/ansible-playbook" -i "$LAB_ROOT/inventory.ini" playbook.yml \
      --extra-vars "@$backup_vars"
  ) >"$LAB_ROOT/missing-backup.log" 2>&1; then
    fail 'deployment unexpectedly succeeded with an inaccessible backup path'
  fi
  grep -Eqi 'failed=1|FAILED|fatal:' "$LAB_ROOT/missing-backup.log" || {
    tail -n 60 "$LAB_ROOT/missing-backup.log" >&2
    fail 'missing-backup deployment failed without an Ansible task failure'
  }
  grep -Fq "$LAB_ROOT/blocked-backups" "$LAB_ROOT/missing-backup.log" || {
    tail -n 60 "$LAB_ROOT/missing-backup.log" >&2
    fail 'missing-backup deployment failed for an unexpected reason'
  }
  test "$(running_container_ids)" = "$stale_before"
  rm -f "$LAB_ROOT/blocked-backups"
  echo 'PASS: inaccessible SQLite backup path blocked deployment before recreation.'

  build_release_images "$LAB_ROOT/source" "$update_sha" true
  run_deploy "$update_sha" "local/vcard-api:$update_sha" \
    "local/vcard-clinic-web:$update_sha" false "$LAB_ROOT/update-deploy.log"
  assert_release_running "$update_sha"
  bash "$LAB_ROOT/source/scripts/ci/check_clinic_stage.sh"
  test -f "$LAB_ROOT/project/releases/reconciliation-required.json"
  test "$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["release_sha"])' "$LAB_ROOT/project/releases/current.json")" = "$first_sha"
  local update_ids update_volume
  update_ids=$(running_container_ids)
  update_volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}' vcard-api)
  test "$update_volume" = "$volume_name"
  check_control_row

  local snapshot
  snapshot=$(find "$LAB_ROOT/project/backups" -maxdepth 1 -type f -name "leads-$first_sha-*.db" -print -quit)
  test -n "$snapshot"
  docker run --rm --network none --user 0:0 \
    --mount "type=bind,src=$(dirname "$snapshot"),dst=/backup,readonly" \
    --workdir /app/apps/api --env "SNAPSHOT_NAME=$(basename "$snapshot")" \
    --entrypoint node "local/vcard-api:$first_sha" -e '
      const Database = require("better-sqlite3")
      const db = new Database(`/backup/${process.env.SNAPSHOT_NAME}`, { readonly: true, fileMustExist: true })
      if (db.pragma("integrity_check", { simple: true }) !== "ok") process.exit(1)
      if (db.prepare("SELECT name FROM leads WHERE id = ?").get(901)?.name !== "synthetic clinic CD persistence row") process.exit(1)
      db.close()
    '
  echo 'PASS: pre-update SQLite backup integrity and synthetic row verified.'

  expect_playbook_failure 'unreconciled deployment marker' "$LAB_ROOT/reconciliation-block.log" \
    'A release reconciliation marker exists' \
    run_deploy "$update_sha" "local/vcard-api:$update_sha" \
      "local/vcard-clinic-web:$update_sha" false "$LAB_ROOT/reconciliation-retry.log"
  test "$(running_container_ids)" = "$update_ids"
  test "$(git -C "$LAB_ROOT/project" rev-parse HEAD)" = "$update_sha"
  echo 'PASS: post-compose/pre-manifest interruption left a reconciliation gate and did not auto-roll back.'

  expect_playbook_failure 'mismatched reconciliation candidate' "$LAB_ROOT/reconciliation-mismatch.log" \
    'reconciliation|candidate|marker' \
    run_deploy "$first_sha" "local/vcard-api:$first_sha" \
      "local/vcard-clinic-web:$first_sha" false "$LAB_ROOT/reconciliation-mismatch-retry.log" true
  test "$(running_container_ids)" = "$update_ids"

  run_deploy "$update_sha" "local/vcard-api:$update_sha" \
    "local/vcard-clinic-web:$update_sha" false "$LAB_ROOT/reconciliation-resume.log" true
  assert_release_running "$update_sha"
  echo 'PASS: matching interrupted release resumed only after marker, images, manifest, and backup validation.'

  assert_release_running "$update_sha"
  record_manifest "$update_sha" "local/vcard-api:$update_sha" \
    "local/vcard-clinic-web:$update_sha"
  test ! -e "$LAB_ROOT/project/releases/reconciliation-required.json"
  run_deploy "$first_sha" "local/vcard-api:$first_sha" \
    "local/vcard-clinic-web:$first_sha" true "$LAB_ROOT/rollback.log"
  assert_release_running "$first_sha"
  bash "$LAB_ROOT/source/scripts/ci/check_clinic_stage.sh"
  test "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}' vcard-api)" = "$volume_name"
  check_control_row
  record_manifest "$first_sha" "local/vcard-api:$first_sha" \
    "local/vcard-clinic-web:$first_sha"
  echo 'PASS: rollback restored the prior release and retained the same volume and control row.'
  echo 'PASS: Ubuntu 26.04 disposable deployment lab completed.'
}

if [[ "${1:-}" == '--inside' ]]; then
  run_lab_inside
  exit
fi

repo_root=$(git rev-parse --show-toplevel)
vm_name="clinic-cd-ubuntu2604-$$"
host_tmp=$(mktemp -d)
archive_path="$host_tmp/clinic-cd-source.tar.gz"
lab_log="${TMPDIR:-/tmp}/clinic-cd-ubuntu2604-$(date -u +%Y%m%dT%H%M%SZ).log"
vm_created=false
cleanup() {
  if [[ "$vm_created" == true ]]; then
    multipass delete --purge "$vm_name" >/dev/null 2>&1 || true
  fi
  rm -rf -- "$host_tmp"
}
trap cleanup EXIT

archive_source "$repo_root" "$archive_path"
echo "Starting disposable Ubuntu 26.04 instance; log: $lab_log"
multipass launch 26.04 --name "$vm_name" --cpus 4 --memory 6G --disk 32G >/dev/null
vm_created=true
multipass transfer "$archive_path" "$vm_name:/home/ubuntu/clinic-cd-source.tar.gz"
multipass transfer "${BASH_SOURCE[0]}" "$vm_name:/home/ubuntu/ubuntu2604_lab.sh"
if ! multipass exec "$vm_name" -- sudo bash /home/ubuntu/ubuntu2604_lab.sh --inside \
  2>&1 | tee "$lab_log"; then
  echo "Ubuntu 26.04 lab failed; retained output: $lab_log" >&2
  exit 1
fi
echo "Ubuntu 26.04 lab log: $lab_log"
