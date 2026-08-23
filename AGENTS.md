# zereight skills — agent guide

Personal agent skills for code review and React Native development. See [README.md](./README.md) for layout, install, and skill inventory.

## Context-mode + AgentMemory (always on)

- **context-mode:** `.cursor/rules/context-mode.mdc` — use `ctx_*` MCP tools for large output, diffs, logs, web fetch (think-in-code).
- **AgentMemory:** Pi extension at `~/.pi/agent/extensions/agent-memory/` — `memory_search` at session start; `memory_add` for durable preferences/decisions (no secrets).
- Project memories: `.pi/memory/memories.jsonl` (auto-created).

## After adding a repo skill

1. Edit only [`.agents/skills/<name>/`](.agents/skills/).
2. Run `bash scripts/ensure-repo-skills.sh` (or `npm run skills:ensure`) until `verify-pi-skills-registration: OK`.
3. Restart Pi so `/skill` picks up settings/symlink changes.
4. If still missing, use `skill-not-showing` (see [README](./README.md)).

<!-- AUTOCTX_GUIDE_START -->
## AutoContext

This repo is configured for [autocontext](https://github.com/greyhaven-ai/autocontext) evaluation loops (`.autoctx.json`, `runs/`, `knowledge/`).

- Before `autoctx init`: commit or back up `AGENTS.md` — init may replace this file with a minimal Agent Guide stub.
- Pi extension: `npm:pi-autocontext` (tools: `autocontext_judge`, `autocontext_improve`, `autocontext_status`, …)
- CLI: `autoctx` (Python `uv tool install autocontext==0.5.0` or npm `autoctx` via Pi)
- **Harness** (Pi-native): `~/.pi/agent/extensions/harness/` (tools: `harness_solve`, `harness_knowledge`, `harness_status`)
- Skill routing: `.agents/skills/autocontext/` or `.agents/skills/harness/` — when to use vs `continuity`, `zereight-review`, `session-lessons`
- Use `autoctx capabilities` / `autoctx whoami` before paid runs; default provider is `pi` (uses your Pi/Cursor auth)
- Run `autoctx run` or `autoctx solve` from this directory for project defaults
<!-- AUTOCTX_GUIDE_END -->
