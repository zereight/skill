#!/usr/bin/env bash
# Install ~/bin/freebuff wrapper (PTY via expect) and prepend ~/bin to PATH in ~/.zshrc.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WRAPPER_SRC="$REPO_ROOT/scripts/freebuff-wrapper.sh"
WRAPPER_DST="$HOME/bin/freebuff"
ZSHRC="$HOME/.zshrc"
PATH_MARKER='# Prefer PTY wrapper over npm freebuff'

if [[ ! -f "$WRAPPER_SRC" ]]; then
  echo "Missing $WRAPPER_SRC" >&2
  exit 1
fi

mkdir -p "$HOME/bin"
install -m 755 "$WRAPPER_SRC" "$WRAPPER_DST"
echo "Installed $WRAPPER_DST"

if [[ -f "$ZSHRC" ]] && ! rg -Fq "$PATH_MARKER" "$ZSHRC" 2>/dev/null; then
  tmp="$(mktemp)"
  awk -v block="$PATH_MARKER
export PATH=\"\$HOME/bin:\$PATH\"" '
    /# This loads nvm/ && !done {
      print
      print block
      done=1
      next
    }
    { print }
  ' "$ZSHRC" >"$tmp"
  mv "$tmp" "$ZSHRC"
  echo "Updated $ZSHRC (prepend \$HOME/bin to PATH)"
else
  echo "PATH hook already present or no ~/.zshrc — ensure: export PATH=\"\$HOME/bin:\$PATH\""
fi

echo ""
echo "Reload shell: source ~/.zshrc"
echo "Verify:       which freebuff && freebuff -v"
echo "Run agent:    freebuff   # use a real terminal (Terminal.app / iTerm)"
