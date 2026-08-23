#!/usr/bin/env bash
# freebuff 0.0.x default launch is broken (capture.js usage) outside a real user terminal.
set -eo pipefail

FREEBUFF_NATIVE="${FREEBUFF_NATIVE:-$HOME/.config/manicode/freebuff}"
FREEBUFF_NODE="${FREEBUFF_NODE:-}"
FREEBUFF_IN_TERMINAL="${FREEBUFF_IN_TERMINAL:-}"

if [[ -z "$FREEBUFF_NODE" ]]; then
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
    NVM_ROOT="$(dirname "$(dirname "$NODE_BIN")")"
    CANDIDATE="$NVM_ROOT/lib/node_modules/freebuff/index.js"
    if [[ -f "$CANDIDATE" ]]; then
      FREEBUFF_NODE="$CANDIDATE"
    fi
  fi
fi

args=("$@")

is_interactive_launch() {
  ((${#args[@]} == 0)) && return 0
  for arg in "${args[@]}"; do
    case "$arg" in
      --continue | --continue=*) return 0 ;;
    esac
  done
  return 1
}

passes_through() {
  for arg in "${args[@]}"; do
    case "$arg" in
      --help | -h | --version | -v) return 0 ;;
    esac
  done
  [[ ${#args[@]} -gt 0 && "${args[0]}" == "login" ]] && return 0
  return 1
}

run_native() {
  if [[ ! -x "$FREEBUFF_NATIVE" ]]; then
    if [[ -n "$FREEBUFF_NODE" ]]; then
      exec node "$FREEBUFF_NODE" "${args[@]}"
    fi
    echo "freebuff: install with: npm install -g freebuff" >&2
    exit 1
  fi
  exec "$FREEBUFF_NATIVE" "${args[@]}"
}

run_with_expect() {
  if ! command -v expect >/dev/null 2>&1; then
    echo "freebuff: expect(1) required when stdin is not a terminal." >&2
    return 1
  fi
  local spawn_line="spawn"
  spawn_line+=" $(printf '%q' "$FREEBUFF_NATIVE")"
  local arg
  for arg in "${args[@]}"; do
    spawn_line+=" $(printf '%q' "$arg")"
  done
  exec expect -c "set timeout -1; ${spawn_line}; interact"
}

open_macos_terminal() {
  local qpwd qwrapper
  qpwd="$(printf '%q' "$PWD")"
  qwrapper="$(printf '%q' "$HOME/bin/freebuff")"
  /usr/bin/osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "export FREEBUFF_IN_TERMINAL=1; cd ${qpwd}; ${qwrapper}"
end tell
APPLESCRIPT
}

if passes_through; then
  if [[ -n "$FREEBUFF_NODE" && ${#args[@]} -gt 0 ]]; then
    exec node "$FREEBUFF_NODE" "${args[@]}"
  fi
  run_native
fi

if is_interactive_launch; then
  if [[ -n "$FREEBUFF_IN_TERMINAL" ]]; then
    run_native
  fi

  if [[ ! -t 0 ]]; then
    if [[ "$(uname -s)" == "Darwin" ]] && command -v osascript >/dev/null 2>&1; then
      open_macos_terminal
      exit 0
    fi
    run_with_expect || true
  fi

  run_native
fi

if [[ -n "$FREEBUFF_NODE" && ${#args[@]} -gt 0 ]]; then
  exec node "$FREEBUFF_NODE" "${args[@]}"
fi

run_native
