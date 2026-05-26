---
name: skill-cleaner
description: Audit agent skills — token cost, duplicates, outdated plugin versions, unused skills, and overly long descriptions. Use when trimming skill prompt budget, finding duplicate or unused skills, auditing plugin versions, or deciding which skills to remove.
user_invocable: true
---

# Skill Cleaner

Read-only audit of skills loaded into Claude Code, Cursor, and Pi. Surfaces what is costing prompt budget, what is duplicated or outdated, and what is never invoked. **Suggests only; never deletes.**

Upstream: [YuzuruS/claude-skill-cleaner](https://github.com/YuzuruS/claude-skill-cleaner) (MIT). Vendored with Cursor/Pi scan roots. New repo skills: `bash scripts/ensure-repo-skills.sh` first.

## Workflow

1. Run the analyzer from this skill directory (no dependencies; Node 22.6+ for `--experimental-strip-types`):

```bash
cd ~/.agents/skills/skill-cleaner
node --experimental-strip-types scripts/skill-cleaner.ts --no-logs --months 3
```

Useful variants:

```bash
node --experimental-strip-types scripts/skill-cleaner.ts --no-logs            # fast: skip usage scan
node --experimental-strip-types scripts/skill-cleaner.ts --top 40             # longer ranking
node --experimental-strip-types scripts/skill-cleaner.ts --root ~/Documents/skill/.agents/skills
node --experimental-strip-types scripts/skill-cleaner.ts --json               # machine-readable
node --experimental-strip-types scripts/skill-cleaner.ts --include-disabled   # show duplicate/inactive copies
```

2. Read the report top to bottom:
   - **Summary** — discovered vs active counts and approximate token totals.
   - **Token Cost Ranking** — heaviest active skills by approximate tokens.
   - **Description Candidates** — long descriptions, each with a "keep first sentence" suggestion.
   - **Outdated Plugin Versions** — older cached plugin versions when an active one exists.
   - **Duplicate Names / Bodies** — the same skill reachable from multiple roots (common when SSOT + symlink views both appear).
   - **Unused Candidates** — no explicit invocation in the log window (Claude Code logs only; use `--no-logs` for Cursor/Pi-only audits).
   - **Root Summary** — where skills come from and how many are active.

3. Before deleting anything:
   - Prefer removing **outdated cache versions** and marketplace duplicates — the active copy stays loaded.
   - For duplicate names across SSOT and symlink views, keep **`.agents/skills`** and remove real dirs under view paths if any drifted.
   - Personal skills in `~/.agents/skills` are hand-placed — confirm before removing.

## Default scan roots

The script scans (when present):

- `~/.agents/skills`, `~/.cursor/skills`, `~/.pi/agent/skills`
- `~/.cursor/plugins/cache`, `~/.claude/skills`, Claude plugin cache/marketplaces
- Extra paths from repeatable `--root <path>`

## How it works

- **Active vs discovered** — Claude plugin installs use `~/.claude/plugins/installed_plugins.json`. Cursor plugin cache uses the newest version directory per marketplace/plugin. SSOT and symlink views under `.agents/skills` count as active.
- **Token cost is relative** — `ceil(utf8_bytes / 4)` of the rendered `- name: description` line. For relative comparison only, not an absolute budget verdict.
- **Usage** — scans `~/.claude/projects/**/*.jsonl` for Skill tool calls and slash commands. Cursor/Pi session logs are not scanned yet; use `--no-logs` when auditing Cursor-only setups.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `--months <n>` | 3 | log scan window (months) |
| `--no-logs` | — | skip unused detection (faster) |
| `--json` | — | machine-readable output |
| `--root <path>` | — | extra root to scan (repeatable) |
| `--top <n>` | 20 | ranking length |
| `--include-disabled` | — | include inactive copies in sections |
| `--no-agents` | — | skip subagent tally |
| `--show-budget` | off | print a reference budget (approx, not authoritative) |
| `--max-log-mb <n>` | 2000 | cap total log bytes read |

## Safety

Read-only. Output is suggestions; you decide what to delete. Cache copies regenerate on plugin reinstall.
