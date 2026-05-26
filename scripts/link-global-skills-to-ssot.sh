#!/usr/bin/env bash
# Link ~/.agents/skills/* to this repo's .agents/skills SSOT.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSOT="$REPO_ROOT/.agents/skills"
AGENTS="${HOME}/.agents/skills"
PI_SKILLS="${HOME}/.pi/agent/skills"
RUN_VERIFY=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-verify) RUN_VERIFY=0 ;;
    -h | --help)
      echo "Usage: link-global-skills-to-ssot.sh [--no-verify]" >&2
      exit 0
      ;;
    *)
      echo "unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

linked=0
for src in "$SSOT"/*; do
  [[ -e "$src" ]] || continue
  name=$(basename "$src")
  [[ "$name" == .* ]] && continue
  [[ -f "$src/SKILL.md" ]] || continue

  mkdir -p "$AGENTS"
  rm -rf "$AGENTS/$name"
  ln -sfn "$src" "$AGENTS/$name"
  linked=$((linked + 1))
  echo "linked $AGENTS/$name -> $src"
done

rm -f "$PI_SKILLS/autocontext"

PI_SETTINGS="${HOME}/.pi/agent/settings.json"
if [[ ! -f "$PI_SETTINGS" ]]; then
  echo "error: missing $PI_SETTINGS — create Pi settings before linking repo skills" >&2
  exit 1
fi

python3 - "$PI_SETTINGS" "$AGENTS" <<'PY'
import json, sys
settings_path, agents = sys.argv[1:3]
with open(settings_path, encoding="utf-8") as f:
    data = json.load(f)
skills = data.setdefault("skills", [])
if agents not in skills:
    skills.append(agents)
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print(f"pi settings: added skills path {agents}")
else:
    print(f"pi settings: skills path already present ({agents})")
PY

echo "done: linked $linked repo SSOT skills into $AGENTS (restart Pi after settings/symlink changes)"

if [[ "$RUN_VERIFY" -eq 1 ]]; then
  bash "$SCRIPT_DIR/verify-pi-skills-registration.sh"
fi
