#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$HOME/.agents/skills}"
find -L "$ROOT" -maxdepth 2 -name SKILL.md -print | sort | while read -r file; do
  name=$(awk -F": " '/^name:/ {print $2; exit}' "$file")
  desc=$(awk -F": " '/^description:/ {print $2; exit}' "$file" | sed 's/^"//; s/"$//')
  printf '%s\t%s\n' "${name:-unknown}" "${desc:-}"
done
