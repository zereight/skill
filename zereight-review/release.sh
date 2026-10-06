#!/bin/sh
# Cut a zer release. A v* tag push runs .github/workflows/release.yml.
# Usage: ./release.sh 0.2.0
set -eu

version=${1:-}
case "$version" in
  v*) version=${version#v} ;;
esac
case "$version" in
  [0-9]*.[0-9]*.[0-9]*) ;;
  *)
    echo "usage: ./release.sh 0.2.0" >&2
    exit 1
    ;;
esac

cd "$(dirname "$0")"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "release: commit or stash changes first" >&2
  exit 1
fi

branch=$(git branch --show-current)
if [ "$branch" != "main" ]; then
  echo "release: run on main (now $branch)" >&2
  exit 1
fi

git fetch origin
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "release: main is not origin/main" >&2
  exit 1
fi

if git rev-parse --verify "refs/tags/v$version" >/dev/null 2>&1; then
  echo "release: tag v$version already exists" >&2
  exit 1
fi

awk -v ver="$version" '
  /^\[package\]/ { in_pkg = 1; print; next }
  /^\[/ { in_pkg = 0 }
  in_pkg && !done && /^version = / {
    print "version = \"" ver "\""
    done = 1
    next
  }
  { print }
' zer/Cargo.toml > zer/Cargo.toml.tmp
mv zer/Cargo.toml.tmp zer/Cargo.toml

awk -v ver="$version" '
  /^name = "zer"$/ { hit = 1; print; next }
  hit && /^version = / {
    print "version = \"" ver "\""
    hit = 0
    next
  }
  { print }
' zer/Cargo.lock > zer/Cargo.lock.tmp
mv zer/Cargo.lock.tmp zer/Cargo.lock

cargo check --manifest-path zer/Cargo.toml --locked

git add zer/Cargo.toml zer/Cargo.lock
git commit -m "chore: release v$version"
git tag "v$version"
git push origin HEAD
git push origin "v$version"

echo "pushed v$version; Actions builds the release"
