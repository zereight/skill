---
name: skill-not-showing
description: Diagnose why a skill is missing from Pi /skill or Cursor lists. Use when a skill exists on disk but does not appear, Pi shows only project or extension skills, or after adding a repo skill under .agents/skills/.
user_invocable: true
---

# Skill Not Showing

Read-only diagnostic. Confirm with the user before changing settings or running sync scripts.

## Pi root cause

`includeDefaults` is false → Pi loads only paths in `~/.pi/agent/settings.json` `skills[]`. Extension skills (`why`, `autocontext`, …) are separate from repo SSOT under `.agents/skills/`.

## Fix path (repo root)

| Step | Command |
|------|---------|
| Sync + link + verify | `bash scripts/ensure-repo-skills.sh` |
| Check only | `npm run verify:pi-skills` |

Then restart Pi and try `/skill:<name>`.

## If still missing

1. Frontmatter `name` matches the folder you expect.
2. `~/.pi/agent/settings.json` lists `~/.agents/skills` (and cwd `.pi/settings.json` is not overriding).
3. `ls -la ~/.agents/skills/<name> .cursor/skills/<name>` — broken symlinks → re-run `ensure-repo-skills.sh`.
4. Extension-only list (e.g. only `zereight-mode`) means SSOT paths are not registered — not a content bug in the skill file.

## Related

- `ljg-skill-map` — global `~/.agents/skills` layout
- `skill-cleaner` — duplicate roots / token audit
