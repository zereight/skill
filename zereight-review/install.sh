#!/bin/sh
# Install a prebuilt zer binary from GitHub Releases.
# Usage: curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/zereight/zer/main/install.sh | sh
# Pin:   ZER_VERSION=v0.1.0 sh install.sh
set -eu

REPO="zereight/zer"
DEST="${ZER_INSTALL_DIR:-$HOME/.local/bin}"

os=$(uname -s)
arch=$(uname -m)
case "$os:$arch" in
  Darwin:arm64) target="aarch64-apple-darwin" ;;
  Darwin:x86_64) target="x86_64-apple-darwin" ;;
  Linux:x86_64) target="x86_64-unknown-linux-gnu" ;;
  Linux:aarch64|Linux:arm64) target="aarch64-unknown-linux-gnu" ;;
  *)
    echo "zer install: unsupported $os $arch" >&2
    exit 1
    ;;
esac

if [ -n "${ZER_VERSION:-}" ]; then
  tag=$ZER_VERSION
  case "$tag" in
    v*) ;;
    *) tag="v$tag" ;;
  esac
  base="https://github.com/$REPO/releases/download/$tag"
else
  base="https://github.com/$REPO/releases/latest/download"
fi

asset="zer-$target.tar.gz"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

curl --proto '=https' --tlsv1.2 -fsSL "$base/$asset" -o "$work/$asset"
curl --proto '=https' --tlsv1.2 -fsSL "$base/SHA256SUMS" -o "$work/SHA256SUMS"

expected=$(awk -v f="$asset" '$2 == f { print $1 }' "$work/SHA256SUMS")
if [ -z "$expected" ]; then
  echo "zer install: $asset missing from SHA256SUMS" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$work/$asset" | awk '{ print $1 }')
else
  actual=$(shasum -a 256 "$work/$asset" | awk '{ print $1 }')
fi

if [ "$expected" != "$actual" ]; then
  echo "zer install: checksum mismatch for $asset" >&2
  exit 1
fi

tar -xzf "$work/$asset" -C "$work"
mkdir -p "$DEST"
install -m 755 "$work/zer-$target/zer" "$DEST/zer"

echo "installed $DEST/zer"
case ":$PATH:" in
  *":$DEST:"*) ;;
  *) echo "add to PATH: export PATH=\"$DEST:\$PATH\"" ;;
esac
