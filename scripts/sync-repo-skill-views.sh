#!/usr/bin/env bash
# SSOT: <repo>/.agents/skills — mirror skill names into .cursor/skills and .pi/agent/skills via symlinks.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

AGENTS="${AGENTS_SKILLS_DIR:-$REPO_ROOT/.agents/skills}"
CURSOR="${CURSOR_SKILLS_DIR:-$REPO_ROOT/.cursor/skills}"
PI="${PI_SKILLS_DIR:-$REPO_ROOT/.pi/agent/skills}"
CURSOR_REL="../../.agents/skills"
PI_REL="../../../.agents/skills"

SYNC_CURSOR=1
SYNC_PI=1
RUN_VERIFY=1

usage() {
  cat <<'EOF'
Usage: sync-repo-skill-views.sh [options]

  SSOT is <repo>/.agents/skills. Mirrors skill names into .cursor/skills and .pi/agent/skills.

Options:
  --cursor-only   Sync only .cursor/skills
  --pi-only       Sync only .pi/agent/skills
  --no-verify     Skip verify-pi-skills-registration (used by ensure-repo-skills.sh)
  -h, --help      Show this help

After adding a repo skill, prefer: bash scripts/ensure-repo-skills.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cursor-only) SYNC_PI=0 ;;
    --pi-only) SYNC_CURSOR=0 ;;
    --no-verify) RUN_VERIFY=0 ;;
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
  shift
done

is_agents_skill() {
  local name="$1"
  [[ -f "$AGENTS/$name/SKILL.md" ]]
}

should_skip_agents_name() {
  local name="$1"
  [[ "$name" == .* ]] && return 0
  return 1
}

# pi-autocontext npm package ships its own autocontext skill; skip Pi view symlink to avoid triple registration.
should_skip_pi_name() {
  local name="$1"
  [[ "$name" == "autocontext" ]] && return 0
  return 1
}

sync_view() {
  local view_dir="$1"
  local rel_target="$2"
  local label="$3"

  echo "== sync $label ($view_dir) =="
  mkdir -p "$view_dir"

  for src in "$AGENTS"/*; do
    [[ -e "$src" ]] || continue
    local name
    name=$(basename "$src")
    should_skip_agents_name "$name" && continue
    [[ "$label" == "pi" ]] && should_skip_pi_name "$name" && continue
    [[ -f "$src/SKILL.md" ]] || continue

    local dest="$view_dir/$name"
    local target="$rel_target/$name"

    if [[ -L "$dest" ]] && [[ "$(readlink "$dest")" == "$target" ]] && [[ -e "$dest" ]]; then
      continue
    fi

    if [[ -L "$dest" ]] || [[ -e "$dest" ]]; then
      if [[ -L "$dest" ]]; then
        rm -f "$dest"
      else
        rm -rf "$dest"
      fi
    fi

    ln -sfn "$target" "$dest"
    echo "  linked: $name"
  done
}

main() {
  if [[ ! -d "$AGENTS" ]]; then
    echo "error: agents skills dir missing: $AGENTS" >&2
    exit 1
  fi

  if [[ "$SYNC_CURSOR" -eq 1 ]]; then
    sync_view "$CURSOR" "$CURSOR_REL" "cursor"
  fi

  if [[ "$SYNC_PI" -eq 1 ]]; then
    sync_view "$PI" "$PI_REL" "pi"
  fi

  echo "== verify =="
  local broken=0
  for view in "$CURSOR" "$PI"; do
    for p in "$view"/*; do
      [[ -e "$p" ]] || [[ -L "$p" ]] || continue
      if [[ -L "$p" ]] && [[ ! -e "$p" ]]; then
        echo "broken: $p" >&2
        broken=$((broken + 1))
      fi
    done
  done

  if [[ "$broken" -gt 0 ]]; then
    exit 1
  fi
  echo "symlink verify OK (repo: $REPO_ROOT)"

  if [[ "$RUN_VERIFY" -eq 1 ]]; then
    bash "$SCRIPT_DIR/verify-pi-skills-registration.sh"
  fi
}

main
