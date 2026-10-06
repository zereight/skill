#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd -P)"
REPO_ROOT="${GITLAB_MCP_REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$REPO_ROOT"

export GITLAB_MCP_VERIFY_RUN_ID="${GITLAB_MCP_VERIFY_RUN_ID:-$(date +%s)}"
export GITLAB_MCP_VERIFY_ARTIFACTS="${GITLAB_MCP_VERIFY_ARTIFACTS:-$HOME/.agents/verify-artifacts/gitlab-mcp-verification/${GITLAB_MCP_VERIFY_RUN_ID}}"
mkdir -p "$GITLAB_MCP_VERIFY_ARTIFACTS"

bash "$SKILL_DIR/scripts/doctor.sh" \
  | tee "$GITLAB_MCP_VERIFY_ARTIFACTS/doctor.log"

node --import tsx/esm "$SKILL_DIR/scripts/drive-health-check-mock.ts"

echo "GITLAB_MCP_VERIFY_ARTIFACTS=$GITLAB_MCP_VERIFY_ARTIFACTS"
