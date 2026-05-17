---
name: roborev-guide
description: Guide for using roborev continuous background code review. Use when the user asks about roborev install paths, git hooks, daemon status, review results, TUI, show/list/log commands, agent/model configuration, Codex/Claude/Pi agent settings, post-commit behavior, auto-fix, refine, or troubleshooting roborev review jobs.
---

# roborev Guide

Core rule: **Never run commands that modify code, commits, hooks, or roborev config without explicit user confirmation.**

## Intent Routing

| Intent | Action |
|---|---|
| install/setup in a repo | `roborev init [--agent <name>]` (confirm first) |
| inspect paths | `which roborev`, read hooks/config files |
| check daemon | `roborev status` |
| view review result | `roborev show`, `roborev show HEAD`, `roborev show <sha>`, `roborev show --job <id>` |
| list reviews | `roborev list`, `roborev list --open`, `roborev list --status failed` |
| configure agent/model | `roborev config list`, edit `~/.roborev/config.toml` |
| troubleshoot | `roborev status`, `roborev check-agents`, read logs |
| run fix/refine | explain difference, confirm before executing |

## Installation & Version

```bash
which roborev            # /opt/homebrew/bin/roborev (typical)
roborev version          # e.g. v0.55.0
```

- Installed via Homebrew: `/opt/homebrew/Cellar/roborev/<version>/bin/roborev`
- Repo-level config (per-repo): `.roborev.toml`

## Path Reference

| Path | Description |
|---|---|
| `/opt/homebrew/bin/roborev` | Binary (typical) |
| `~/.roborev/config.toml` | Global config |
| `~/.roborev/reviews.db` | SQLite review database |
| `~/.roborev/logs/jobs/` | Job log files |
| `~/.roborev/activity.log` | Activity log |
| `~/.roborev/errors.log` | Error log |
| `~/.roborev/post-commit.log` | Post-commit hook log |
| `.roborev.toml` | Per-repo config (repo root) |
| `.git/hooks/post-commit` | Post-commit hook |
| `.git/hooks/post-rewrite` | Post-rewrite hook |

## Inspection Commands (read-only, safe)

### Daemon & Queue

```bash
roborev status                 # Daemon uptime, worker count, queue depth
roborev status --json          # Structured output
```

Example output:
```
Daemon: running (uptime: 15m 28s) [v0.55.0]
Workers: 0/4 active
Jobs:    0 queued, 0 running, 4 completed, 0 failed, 0 skipped
Health: OK
  + database: healthy
  + workers: healthy
```

### Review Jobs

```bash
roborev list                              # Jobs for current repo/branch
roborev list --open                       # Only open (unresolved) reviews
roborev list --status done                # Filter by status (queued/running/done/failed)
roborev list --status failed              # Only failed jobs
roborev list --status queued              # Only queued jobs
roborev list --branch main                # Filter by branch
roborev list --limit 10                   # Limit results
roborev list --json                       # JSON output
```

### Review Results

```bash
roborev show                              # Review for HEAD (latest commit)
roborev show HEAD                         # Same
roborev show <sha>                        # Review for a specific commit
roborev show <job-id>                     # Review by job ID (numeric)
roborev show --job <job-id>               # Force as job ID
roborev show --json <job-id>              # JSON output
roborev show --prompt <job-id>            # Show the prompt sent to the agent
```

### Agent Logs

```bash
roborev log <job-id>                      # Human-friendly rendered output
roborev log --raw <job-id>                # Raw JSONL
roborev log --path <job-id>               # Print log file path
roborev log clean                         # Remove old job log files
```

### Wait for Completion

```bash
roborev wait                              # Wait for most recent HEAD job
roborev wait <sha>                        # Wait for a specific commit's job
roborev wait --job <id>                   # Wait for specific job ID
roborev wait --job 10 20 30              # Wait for multiple job IDs
```

### Hook Inspection

