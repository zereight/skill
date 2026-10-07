#!/usr/bin/env bash
# Mirror global originals into this repo.
# A skill whose ~/.agents/skills/<name> is a real directory (not a symlink) is a global original;
# the repo copy under .agents/skills/<name> is the upload mirror and is overwritten from the global side.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSOT="$REPO_ROOT/.agents/skills"
AGENTS="${HOME}/.agents/skills"
CHECK=0

usage() {
  cat <<'EOF'
Usage: sync-global-originals.sh [--check]

  (default)  rsync ~/.agents/skills/<name>/ -> <repo>/.agents/skills/<name>/ for every global original
  --check    report drift only; exit 1 if any mirror differs (nothing is written)

Excluded: node_modules, .env*, .DS_Store, *.log (.env.example is kept).
After syncing, review `git status` and commit.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) CHECK=1 ;;
    -h | --help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
  shift
done

# --include must precede the broader .env.* exclude
EXCLUDES=(--include '.env.example' --exclude node_modules --exclude '.env' --exclude '.env.*' --exclude .DS_Store --exclude '*.log')

drift=0
found=0
for src in "$SSOT"/*; do
  name=$(basename "$src")
  global="$AGENTS/$name"
  [[ -d "$global" && ! -L "$global" ]] || continue
  found=$((found + 1))
  mkdir -p "$src"

  changes=$(rsync -ain --delete "${EXCLUDES[@]}" "$global/" "$src/" | grep -v '^\.d' || true)
  if [[ -z "$changes" ]]; then
    echo "in sync  $name"
    continue
  fi
  drift=$((drift + 1))
  if [[ $CHECK -eq 1 ]]; then
    echo "DRIFT    $name"
    echo "$changes" | sed 's/^/           /'
  else
    rsync -a --delete "${EXCLUDES[@]}" "$global/" "$src/"
    echo "synced   $name"
    echo "$changes" | sed 's/^/           /'
  fi
done

[[ $found -gt 0 ]] || echo "no global originals found under $AGENTS"
if [[ $CHECK -eq 1 && $drift -gt 0 ]]; then
  exit 1
fi
