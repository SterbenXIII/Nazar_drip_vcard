#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
#  VS Code Extension Profile Manager for astro-vcard
#
#  Usage:
#    ./scripts/vscode-ext-manager.sh activate   — enable only project-essential extensions
#    ./scripts/vscode-ext-manager.sh deactivate  — re-enable all previously disabled extensions
#    ./scripts/vscode-ext-manager.sh status      — show counts (enabled vs disabled)
#    ./scripts/vscode-ext-manager.sh list        — show what will be kept vs disabled
#
#  After running "activate", restart VS Code (⌘⇧P → Reload Window).
# ──────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Extensions ESSENTIAL for astro-vcard ──────────────────────────
# These stay enabled; everything else gets disabled.
KEEP=(
  # Core editing
  "esbenp.prettier-vscode"
  "dbaeumer.vscode-eslint"
  "editorconfig.editorconfig"

  # Astro
  "astro-build.astro-vscode"

  # TypeScript
  "yoavbls.pretty-ts-errors"
  "mylesmurphy.prettify-ts"

  # Docker & DevOps
  "ms-azuretools.vscode-docker"
  "exiasr.hadolint"
  "jeff-hykin.better-dockerfile-syntax"
  "p1c2u.docker-compose"
  "ms-vscode.makefile-tools"
  "redhat.ansible"

  # Git (one visualizer + conventional commits)
  "mhutchie.git-graph"
  "vivaxy.vscode-conventional-commits"
  "codezombiech.gitignore"

  # Config file support
  "redhat.vscode-yaml"
  "tamasfe.even-better-toml"
  "dotenv.dotenv-vscode"
  "irongeek.vscode-env"

  # Shell
  "foxundermoon.shell-format"
  "timonwong.shellcheck"
  "rogalmic.bash-debug"

  # Markdown
  "davidanson.vscode-markdownlint"
  "yzhang.markdown-all-in-one"

  # DX
  "pkief.material-icon-theme"
  "usernamehw.errorlens"
  "christian-kohler.path-intellisense"

  # Remote / Deploy
  "ms-vscode-remote.remote-ssh"
  "ms-vscode-remote.remote-ssh-edit"
  "ms-vscode.remote-explorer"

  # n8n (used in project)
  "ivov.n8n-utils"

  # Misc project tools
  "fill-labs.dependi"
  "mechatroner.rainbow-csv"
  "ibm.output-colorizer"
  "chrmarti.regex"

  # CI/CD
  "github.vscode-github-actions"

  # Nginx (keep one)
  "ahmadalli.vscode-nginx-conf"

  # Robots.txt
  "darian-benam.vscode-robots-dot-txt-support"
)

# ── State file (tracks what we disabled so we can restore) ────────
STATE_DIR="${HOME}/.config/vscode-ext-manager"
STATE_FILE="${STATE_DIR}/astro-vcard-disabled.txt"

_ensure_state_dir() {
  mkdir -p "$STATE_DIR"
}

_is_kept() {
  local ext="$1"
  local ext_lower
  ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
  for k in "${KEEP[@]}"; do
    local k_lower
    k_lower=$(echo "$k" | tr '[:upper:]' '[:lower:]')
    if [[ "$k_lower" == "$ext_lower" ]]; then
      return 0
    fi
  done
  return 1
}

cmd_list() {
  echo "━━━ Extensions that STAY ENABLED ━━━"
  printf "  ✓ %s\n" "${KEEP[@]}"
  echo ""
  echo "━━━ Extensions that will be DISABLED ━━━"
  local all
  all=$(code --list-extensions 2>/dev/null)
  local count=0
  while IFS= read -r ext; do
    if ! _is_kept "$ext"; then
      printf "  ✗ %s\n" "$ext"
      ((count++))
    fi
  done <<< "$all"
  echo ""
  echo "Keep: ${#KEEP[@]}  |  Disable: ${count}"
}

cmd_status() {
  local total enabled disabled
  total=$(code --list-extensions 2>/dev/null | wc -l | tr -d ' ')

  if [[ -f "$STATE_FILE" ]]; then
    disabled=$(wc -l < "$STATE_FILE" | tr -d ' ')
  else
    disabled=0
  fi
  enabled=$((total))

  echo "Installed extensions:  ${total}"
  echo "Disabled by manager:   ${disabled}"

  if [[ -f "$STATE_FILE" ]]; then
    echo "State file:            ${STATE_FILE}"
  else
    echo "State file:            (not created yet — run 'activate' first)"
  fi
}

cmd_activate() {
  _ensure_state_dir
  echo "🔧 Activating astro-vcard profile..."
  echo "   Disabling extensions not in KEEP list..."

  local all disabled_count=0
  all=$(code --list-extensions 2>/dev/null)

  # Clear previous state
  > "$STATE_FILE"

  # Collect extensions to disable into array first (avoid stdin conflicts)
  local to_disable=()
  while IFS= read -r ext; do
    [[ -z "$ext" ]] && continue
    if ! _is_kept "$ext"; then
      to_disable+=("$ext")
    fi
  done <<< "$all"

  # Now disable them (no stdin conflict)
  for ext in "${to_disable[@]}"; do
    echo "   ✗ Disabling: ${ext}"
    code --disable-extension "$ext" </dev/null 2>/dev/null || true
    echo "$ext" >> "$STATE_FILE"
    ((disabled_count++))
  done

  echo ""
  echo "✅ Done! Disabled ${disabled_count} extensions."
  echo "   Kept ${#KEEP[@]} essential extensions."
  echo ""
  echo "⚠️  Restart VS Code for changes to take effect:"
  echo "   ⌘⇧P → Developer: Reload Window"
}

cmd_deactivate() {
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "No state file found. Nothing to restore."
    echo "Run 'activate' first."
    exit 1
  fi

  echo "🔧 Restoring all disabled extensions..."
  local count=0

  # Read all extensions into array first
  local to_enable=()
  while IFS= read -r ext; do
    [[ -z "$ext" ]] && continue
    to_enable+=("$ext")
  done < "$STATE_FILE"

  for ext in "${to_enable[@]}"; do
    echo "   ✓ Enabling: ${ext}"
    code --enable-extension "$ext" </dev/null 2>/dev/null || true
    ((count++))
  done

  rm -f "$STATE_FILE"

  echo ""
  echo "✅ Restored ${count} extensions."
  echo ""
  echo "⚠️  Restart VS Code for changes to take effect."
}

# ── Main ──────────────────────────────────────────────────────────
case "${1:-help}" in
  activate|on)     cmd_activate ;;
  deactivate|off)  cmd_deactivate ;;
  status|st)       cmd_status ;;
  list|ls)         cmd_list ;;
  *)
    echo "VS Code Extension Profile Manager — astro-vcard"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  activate   (on)   Disable non-essential extensions for astro-vcard"
    echo "  deactivate (off)  Re-enable all previously disabled extensions"
    echo "  status     (st)   Show extension counts"
    echo "  list       (ls)   Preview what will be kept vs disabled"
    echo ""
    echo "After activate/deactivate, restart VS Code (⌘⇧P → Reload Window)"
    ;;
esac
