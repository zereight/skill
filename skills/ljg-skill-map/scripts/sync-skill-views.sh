#!/usr/bin/env bash
# SSOT: ~/.agents/skills — mirror the same skill names into Cursor and Pi via symlinks.
set -euo pipefail

AGENTS="${AGENTS_SKILLS_DIR:-$HOME/.agents/skills}"
CURSOR="${CURSOR_SKILLS_DIR:-$HOME/.cursor/skills}"
PI="${PI_SKILLS_DIR:-$HOME/.pi/agent/skills}"
CLAUDE="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
CODEX="${CODEX_SKILLS_DIR:-$HOME/.codex/skills}"
CURSOR_REL="../../.agents/skills"
PI_REL="../../../.agents/skills"
CLAUDE_REL="../../.agents/skills"
CODEX_REL="../../.agents/skills"

SYNC_CURSOR=1
SYNC_PI=1
SYNC_CLAUDE=1
SYNC_CODEX=1
INGEST_PI=0
INGEST_CURSOR_TEAM_KIT=0
UPDATE_CURSOR_TEAM_KIT=0

usage() {
  cat <<'EOF'
Usage: sync-skill-views.sh [options]

  SSOT is ~/.agents/skills. This script mirrors skill names into view directories.

Options:
  --ingest-pi                  Copy Pi-only real skill dirs into agents before syncing (skip if agents exists)
  --ingest-cursor-team-kit     Copy Cursor Team Kit plugin skills into agents (skip if agents exists)
  --update-cursor-team-kit     With ingest flags: overwrite agents copy from plugin source
  --cursor-only                Sync only ~/.cursor/skills
  --pi-only                    Sync only ~/.pi/agent/skills
  --claude-only                Sync only ~/.claude/skills
  --codex-only                 Sync only ~/.codex/skills
  -h, --help                   Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ingest-pi) INGEST_PI=1 ;;
    --ingest-cursor-team-kit) INGEST_CURSOR_TEAM_KIT=1 ;;
    --update-cursor-team-kit) UPDATE_CURSOR_TEAM_KIT=1 ;;
    --cursor-only) SYNC_PI=0; SYNC_CLAUDE=0; SYNC_CODEX=0 ;;
    --pi-only) SYNC_CURSOR=0; SYNC_CLAUDE=0; SYNC_CODEX=0 ;;
    --claude-only) SYNC_CURSOR=0; SYNC_PI=0; SYNC_CODEX=0 ;;
    --codex-only) SYNC_CURSOR=0; SYNC_PI=0; SYNC_CLAUDE=0 ;;
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
  [[ "$name" == ".disabled-duplicates" ]] && return 0
  return 1
}