```bash
ls -la .git/hooks/post-commit
ls -la .git/hooks/post-rewrite
read .git/hooks/post-commit
read .git/hooks/post-rewrite
```

### Config Inspection

```bash
roborev config list                       # List all config values
roborev config get <key>                  # Get a specific value
read ~/.roborev/config.toml               # Raw config file
read .roborev.toml                        # Per-repo config (if exists)
```

## Agent & Model Configuration

Config file: `~/.roborev/config.toml`

Key configuration fields:

```toml
# Default agent when no workflow-specific agent is set.
default_agent = 'codex'
default_model = ''

# Review workflow
review_agent = ''
review_model = ''
review_reasoning = ''          # fast|standard|medium|thorough|maximum

# Refine workflow (iterative fix loop)
refine_agent = ''
refine_model = ''
refine_reasoning = ''

# Fix workflow (single-pass fix)
fix_agent = ''
fix_model = ''
fix_reasoning = ''

# Security review
security_agent = ''
security_model = ''

# Design review
design_agent = ''
design_model = ''

# Reasoning-level-specific agents (per-workflow granularity)
review_agent_standard = ''
review_agent_thorough = ''
review_agent_maximum = ''
refine_agent_fast = ''
refine_agent_standard = ''
# ... same pattern for fix_, security_, design_

# Model overrides per reasoning level
review_model_thorough = ''
review_model_maximum = ''
refine_model_thorough = ''
refine_model_maximum = ''
# ...

# Backup agents (fallback on primary failure)
review_backup_agent = ''
refine_backup_agent = ''
fix_backup_agent = ''

# Severity thresholds
review_min_severity = ''       # critical|high|medium|low
refine_min_severity = ''
fix_min_severity = ''

# Agent CLI command overrides
codex_cmd = 'codex'
claude_code_cmd = 'claude'
pi_cmd = 'pi'
opencode_cmd = 'opencode'
cursor_cmd = 'agent'

# Codex-specific options
[agent.codex]
disable_review_skills = true   # Disable Codex skill instructions for review jobs
ignore_review_user_config = true  # Pass --ignore-user-config to Codex
```

### Supported Agents

Checked automatically by `roborev check-agents`:

| Config name | CLI command |
|---|---|
| `codex` | `codex` |
| `claude-code` | `claude` |
| `gemini` | (Gemini CLI) |
| `copilot` | (GitHub Copilot CLI) |
| `opencode` | `opencode` |
| `cursor` | `agent` |
| `pi` | `pi` |

### Reasoning Levels

Each workflow supports per-level agent and model overrides.
Levels: `fast`, `standard` (default), `medium`, `thorough`, `maximum`.

For `roborev fix` and `roborev refine`, pass `--reasoning`:
```bash
roborev fix --reasoning thorough
roborev refine --reasoning maximum
```

### Common Configuration Patterns

Set a default agent:
```bash
roborev config set default_agent codex
```

Set review-specific agent:
```bash
roborev config set review_agent claude-code
```

Set model for thorough reviews:
```bash
roborev config set review_model_thorough claude-sonnet-4-20250514
```

Set agent CLI path:
```bash
roborev config set codex_cmd /path/to/codex
```

After config changes, restart daemon:
```bash
roborev daemon restart
```

Check agents are working:
```bash
roborev check-agents
```

## Post-Commit Workflow

### Normal Flow

1. `git commit` → post-commit hook fires
2. Hook calls `roborev post-commit` → job enqueued
3. Daemon picks up job → agent reviews the diff
4. Job completes → result stored in `~/.roborev/reviews.db`
5. View result: `roborev show` or `roborev show HEAD`

### Review-Fix Loop

After seeing review findings, confirm before fixing:

```bash
roborev show                 # review findings
roborev list --open          # open (unresolved) jobs
```

Two modes for addressing findings:

