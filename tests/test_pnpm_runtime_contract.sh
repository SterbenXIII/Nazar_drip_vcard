#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

package_manager=$(node -p "require('$repo_root/package.json').packageManager")
if [[ "$package_manager" != "pnpm@10.29.1" ]]; then
  printf 'FAIL: package.json must pin pnpm@10.29.1, got %s\n' "$package_manager" >&2
  exit 1
fi

if rg -q 'packageManagerDependencies|pnpm@12\.5\.1' "$repo_root/pnpm-lock.yaml"; then
  echo 'FAIL: pnpm-lock.yaml contains pnpm 12 migration metadata' >&2
  exit 1
fi

if rg -q 'set this to true or false' "$repo_root/pnpm-workspace.yaml"; then
  echo 'FAIL: pnpm-workspace.yaml contains unresolved allowBuilds placeholders' >&2
  exit 1
fi

for dockerfile in "$repo_root/ops/docker/api/Dockerfile" "$repo_root/ops/docker/web/Dockerfile"; do
  if ! rg -q 'corepack prepare pnpm@10\.29\.1 --activate' "$dockerfile"; then
    echo "FAIL: $dockerfile does not pin pnpm@10.29.1" >&2
    exit 1
  fi
done

echo 'pnpm runtime contract: PASS'