ingest_pi_only_skills() {
  local ingested=0 skipped=0
  echo "== ingest Pi-only skills into agents =="
  mkdir -p "$AGENTS"
  for src in "$PI"/*; do
    [[ -e "$src" ]] || continue
    local name
    name=$(basename "$src")
    should_skip_agents_name "$name" && continue
    [[ -f "$src/SKILL.md" ]] || continue
    [[ -L "$src" ]] && continue
    if is_agents_skill "$name"; then
      skipped=$((skipped + 1))
      continue
    fi
    rsync -a "$src/" "$AGENTS/$name/"
    ingested=$((ingested + 1))
    echo "  ingested: $name"
  done
  echo "  ingest summary: ingested=$ingested skipped=$skipped"
}

resolve_cursor_team_kit_skills_dir() {
  local root="$HOME/.cursor/plugins/cache/cursor-public/cursor-team-kit"
  local candidates=()
  local d skills_dir
  if [[ ! -d "$root" ]]; then
    echo "error: cursor-team-kit cache missing: $root" >&2
    return 1
  fi
  for d in "$root"/*; do
    [[ -d "$d" ]] || continue
    skills_dir="$d/skills"
    [[ -d "$skills_dir" ]] || continue
    candidates+=("$skills_dir")
  done
  if [[ ${#candidates[@]} -eq 0 ]]; then
    echo "error: no cursor-team-kit */skills directory under $root" >&2
    return 1
  fi
  if [[ ${#candidates[@]} -gt 1 ]]; then
    local latest=""
    local latest_mtime=0
    local mtime
    for skills_dir in "${candidates[@]}"; do
      mtime=$(stat -f "%m" "$skills_dir" 2>/dev/null || stat -c "%Y" "$skills_dir" 2>/dev/null || echo 0)
      if [[ "$mtime" -gt "$latest_mtime" ]]; then
        latest_mtime=$mtime
        latest="$skills_dir"
      fi
    done
    echo "$latest"
    return 0
  fi
  echo "${candidates[0]}"
}

ingest_cursor_team_kit_skills() {
  local skills_dir
  skills_dir=$(resolve_cursor_team_kit_skills_dir) || return 1
  local ingested=0 skipped=0 updated=0
  echo "== ingest Cursor Team Kit into agents =="
  echo "  source: $skills_dir"
  mkdir -p "$AGENTS"
  for src in "$skills_dir"/*; do
    [[ -e "$src" ]] || continue
    local name
    name=$(basename "$src")
    should_skip_agents_name "$name" && continue
    [[ -f "$src/SKILL.md" ]] || continue
    if is_agents_skill "$name"; then
      if [[ "$UPDATE_CURSOR_TEAM_KIT" -eq 1 ]]; then
        rsync -a "$src/" "$AGENTS/$name/"
        updated=$((updated + 1))
        echo "  updated: $name"
      else
        skipped=$((skipped + 1))
      fi
      continue
    fi
    rsync -a "$src/" "$AGENTS/$name/"
    ingested=$((ingested + 1))
    echo "  ingested: $name"
  done
  echo "  ingest summary: ingested=$ingested updated=$updated skipped=$skipped"
}

remove_broken_in_view() {
  local view_dir="$1"
  local removed=0
  for link in "$view_dir"/*; do
    [[ -L "$link" ]] || continue
    [[ -e "$link" ]] && continue
    local name
    name=$(basename "$link")
    if rm "$link" 2>/dev/null; then
      removed=$((removed + 1))
      echo "  removed broken: $name"
    fi
  done
  echo "$removed"
}

remove_orphans_in_view() {
  local view_dir="$1"
  local removed=0
  for entry in "$view_dir"/*; do
    [[ -e "$entry" ]] || [[ -L "$entry" ]] || continue
    local name
    name=$(basename "$entry")
    should_skip_agents_name "$name" && continue
    if is_agents_skill "$name"; then
      continue
    fi
    rm -rf "$entry"
    removed=$((removed + 1))
    echo "  removed orphan (not in agents): $name"
  done
  echo "$removed"
}

sync_view() {
  local view_dir="$1"
  local rel_target="$2"
  local label="$3"

  local created=0 replaced=0 skipped=0 failed=0

  echo "== sync $label ($view_dir) =="
  mkdir -p "$view_dir"

  local removed_broken removed_orphan
  removed_broken=$(remove_broken_in_view "$view_dir")
  removed_orphan=$(remove_orphans_in_view "$view_dir")
  echo "  removed broken: $removed_broken"
  echo "  removed orphan: $removed_orphan"

  for src in "$AGENTS"/*; do
    [[ -e "$src" ]] || continue
    local name
    name=$(basename "$src")
    should_skip_agents_name "$name" && continue
    [[ -f "$src/SKILL.md" ]] || continue

    local dest="$view_dir/$name"
    local target="$rel_target/$name"

    if [[ -L "$dest" ]] && [[ "$(readlink "$dest")" == "$target" ]] && [[ -e "$dest" ]]; then
      skipped=$((skipped + 1))
      continue
    fi

    local had_dest=0
    if [[ -L "$dest" ]] || [[ -e "$dest" ]]; then
      if [[ -L "$dest" ]]; then
        rm -f "$dest"
      else
        rm -rf "$dest"
      fi
      had_dest=1
    fi

    if ln -sfn "$target" "$dest" 2>/dev/null; then
      if [[ $had_dest -eq 1 ]]; then
        replaced=$((replaced + 1))
      else
        created=$((created + 1))
      fi
    else
      echo "  warn: could not symlink $name" >&2
      failed=$((failed + 1))
    fi
  done

  # Fix counting: recreated symlinks after replace
  local total
  total=$(find "$view_dir" -maxdepth 1 -mindepth 1 2>/dev/null | wc -l | tr -d ' ')
  echo "  created/new links: $created"
  echo "  replaced (removed real dir or wrong link): $replaced"
  echo "  skipped (already correct): $skipped"
  echo "  failed: $failed"
  echo "  view total entries: $total"
}

verify_sets() {
  echo "== verify =="
  python3 <<'PY'
import os
from pathlib import Path

def skills(root: Path) -> set[str]:
    if not root.is_dir():
        return set()
    out = set()
    for p in root.iterdir():
        if not p.exists() and not p.is_symlink():
            continue
        if p.name.startswith(".") or p.name == ".disabled-duplicates":
            continue
        if (p / "SKILL.md").is_file():
            out.add(p.name)
    return out

home = Path.home()
agents = skills(home / ".agents/skills")
cursor = skills(home / ".cursor/skills")
pi = skills(home / ".pi/agent/skills")
claude = skills(home / ".claude/skills")
codex = skills(home / ".codex/skills")

def check_view(name: str, root: Path, rel: str) -> tuple[int, int]:
    bad_link = 0
    not_symlink = 0
    for p in root.iterdir():
        if p.name not in agents:
            continue
        if not p.is_symlink():
            not_symlink += 1
            continue
        if os.readlink(p) != f"{rel}/{p.name}":
            bad_link += 1
    return bad_link, not_symlink

cb, cr = check_view("cursor", home / ".cursor/skills", "../../.agents/skills")
pb, pr = check_view("pi", home / ".pi/agent/skills", "../../../.agents/skills")
clb, clr = check_view("claude", home / ".claude/skills", "../../.agents/skills")
cob, cor = check_view("codex", home / ".codex/skills", "../../.agents/skills")

broken = []
for label, root in [
    ("agents", home / ".agents/skills"),
    ("cursor", home / ".cursor/skills"),
    ("pi", home / ".pi/agent/skills"),
    ("claude", home / ".claude/skills"),
    ("codex", home / ".codex/skills"),
]:
    for p in root.iterdir():
        if p.is_symlink() and not p.exists():
            broken.append(f"{label}:{p.name}")

print(f"agents={len(agents)} cursor={len(cursor)} pi={len(pi)} claude={len(claude)} codex={len(codex)}")
print(f"agents==cursor: {agents == cursor}")
print(f"agents==pi: {agents == pi}")
print(f"agents==claude: {agents == claude}")
print(f"agents==codex: {agents == codex}")
print(f"cursor wrong/missing symlinks: {cb} not_symlink={cr}")
print(f"pi wrong/missing symlinks: {pb} not_symlink={pr}")
print(f"claude wrong/missing symlinks: {clb} not_symlink={clr}")
print(f"codex wrong/missing symlinks: {cob} not_symlink={cor}")
print(f"broken symlinks: {len(broken)}")
if broken:
    for b in broken[:20]:
        print(f"  {b}")
    raise SystemExit(1)
if agents != cursor or agents != pi or agents != claude or agents != codex:
    only_a = sorted(agents - cursor - pi - claude - codex)[:10]
    only_c = sorted(cursor - agents)[:10]
    only_p = sorted(pi - agents)[:10]
    only_cl = sorted(claude - agents)[:10]
    only_co = sorted(codex - agents)[:10]
    if only_a:
        print("only agents sample:", only_a)
    if only_c:
        print("only cursor sample:", only_c)
    if only_p:
        print("only pi sample:", only_p)
    if only_cl:
        print("only claude sample:", only_cl)
    if only_co:
        print("only codex sample:", only_co)
    raise SystemExit(1)
if cb or cr or pb or pr or clb or clr or cob or cor:
    raise SystemExit(1)
print("verify OK")
PY
}

main() {
  if [[ ! -d "$AGENTS" ]]; then
    echo "error: agents skills dir missing: $AGENTS" >&2
    exit 1
  fi

  if [[ "$INGEST_PI" -eq 1 ]]; then
    ingest_pi_only_skills
  fi

  if [[ "$INGEST_CURSOR_TEAM_KIT" -eq 1 ]]; then
    ingest_cursor_team_kit_skills
  fi

  if [[ "$SYNC_CURSOR" -eq 1 ]]; then
    sync_view "$CURSOR" "$CURSOR_REL" "cursor"
  fi

  if [[ "$SYNC_PI" -eq 1 ]]; then
    sync_view "$PI" "$PI_REL" "pi"
  fi

  if [[ "$SYNC_CLAUDE" -eq 1 ]]; then
    sync_view "$CLAUDE" "$CLAUDE_REL" "claude"
  fi

  if [[ "$SYNC_CODEX" -eq 1 ]]; then
    sync_view "$CODEX" "$CODEX_REL" "codex"
  fi

  verify_sets
}

main
