# Scope and extensions (session-lessons)

This file records the **default scope** for the Cursor `session-lessons` skill when the user approves the intent-alignment plan without picking every option explicitly.

## Confirmed defaults

| Decision | Choice | Rationale |
|----------|--------|-----------|
| History source | **Agent/Composer transcripts** under `~/.cursor/projects/.../agent-transcripts/` | Same evidence the agent can read in JSONL; stable schema. |
| Primary evidence | **Current conversation first** | User corrections in the active chat are the strongest signal. |
| Supporting evidence | **Past transcripts** via `list` / `extract` | Proves repetition across sessions. |
| Automation | **Semi-auto** | CLI narrows and redacts transcripts; the agent diagnoses and proposes durable fixes. |
| Trigger | **Manual** (`/session-lessons`, attach skill, explicit “learn from this”) | Matches Pi; avoids noisy post-session analysis. |
| Out of scope (v1) | **Cursor Tab / inline chat**, `chatSessions` in `workspaceStorage` | Different storage; no stable public schema in this skill. |

## What is not a “lesson”

- One-off typos or environment glitches
- Vague style preferences without a repeatable trigger
- Model-specific quirks with no procedural fix
- Full chat summaries (use something else if the goal is only recap)

## Boundary: `workflow-from-chats`

| | session-lessons | workflow-from-chats |
|---|-----------------|---------------------|
| Goal | Stop **repeated mistakes** | Encode **working preferences** |
| Evidence | Failed approach → correction | “I prefer”, “always”, “never”, workflow markers |
| Output | Corrective skill / rule with anti-patterns | Preference profile, adopt/consider/dismiss |
| Overlap | Both read `agent-transcripts` | Run **one** skill per request; do not duplicate file writes |

If the user wants preferences rather than mistake prevention, use `workflow-from-chats` instead.

## Other Cursor chat storage (investigated, not wired)

Non-agent chat may live under:

`~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/chatSessions`

These are workspace-hash keyed, not project-slug keyed, and are **not** read by `session-lessons.mjs` today. Extending support would need format research and a separate ingestion path.

## Optional: `sessionEnd` hook (reminder only)

Full automatic lesson extraction on every session end is **not** recommended (cost, noise, false positives).

A lightweight **user hook** can append a one-line reminder to run `/session-lessons` when the user cares about a recurring issue. See [examples/hooks-session-end-reminder.md](../examples/hooks-session-end-reminder.md).

## Optional: persist approved lessons

After the user **explicitly approves** a durable fix:

1. Write the skill/rule file as today.
2. Optionally store a **one-line summary** (no secrets) via AgentMemory / `memory_save` if that MCP is available — tags like `session-lesson`, project name, root-cause class.

Do not auto-save lessons without user approval.
