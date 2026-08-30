#!/usr/bin/env bash
set -euo pipefail

readonly VERSION='8.30.1'
readonly MODE="${1:-dir}"
container_source="$PWD"

case "$MODE" in
  dir)
    snapshot_dir=$(mktemp -d './.secret-scan.XXXXXX')
    trap 'rm -rf -- "$snapshot_dir"' EXIT
    container_source="$snapshot_dir"

    while IFS= read -r -d '' path; do
      [[ -f "$path" ]] || continue
      mkdir -p "$snapshot_dir/$(dirname "$path")"
      cp "$path" "$snapshot_dir/$path"
    done < <(git ls-files -co --exclude-standard -z)

    readonly LOCAL_ARGS=(dir --redact --no-banner --no-color "$snapshot_dir")
    readonly CONTAINER_ARGS=(dir --redact --no-banner --no-color /repo)
    ;;
  history)
    readonly LOCAL_ARGS=(git --redact --no-banner --no-color .)
    readonly CONTAINER_ARGS=(git --redact --no-banner --no-color /repo)
    ;;
  *)
    echo "Usage: $0 [dir|history]" >&2
    exit 2
    ;;
esac

if command -v gitleaks >/dev/null 2>&1; then
  installed_version=$(gitleaks version 2>/dev/null || true)
  if [[ "$installed_version" != "$VERSION" ]]; then
    echo "gitleaks $VERSION is required; found ${installed_version:-unknown}" >&2
    exit 2
  fi
  gitleaks "${LOCAL_ARGS[@]}"
  exit 0
fi

docker run --rm \
  -v "$container_source:/repo:ro" \
  "ghcr.io/gitleaks/gitleaks:v$VERSION" \
  "${CONTAINER_ARGS[@]}"
