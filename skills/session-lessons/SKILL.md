---
name: session-lessons
description: Inspects Cursor agent transcript history, analyzes repeated assistant mistakes, and turns durable learnings into corrective skills or context updates. Use when the user asks to review previous Cursor chats, learn from a failed interaction, run /session-lessons, or stop the model repeating a mistake.
---

# Session Lessons (Cursor)

Turn **Cursor agent session evidence** into **reusable guidance** so the same mistake does not recur. This is a retrospective workflow—not a chat summarizer.

**Intent in one line:** read past (and current) agent sessions, find evidence of repeated failure or user correction, then propose the smallest durable fix (skill, rule, `AGENTS.md`, docs, or tooling).

For **Pi** sessions, use `~/.agents/skills/session-lessons` (`~/.pi/agent/sessions/`).  
For **preferences** (“I always want…”), use `workflow-from-chats` instead—see [references/scope-and-extensions.md](references/scope-and-extensions.md).

## Confirmed scope (defaults)

| Area | Default |
|------|---------|
| Data source | `~/.cursor/projects/<project-slug>/agent-transcripts/<session-id>/<session-id>.jsonl` |
| Primary evidence | **This conversation** (user corrections, failed attempts here) |
| Supporting evidence | Past transcripts via CLI `list` / `extract` |
| Automation | **Semi-auto**: script lists/redacts; **you** diagnose and draft fixes |
| Trigger | Manual: `/session-lessons`, attach this skill, “learn from this”, “you keep doing X” |
| Not in v1 | Tab/inline `chatSessions` under `workspaceStorage` (documented in references only) |

Change scope only when the user explicitly asks (e.g. all Cursor chats, post-session auto-run).

## Safety and Scope

- Transcripts may contain credentials, proprietary code, or private user text. Redact secrets before quoting; avoid copying large transcript chunks into durable files.
- Ask before writing durable changes unless the user explicitly requested implementation.
- Prefer the narrowest durable surface:
  1. Existing skill update for domain-specific repeated mistakes.
  2. New skill for a recurring workflow or anti-pattern with clear triggers.
  3. Project `AGENTS.md` or `.cursor/rules/` for always-applicable project conventions.
  4. A project doc or issue for one-off findings.
- Do not create a skill for vague advice, model preferences, or isolated failures.
- If the mistake came from missing tooling rather than missing instructions, recommend tooling or an extension instead of a skill.

## Session Discovery

Cursor stores agent transcripts as JSONL under:

`~/.cursor/projects/<project-slug>/agent-transcripts/<session-id>/<session-id>.jsonl`

Subagent runs live under `.../subagents/*.jsonl` and are excluded by default.

Use the helper script (relative to this skill directory) to avoid loading entire transcripts too early:

```bash
node scripts/session-lessons.mjs list --cwd "$PWD" --limit 10
node scripts/session-lessons.mjs list --project Users-tao-exe-Documents-gitlab-mcp --limit 10
node scripts/session-lessons.mjs list --all --limit 20
node scripts/session-lessons.mjs list --include-subagents --limit 10
node scripts/session-lessons.mjs extract <transcript.jsonl> --max-entries 200 --max-entry-chars 1200
```

### How filtering works

- **`--cwd` (default)**: Keeps sessions whose inferred workspace matches the current directory. Matching uses:
  - The decoded project slug (e.g. `Users-tao-exe-Documents-skill` → `/Users/tao.exe/Documents/skill`), and
  - Absolute paths found in tool inputs / shell commands inside the transcript (home-only paths are ignored).
- **`--project`**: Restrict to one Cursor project slug under `~/.cursor/projects/`.
- **`--all`**: Search every project (still respects `--project` when set).

If the user knows the session ID or transcript path, use that directly. Otherwise list recent sessions for the current workspace first. For cross-project patterns, use `--all` and ask which sessions matter before extracting.

**Note:** Cursor transcripts do not embed `Workspace Path` on every line. When `--cwd` returns nothing, retry with `--project <slug>` or `--all`.

## Workflow

### 1. Establish the Learning Target

Clarify the user’s concern in one sentence:

- What mistake repeated?
- Was it in **this chat**, earlier Cursor transcripts, or a known class of tasks?
- What should the assistant do differently next time?

**Evidence priority**