| Command | Behavior | Confirm? |
|---|---|---|
| `roborev fix` | Single-pass fix. Agent applies changes and commits. No re-review. | ✅ Yes |
| `roborev refine` | Iterative loop. Fix → commit → wait for re-review → repeat until pass or max iterations. Uses isolated worktree. | ✅ Yes |

`refine` examples:
```bash
roborev refine                              # Auto-fix loop on current branch
roborev refine --list                       # Preview without running
roborev refine --reasoning thorough         # Use thorough reasoning
roborev refine --max-iterations 5           # Limit iterations
roborev refine --since <base-commit>        # Starting point
roborev refine --branch main                # Validate branch before refining
```

`fix` examples:
```bash
roborev fix                                 # Fix all open jobs on current branch
roborev fix 123                             # Fix a single job
roborev fix 123 124 125                     # Fix multiple jobs
roborev fix --batch-size 5                  # Up to 5 reviews per agent call
roborev fix --agent claude-code             # Use specific agent
roborev fix --reasoning medium              # Reasoning level
roborev fix --min-severity high             # Only high+ severity findings
```

## Safety Gates

**Always confirm before running these commands:**

| Command | Risk |
|---|---|
| `roborev init` | Creates hooks, config, starts daemon |
| `roborev install-hook` | Modifies `.git/hooks/` |
| `roborev uninstall-hook` | Removes hooks |
| `roborev fix` | Modifies code and commits |
| `roborev refine` | Modifies code and commits (iteratively) |
| `roborev update` | Updates binary |
| `roborev daemon restart` | Restarts background service |
| `roborev config set` | Changes runtime behavior |
| `git commit` | Creates commits |
| `git reset` | Rewrites history |
| `git rebase` | Rewrites history |

**Always confirm before editing these files:**

| File | Purpose |
|---|---|
| `~/.roborev/config.toml` | Global config |
| `.roborev.toml` | Per-repo config |
| `.git/hooks/post-commit` | Post-commit hook |
| `.git/hooks/post-rewrite` | Post-rewrite hook |

## Troubleshooting

### Daemon not running

```bash
roborev status                  # Check daemon
roborev daemon start            # Start if stopped
roborev daemon restart          # Restart if needed
```

### Post-commit hook didn't fire

```bash
ls -la .git/hooks/post-commit   # Check if hook exists
read .git/hooks/post-commit     # Inspect hook content
roborev install-hook --force    # Reinstall if missing/broken
```

### Job stuck in "queued"

```bash
roborev status                  # Check workers available
# If workers=0/4, daemon may need restart
roborev daemon restart
```

### Agent not responding

```bash
roborev check-agents            # Verify agent CLI works
roborev check-agents --agent codex    # Check specific agent
roborev check-agents --timeout 30     # Per-agent timeout
```

### Wrong model/agent being used

```bash
roborev config list             # Current config
read ~/.roborev/config.toml     # Verify settings
roborev daemon restart          # Must restart after config change
```

### Git index lock

```bash
# First check if a git process is still running
ps aux | grep git
# Only remove .git/index.lock after confirming no active git process
```

### Job failed

```bash
roborev show <job-id>           # Review findings and error
roborev log <job-id>            # Full agent log
roborev list --status failed    # All failed jobs
```

## Per-Repo Config (.roborev.toml)

Optional. Placed in repo root. Supports:

- `review_guidelines` — custom review rules string
- `exclude_patterns` — globs to exclude from review diffs
- Agent/model overrides scoped to the repo

## Summary Commands

```bash
roborev summary                 # Aggregate review statistics
roborev insights                # Analyze patterns in failing reviews
roborev insights --since 7d     # Last 7 days
roborev insights --agent gemini # Use specific agent for analysis
```

## TUI

```bash
roborev tui                     # Interactive terminal UI
```

TUI key features:
- Queue view with job status, branch, agent, time
- Filter by repo/branch/status
- Mouse support (configurable)
- Customizable columns
