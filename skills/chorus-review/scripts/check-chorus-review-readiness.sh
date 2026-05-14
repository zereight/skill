#!/usr/bin/env bash
set -u

status=0

say() {
  printf '%s\n' "$*"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

say "chorus-review readiness"

if have chorus; then
  chorus_path="$(command -v chorus)"
  say "READY chorus: $chorus_path"
  if chorus status >/dev/null 2>&1; then
    say "READY chorus status: responds"
  else
    say "WARN chorus status: command failed or daemon not running"
  fi
else
  say "BLOCKED chorus: not found in PATH"
  status=1
fi

if have codex; then
  codex_path="$(command -v codex)"
  say "READY codex: $codex_path"
  codex_help="$(codex exec --help 2>/dev/null || true)"
  case "$codex_help" in
    *"--model"*) say "READY codex --model: supported" ;;
    *) say "BLOCKED codex --model: not found in help"; status=1 ;;
  esac
  case "$codex_help" in
    *"--config"*|*"-c,"*) say "READY codex -c/--config: supported" ;;
    *) say "BLOCKED codex -c/--config: not found in help"; status=1 ;;
  esac
else
  say "BLOCKED codex: not found in PATH"
  status=1
fi

if have gemini; then
  say "READY gemini: $(command -v gemini)"
else
  say "BLOCKED gemini: not found in PATH"
  status=1
fi

if have claude; then
  say "READY claude: $(command -v claude)"
else
  say "WARN claude: not found in PATH; Claude reviewer will be skipped"
fi

patch_found=0
for candidate in \
  "${CHORUS_REPO:-}" \
  "$PWD" \
  "$PWD/chorus" \
  "/tmp/codex-repo-inspect/chorus" \
  "$HOME/Documents/chorus" \
  "$HOME/Documents/skill/chorus"
do
  [ -n "$candidate" ] || continue
  codex_shim="$candidate/src/daemon/agents/codex.ts"
  if [ -f "$codex_shim" ] && grep -q 'model_reasoning_effort' "$codex_shim"; then
    say "READY codex xhigh patch: detected in $codex_shim"
    patch_found=1
    break
  fi
done

if [ "$patch_found" -ne 1 ]; then
  say "WARN codex xhigh patch: not detected; xhigh requires Chorus patch"
fi

exit "$status"
