#!/usr/bin/env bash
# Backward-compatible wrapper: sync Cursor view from ~/.agents/skills SSOT.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pass_through=()
for arg in "$@"; do
  case "$arg" in
    --ingest-cursor-team-kit | --update-cursor-team-kit)
      pass_through+=("$arg")
      ;;
  esac
done

if [[ ${#pass_through[@]} -gt 0 ]]; then
  exec "$SCRIPT_DIR/sync-skill-views.sh" "$@"
fi

exec "$SCRIPT_DIR/sync-skill-views.sh" --cursor-only "$@"
