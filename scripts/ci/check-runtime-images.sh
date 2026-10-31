#!/usr/bin/env bash
set -euo pipefail

suffix="precommit-$(date +%s)-$$"
api_image="vcard-api:$suffix"
clinic_image="vcard-clinic-web:$suffix"
container="clinic-smoke-$suffix"
response_file=$(mktemp)
readonly suffix api_image clinic_image container response_file

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker image rm "$api_image" "$clinic_image" >/dev/null 2>&1 || true
  rm -f "$response_file"
}
trap cleanup EXIT

hadolint ops/docker/api/Dockerfile
hadolint apps/clinic-web/Dockerfile
hadolint ops/docker/web/Dockerfile
docker build --pull --no-cache --target runtime --tag "$api_image" -f ops/docker/api/Dockerfile .
docker build --pull --no-cache --target runtime --tag "$clinic_image" -f apps/clinic-web/Dockerfile .

docker run --rm --workdir /app/apps/api --entrypoint node "$api_image" \
  --input-type=commonjs -e \
  "const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.close()"

docker run -d --name "$container" --add-host=api:127.0.0.1 \
  -p 127.0.0.1::8080 "$clinic_image" >/dev/null

host_port=$(docker port "$container" 8080/tcp | sed -E 's/.*:([0-9]+)$/\1/')
for attempt in $(seq 1 20); do
  if curl --silent --fail "http://127.0.0.1:$host_port/" >"$response_file"; then
    break
  fi
  if [ "$attempt" = 20 ]; then
    echo 'Clinic container did not become healthy.' >&2
    exit 1
  fi
  sleep 1
done

test -s "$response_file"
status=$(curl --silent --output /dev/null --write-out '%{http_code}' \
  "http://127.0.0.1:$host_port/")
test "$status" = 200
grep -Eiq 'noindex, *nofollow' "$response_file"
status=$(curl --silent --output /dev/null --write-out '%{http_code}' \
  "http://127.0.0.1:$host_port/not-a-real-route")
test "$status" = 404
