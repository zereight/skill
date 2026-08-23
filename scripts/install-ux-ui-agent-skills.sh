#!/usr/bin/env bash
# Install plugin87/ux-ui-agent-skills into repo SSOT + skill wrappers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION="${UX_UI_AGENT_SKILLS_VERSION:-2.4.0}"
INTEGRITY="sha512-cLdfEM96Js96iO2HDu7tUDmiJfPFmWPRqj0hIB+kVrlFqfUqzPpfnpu8UVglMywJITVEa0HjW7vu1wVtfilicQ=="
KIT_DIR="$REPO_ROOT/.agents/ux-ui-agent-skills"
SKILLS_DIR="$REPO_ROOT/.agents/skills"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

verify_tarball() {
  local tarball="$1"
  local actual
  actual=$(openssl dgst -sha512 -binary "$tarball" | openssl base64 -A)
  if [[ "$actual" != "${INTEGRITY#sha512-}" ]]; then
    echo "error: tarball integrity mismatch" >&2
    echo "expected: ${INTEGRITY#sha512-}" >&2
    echo "actual:   $actual" >&2
    exit 1
  fi
}

install_kit() {
  local tarball="$TMP_DIR/ux-ui-agent-skills-${VERSION}.tgz"
  echo "== download ux-ui-agent-skills@${VERSION} =="
  npm pack "ux-ui-agent-skills@${VERSION}" --pack-destination "$TMP_DIR" >/dev/null
  verify_tarball "$tarball"

  rm -rf "$KIT_DIR"
  mkdir -p "$KIT_DIR"
  tar -xzf "$tarball" -C "$TMP_DIR"
  cp -R "$TMP_DIR/package/." "$KIT_DIR/"
  printf '%s\n' "$VERSION" >"$KIT_DIR/VERSION"
  echo "installed kit -> $KIT_DIR"
}

write_skill_wrapper() {
  local name="$1"
  local src_name="${2:-$name}"
  local src="$KIT_DIR/.claude/skills/$src_name/SKILL.md"
  local dest_dir="$SKILLS_DIR/$name"
  local dest="$dest_dir/SKILL.md"

  [[ -f "$src" ]] || {
    echo "error: missing skill source: $src" >&2
    exit 1
  }

  mkdir -p "$dest_dir"
  if [[ "$name" != "$src_name" ]]; then
    sed "s/^name: ${src_name}$/name: ${name}/" "$src" >"$dest"
  else
    cp "$src" "$dest"
  fi
  {
    printf '\n\n---\n\n'
    cat <<EOF
## Kit location

This skill is part of **ux-ui-agent-skills v${VERSION}**.

Resolve every relative path in the steps above against:

\`.agents/ux-ui-agent-skills/\`

(from repo root: \`$KIT_DIR\`)

Load \`.agents/ux-ui-agent-skills/CLAUDE.md\` when you need the full agent persona or Request Router.
EOF
  } >>"$dest"
  echo "  wrapped: $name"
}

install_skill_wrappers() {
  echo "== wrap skills into .agents/skills =="
  for src in "$KIT_DIR/.claude/skills"/*; do
    [[ -d "$src" ]] || continue
    local src_name
    src_name=$(basename "$src")
    local dest_name="$src_name"
    if [[ "$src_name" == "prototype" ]]; then
      dest_name="design-prototype"
    fi
    write_skill_wrapper "$dest_name" "$src_name"
  done
}

main() {
  install_kit
  install_skill_wrappers
  echo "== sync views =="
  bash "$SCRIPT_DIR/ensure-repo-skills.sh"
  echo "done: ux-ui-agent-skills@${VERSION}"
}

main
