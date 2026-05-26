#!/usr/bin/env bash
# Fail if Pi settings.skills omits ~/.agents/skills (repo SSOT invisible in /skill).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SSOT="$REPO_ROOT/.agents/skills"
GLOBAL_AGENTS="${HOME}/.agents/skills"
CURSOR_VIEW="$REPO_ROOT/.cursor/skills"
PI_VIEW="$REPO_ROOT/.pi/agent/skills"
PI_SETTINGS="${HOME}/.pi/agent/settings.json"

failures=0

tooling_error() {
  echo "error [tooling]: $*" >&2
  exit 2
}

fail() {
  echo "error [$1]: $2" >&2
  echo "  fix: $3" >&2
  failures=$((failures + 1))
}

realpath_safe() {
  python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$1"
}

is_skipped_pi_name() {
  local name="$1"
  [[ "$name" == "autocontext" ]]
}

list_ssot_skills() {
  local name
  for src in "$SSOT"/*; do
    [[ -f "$src/SKILL.md" ]] || continue
    name=$(basename "$src")
    [[ "$name" == .* ]] && continue
    printf '%s\n' "$name"
  done
}

check_symlink_target() {
  local label="$1"
  local link="$2"
  local want_canonical="$3"
  local fix="$4"

  if [[ ! -L "$link" ]] || [[ ! -e "$link" ]]; then
    fail "$label" "$link missing or broken (want -> $want_canonical)" "$fix"
    return
  fi

  local got
  got="$(realpath_safe "$link")"
  if [[ "$got" != "$want_canonical" ]]; then
    fail "$label" "$link resolves to $got (want $want_canonical)" "$fix"
  fi
}

[[ -d "$SSOT" ]] || tooling_error "repo SSOT missing: $SSOT"
command -v python3 >/dev/null || tooling_error "python3 required"
[[ -f "$PI_SETTINGS" ]] || tooling_error "Pi settings missing: $PI_SETTINGS"

SSOT_NAMES=()
while IFS= read -r _name; do
  [[ -n "$_name" ]] && SSOT_NAMES+=("$_name")
done < <(list_ssot_skills)
[[ ${#SSOT_NAMES[@]} -gt 0 ]] || tooling_error "no skills under $SSOT"

for name in "${SSOT_NAMES[@]}"; do
  want="$(realpath_safe "$SSOT/$name")"
  check_symlink_target "global-symlink" "$GLOBAL_AGENTS/$name" "$want" \
    "bash scripts/link-global-skills-to-ssot.sh"
done

for name in "${SSOT_NAMES[@]}"; do
  want="$(realpath_safe "$SSOT/$name")"
  check_symlink_target "repo-view" "$CURSOR_VIEW/$name" "$want" \
    "bash scripts/sync-repo-skill-views.sh"
  is_skipped_pi_name "$name" && continue
  check_symlink_target "repo-view-pi" "$PI_VIEW/$name" "$want" \
    "bash scripts/sync-repo-skill-views.sh"
done

GLOBAL_CANON="$(realpath_safe "$GLOBAL_AGENTS")"
PI_CHECK="$(
  python3 - "$PI_SETTINGS" "$GLOBAL_CANON" <<'PY'
import json
import os
import sys

settings_path, global_agents = sys.argv[1:3]
with open(settings_path, encoding="utf-8") as f:
    data = json.load(f)

skills = data.get("skills")
if not isinstance(skills, list):
    print("MISSING_SKILLS_ARRAY")
    raise SystemExit(0)

norm = []
for entry in skills:
    if not isinstance(entry, str):
        continue
    expanded = os.path.expanduser(entry)
    try:
        norm.append(os.path.realpath(expanded))
    except OSError:
        norm.append(expanded)

if global_agents in norm:
    print("OK")
    raise SystemExit(0)

only_project = bool(norm) and all(".cursor/skills" in path for path in norm)
if only_project:
    print("BANKX_ONLY")
elif data.get("includeDefaults") is False:
    print("MISSING_WITH_INCLUDE_DEFAULTS_FALSE")
else:
    print("MISSING")
PY
)"

case "$PI_CHECK" in
  OK) ;;
  BANKX_ONLY)
    fail "pi-settings" \
      "$PI_SETTINGS skills[] has project paths only (e.g. BankX .cursor/skills), not $GLOBAL_AGENTS" \
      "bash scripts/link-global-skills-to-ssot.sh && restart Pi"
    ;;
  MISSING_WITH_INCLUDE_DEFAULTS_FALSE | MISSING_SKILLS_ARRAY | MISSING)
    fail "pi-settings" \
      "$PI_SETTINGS skills[] must include $GLOBAL_AGENTS (includeDefaults is off)" \
      "bash scripts/link-global-skills-to-ssot.sh && restart Pi"
    ;;
esac

for name in "${SSOT_NAMES[@]}"; do
  if [[ -e "$CURSOR_VIEW/$name" ]] && [[ ! -e "$GLOBAL_AGENTS/$name" ]]; then
    fail "split-brain" \
      "repo SSOT \"$name\" in .cursor/skills but not ~/.agents/skills — Cursor may work, Pi /skill will not" \
      "bash scripts/ensure-repo-skills.sh"
  fi
done

if [[ "$failures" -gt 0 ]]; then
  exit 1
fi

echo "verify-pi-skills-registration: OK (${#SSOT_NAMES[@]} repo SSOT skills; Pi settings includes $GLOBAL_AGENTS)"
exit 0
