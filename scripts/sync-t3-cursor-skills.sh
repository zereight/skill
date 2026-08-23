#!/usr/bin/env bash
# Backfill T3 Code Cursor provider cache with local agent skills.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage: sync-t3-cursor-skills.sh [--dry-run] [--project-root PATH]

Scans ~/.agents/skills, ~/.cursor/skills, ~/.codex/skills (and optional
project .cursor/skills) and writes them into ~/.t3/caches/cursor.json.

After running, restart T3 Code or re-open the thread, then use:
  $skill-name   — skill picker
  /skill-name   — slash menu (also includes user skills as provider commands)

Options:
  --dry-run           Print counts only
  --project-root PATH Add repo-local .cursor/skills (repeatable)
  -h, --help          Show this help
EOF
}

dry_run=0
extra_roots=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      dry_run=1
      shift
      ;;
    --project-root)
      [[ $# -ge 2 ]] || {
        echo "error: --project-root requires a path" >&2
        exit 1
      }
      extra_roots+=("$2")
      shift 2
      ;;
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

if [[ ! -f "$HOME/.t3/caches/cursor.json" ]]; then
  echo "error: T3 Cursor cache missing at ~/.t3/caches/cursor.json" >&2
  echo "  Open T3 Code once with Cursor provider enabled, then re-run." >&2
  exit 1
fi

cmd=(python3 "$SCRIPT_DIR/sync-t3-cursor-skills.py")
if [[ "$dry_run" -eq 1 ]]; then
  cmd+=(--dry-run)
fi

if [[ -d "$REPO_ROOT/.cursor/skills" ]]; then
  extra_roots+=("$REPO_ROOT/.cursor/skills")
fi

for root in "${extra_roots[@]}"; do
  cmd+=(--project-root "$root")
done

"${cmd[@]}"

if [[ "$dry_run" -eq 0 ]]; then
  echo "Restart T3 Code (or start a new thread) so the composer reloads provider skills."
fi
