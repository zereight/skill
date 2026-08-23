#!/usr/bin/env python3
"""Inject local agent skills into T3 Code Cursor provider cache.

T3 Code $ skill search reads providerStatus.skills from ~/.t3/caches/cursor.json.
The Cursor provider probe leaves skills[] empty; this script backfills from
~/.agents/skills, ~/.cursor/skills, and optional project dirs.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

DEFAULT_CACHE = Path.home() / ".t3" / "caches" / "cursor.json"
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
NAME_RE = re.compile(r"^name:\s*(.+?)\s*$", re.MULTILINE)
DESCRIPTION_RE = re.compile(r"^description:\s*(.+?)\s*$", re.MULTILINE)


def expand_home(path: str) -> Path:
    return Path(os.path.expanduser(path)).resolve()


def parse_skill_frontmatter(skill_md: Path) -> dict[str, str] | None:
    text = skill_md.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    if not match:
        return None

    frontmatter = match.group(1)
    name_match = NAME_RE.search(frontmatter)
    if not name_match:
        return None

    name = name_match.group(1).strip().strip('"').strip("'")
    if not name:
        return None

    description_match = DESCRIPTION_RE.search(frontmatter)
    description = (
        description_match.group(1).strip().strip('"').strip("'")
        if description_match
        else ""
    )

    return {"name": name, "description": description}


def discover_skill_roots(extra_roots: list[str]) -> list[Path]:
    home = Path.home()
    roots = [
        home / ".agents" / "skills",
        home / ".cursor" / "skills",
        home / ".codex" / "skills",
    ]
    for raw in extra_roots:
        roots.append(expand_home(raw))
    return roots


def discover_local_skills(extra_roots: list[str]) -> list[dict[str, Any]]:
    by_name: dict[str, dict[str, Any]] = {}

    for root in discover_skill_roots(extra_roots):
        if not root.is_dir():
            continue

        for entry in sorted(root.iterdir()):
            if not entry.is_dir() or entry.name.startswith("."):
                continue

            skill_md = entry / "SKILL.md"
            if not skill_md.is_file():
                continue

            parsed = parse_skill_frontmatter(skill_md)
            if parsed is None:
                continue

            name = parsed["name"]
            if name in by_name:
                continue

            description = parsed["description"]
            skill: dict[str, Any] = {
                "name": name,
                "path": str(skill_md),
                "enabled": True,
                "scope": "user",
            }
            if description:
                skill["description"] = description
                skill["shortDescription"] = description[:160]

            by_name[name] = skill

    return sorted(by_name.values(), key=lambda item: item["name"])


def to_slash_commands(skills: list[dict[str, Any]]) -> list[dict[str, Any]]:
    commands: list[dict[str, Any]] = []
    for skill in skills:
        command: dict[str, Any] = {
            "name": skill["name"],
        }
        description = skill.get("shortDescription") or skill.get("description")
        if description:
            command["description"] = f"{description} (user skill)"
        else:
            command["description"] = "Run provider skill (user skill)"
        commands.append(command)
    return commands


def load_cache(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"T3 Cursor cache not found: {path}")

    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_cache(path: Path, payload: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def sync_cache(
    cache_path: Path,
    extra_roots: list[str],
    dry_run: bool,
) -> tuple[int, int]:
    payload = load_cache(cache_path)
    skills = discover_local_skills(extra_roots)
    slash_commands = to_slash_commands(skills)

    payload["skills"] = skills
    payload["slashCommands"] = slash_commands

    if not dry_run:
        write_cache(cache_path, payload)

    return len(skills), len(slash_commands)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync local agent skills into T3 Code Cursor provider cache.",
    )
    parser.add_argument(
        "--cache",
        default=str(DEFAULT_CACHE),
        help=f"Path to cursor.json cache (default: {DEFAULT_CACHE})",
    )
    parser.add_argument(
        "--project-root",
        action="append",
        default=[],
        help="Extra skill roots (e.g. .cursor/skills under a repo). Repeatable.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print counts only; do not write cache file.",
    )
    args = parser.parse_args()

    cache_path = expand_home(args.cache)
    skill_count, slash_count = sync_cache(
        cache_path,
        args.project_root,
        args.dry_run,
    )

    mode = "would sync" if args.dry_run else "synced"
    print(
        f"sync-t3-cursor-skills: {mode} {skill_count} skills and "
        f"{slash_count} slash commands -> {cache_path}",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