1. **Current conversation** — user pushback, retries, “that’s wrong”, successful correction in-thread.
2. **Stored transcripts** — same pattern in earlier sessions (use CLI after step 1 is clear).
3. Do not cite raw transcript paths in user-facing output.

If the user says “you keep doing X” or “learn from this,” treat the **current conversation** as primary evidence. Ask whether to inspect stored transcripts only when repetition across sessions matters.

### 2. Collect Evidence

Use progressively larger context:

1. Summarize what already happened **in this chat**.
2. List candidate transcripts (`list`) if cross-session repetition is relevant.
3. Extract only the relevant transcript(s) (`extract`).
4. Pull exact snippets only when needed to prove the pattern.

For each session, capture:

- Transcript path, session ID, project slug, and modified time (internal use).
- User goal (first user message / query).
- Assistant mistake or failed approach.
- Correction or eventual successful behavior.
- Tool errors, missed instructions, or ignored project context.

### 3. Diagnose the Root Cause

Classify the cause before proposing a fix:

- **Missing trigger**: the model did not know when to use a workflow.
- **Missing procedure**: the model lacked a checklist or sequence.
- **Ignored constraint**: existing instructions were present but too weak or buried.
- **Bad tool habit**: the model used the wrong tool or command repeatedly.
- **Knowledge gap**: the model needed domain-specific references.
- **Ambiguous user intent**: the model should have asked a clarifying question.

### 4. Choose the Durable Fix

Create or update a skill only if all are true:

- The problem is likely to recur.
- A future trigger can be described in the skill `description`.
- The fix is procedural or checklist-like.
- The skill can include concrete “do/don’t” guidance and verification steps.

Otherwise propose `AGENTS.md`, `.cursor/rules/`, docs, tests, prompt templates, or tooling changes.

### 5. Draft the Corrective Skill

When a new skill is warranted, draft it with:

- A short lowercase hyphenated name matching its directory.
- A precise `description` that states when to use it.
- **When to Use** — concrete trigger phrases or task shapes.
- **Procedure** — steps that prevent the observed mistake.
- **Anti-Patterns** — repeated bad behavior.
- **Verification** — how to prove the mistake was avoided.
- **Evidence** — session ID/date only; no sensitive transcript content.

Use this skeleton:

```markdown
---
name: corrective-skill-name
description: Prevents <specific recurring mistake>. Use when <clear future trigger>.
---

# Corrective Skill Name

## When to Use

- ...

## Procedure

1. ...

## Anti-Patterns

- Do not ...

## Verification

- Confirm ...

## Evidence

- Derived from Cursor session <id/date>; details intentionally summarized.
```

### 6. Apply Carefully

| Target | Location |
|--------|----------|
| Personal Cursor skill | `~/.cursor/skills/<name>/SKILL.md` |
| Project Cursor skill | `.cursor/skills/<name>/SKILL.md` |
| Always-on project rules | `AGENTS.md`, `.cursor/rules/*.mdc` |
| This skills repo | `skills/<name>/SKILL.md` (sync via `~/.agents/skills` conventions) |

If updating an existing skill, edit the smallest relevant section. New Cursor skills may require starting a **new chat** or re-attaching the skill so discovery picks up changes.

### 7. Optional: persist an approved lesson

Only after the user **approves** the durable fix:

- Write the skill/rule/doc as above.
- Optionally store a **one-line, non-secret summary** with AgentMemory / `memory_save` (tags: `session-lesson`, project, root-cause class) if available.
- Never auto-save without approval.

## Optional extensions

- **Scope & boundaries:** [references/scope-and-extensions.md](references/scope-and-extensions.md)
- **Post-session reminder hook (not auto-analysis):** [examples/hooks-session-end-reminder.md](examples/hooks-session-end-reminder.md)

## Output Format

When reporting back, use:

```markdown
# Session Lessons Report

## Pattern

<one-sentence repeated mistake>

## Evidence

- <current chat or session/date>: <brief redacted evidence>

## Root Cause

<classification plus explanation>

## Recommended Durable Fix

<new skill | existing skill update | AGENTS.md | docs/tooling>

## Proposed Change

<summary or path written>

## Follow-up

<new chat / rule sync / test instructions>
```

## Quality Bar

A good result prevents future behavior, not just describes the past. The durable fix should be specific enough that a fresh agent can load it, recognize the trigger, and avoid the same mistake without rereading the original transcript.
