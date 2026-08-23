---
name: skill-not-showing
description: Diagnose why a skill is missing from Pi /skill, T3 Code $ picker, or Cursor lists. Use when a skill exists on disk but does not appear, Pi shows only project or extension skills, or after adding a repo skill under .agents/skills/.
user_invocable: true
---

# Skill Not Showing

Read-only diagnostic. Confirm with the user before changing settings or running sync scripts.

## T3 Code root cause

T3 composer uses **different triggers**:

| Trigger | Menu | Data source |
|---------|------|-------------|
| `$` | Skills | `~/.t3/caches/cursor.json` → `skills[]` |
| `/` | Commands | same cache → `slashCommands[]` + built-in |
| `@` | Files | workspace search |

**Cursor provider probe leaves `skills: []` empty.** Cursor sends skills later as `available_commands_update`, but T3 `$` picker does not read that stream today.

### Fix path (T3 Code + Cursor)

| Step | Command |
|------|---------|
| Sync local skills into T3 cache | `bash scripts/sync-t3-cursor-skills.sh` |
| Dry run (counts only) | `bash scripts/sync-t3-cursor-skills.sh --dry-run` |
| Include a project repo | `bash scripts/sync-t3-cursor-skills.sh --project-root /path/to/repo/.cursor/skills` |

Then **restart T3 Code** (or open a new thread) and search with:

- `$zereight-review` — skill picker
- `/zereight-review` — slash menu (provider command entries)

If `/` still shows only `/model`, `/plan`, `/default`, update T3 Code Alpha (pingdotgg/t3code PR #2650 adds skills to the `/` menu when `skills[]` is populated).

### T3 Code common mistakes

1. Searching with `/` when expecting the `$` skill picker
2. Typing `/` mid-line (trigger only works at **line start**)
3. Not restarting T3 after cache sync (provider snapshot is cached in-memory)

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
5. T3: `jq '.skills | length' ~/.t3/caches/cursor.json` should be > 0 after `sync-t3-cursor-skills.sh`.

## Related

- `ljg-skill-map` — global `~/.agents/skills` layout
- `skill-cleaner` — duplicate roots / token audit
- `scripts/sync-t3-cursor-skills.sh` — T3 Cursor cache backfill
