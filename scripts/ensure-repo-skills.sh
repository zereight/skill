#!/usr/bin/env bash
# Canonical workflow after adding or changing a skill under <repo>/.agents/skills/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage: ensure-repo-skills.sh

Sync repo skill views, link global ~/.agents/skills SSOT, verify Pi registration.

Run from the skill repo root after editing .agents/skills/<name>/.
Restart Pi when the script prints verify OK.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

bash "$SCRIPT_DIR/sync-repo-skill-views.sh" --no-verify
bash "$SCRIPT_DIR/link-global-skills-to-ssot.sh" --no-verify
bash "$SCRIPT_DIR/verify-pi-skills-registration.sh"
