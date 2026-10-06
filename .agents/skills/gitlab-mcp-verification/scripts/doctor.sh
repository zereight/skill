#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd -P)"
REPO_ROOT="${GITLAB_MCP_REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$REPO_ROOT"

fail() {
  echo "doctor: FAIL — $1" >&2
  exit 1
}

[[ -f package.json ]] || fail "no package.json in $REPO_ROOT — cd into a zereight/gitlab-mcp clone or set GITLAB_MCP_REPO_ROOT"

pkg_name="$(node -p "require('./package.json').name" 2>/dev/null || echo '')"
[[ "$pkg_name" == "@zereight/mcp-gitlab" ]] || fail "package.json name is '$pkg_name' in $REPO_ROOT, expected @zereight/mcp-gitlab"

need_node="$(node -p "require('./package.json').engines.node" 2>/dev/null || echo '>=18.17.0')"
echo "doctor: repo=$REPO_ROOT"
echo "doctor: skill=$SKILL_DIR"
echo "doctor: node=$(node -v) (requires $need_node)"

if [[ ! -f build/index.js ]]; then
  fail "missing build/index.js — run: npm run build"
fi

if [[ ! -d node_modules/tsx ]]; then
  fail "missing tsx — run: npm install"
fi

if [[ ! -f "$SKILL_DIR/scripts/drive-health-check-mock.ts" ]]; then
  fail "drive-health-check-mock.ts missing from skill scripts"
fi

echo "doctor: OK — build present, tsx installed"
