#!/usr/bin/env bash
set -euo pipefail

ART="${GITLAB_MCP_VERIFY_ARTIFACTS:-}"

if [[ -z "$ART" ]]; then
  echo "cleanup-run: no GITLAB_MCP_VERIFY_ARTIFACTS set — nothing to stop"
  exit 0
fi

PID_FILE="$ART/mock-gitlab.pid"
if [[ -f "$PID_FILE" ]]; then
  echo "cleanup-run: removing stale pid file $PID_FILE"
  rm -f "$PID_FILE"
fi

echo "cleanup-run: artifacts kept at $ART"
