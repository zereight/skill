---
name: autocontext
description: Run iterative agent evaluation and improvement loops (judge, improve, scenarios, playbooks) via pi-autocontext or autoctx CLI. Use when improving repeatable agent workflows (review rubrics, skill quality, scenario-based feedback), checking run status, or accumulating knowledge—not for one-off code edits or repo pattern drift (use continuity) or single PR review (use zereight-review).
argument-hint: "[judge|improve|solve|status|scenarios]"
---

# autocontext (skill repo)

Orchestration layer for **evaluate → improve → persist** agent outputs. Installed stack:

| Layer | Install | Role |
|-------|---------|------|
| Pi | `npm:pi-autocontext` in `~/.pi/agent/settings.json` | In-session tools + `/skill:autocontext` |
| CLI | `uv tool install autocontext==0.5.0` → `autoctx` | Background `solve` / `run` / `list` |
| Project | `.autoctx.json` in repo root | Defaults: `agent_task`, `provider: pi`, `gens: 2` |

## When to use which skill

| Need | Use |
|------|-----|
| PR diff review, OWASP, RN effects | `zereight-review` |
| Codebase pattern SSOT / drift | `continuity` |
| Chat mistake → durable rule | `session-lessons` |
| Rubric-driven loop, playbooks, scenario bench | **autocontext** |
| Pi-native solve loop + knowledge persistence | **harness** (faster, no Python dep) |

## Pi tools (after `pi install npm:pi-autocontext`)

- `autocontext_judge` — score output vs rubric (0–1 + reasoning)
- `autocontext_improve` — judge-guided revision rounds
- `autocontext_status` — runs / queue
- `autocontext_scenarios` — list scenarios
- `autocontext_queue` — background evaluation
- `autocontext_runtime_snapshot` — artifacts, session lineage

Invoke packaged skill: `/skill:autocontext` (from `pi-autocontext` package).

## CLI (from repo root)

```bash
cd /path/to/skill   # this repo
export AUTOCONTEXT_AGENT_PROVIDER=pi
export AUTOCONTEXT_PI_COMMAND=pi

autoctx list
# TypeScript CLI (Pi npm): ~/.pi/agent/npm/node_modules/.bin/autoctx capabilities

# Full loop (costs Pi/Cursor quota — start small)
autoctx solve "Improve zereight-review checklist consistency for RN PRs" --iterations 2
```

Artifacts: `runs/`, `knowledge/` (gitignored). DB default: `runs/autocontext.sqlite3`.

## First scenario for this repo

**Goal:** Make `zereight-review` feedback more consistent on sample PR diffs.

1. **Rubric:** actionable findings, Effect anti-patterns, security mention when relevant, no vague praise-only comments.
2. **Judge:** `autocontext_judge` with task = review prompt + diff snippet, output = draft review.
3. **Improve:** Hints that pass judge → `zereight-review/references/` or checklist (human approves merge).
4. **Stop:** `gens: 2` in `.autoctx.json`; raise only after reviewing `runs/*/report.md`.

## Cost and safety

- `provider: pi` uses your Pi default (`cursor/composer-2.5`) — **each generation consumes quota**.
- Start with `--iterations 1` or `autocontext_judge` only before full `solve`.
- Do not install npm package `autocontext` (wrong project). Use `pi-autocontext` / PyPI `autocontext` / npm `autoctx`.

## Env reference

Copy `autocontext.env.example` and export in shell or Pi session. Key vars:

- `AUTOCONTEXT_AGENT_PROVIDER=pi`
- `AUTOCONTEXT_PI_COMMAND=pi`
- `AUTOCONTEXT_DB_PATH=runs/autocontext.sqlite3`
- `AUTOCONTEXT_DEFAULT_GENERATIONS=2`
