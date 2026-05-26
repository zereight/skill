---
name: zereight-review
description: Comprehensive code review skill for practical PR feedback. Use for feature, bugfix, and refactor reviews. Prioritizes correctness, edge cases, logic invariants, fallback-chain safety, async state transitions, architecture analysis, OWASP security, and clear actionable feedback.
---

# zereight-review

Prioritize **correctness and risk** over style nitpicks.
Default tone: concise, direct, actionable.

## Mandatory Review Ensemble -- NON-NEGOTIABLE

When the user invokes `zereight-review`, `$zereight-review`, or asks to use the
Zereight review skill, do not complete the review from a single reviewer pass.
You must run a multi-skill, subagent-based review ensemble first, then synthesize
the results.

Required instruction sources to load before reviewing:

- Nearest repo `AGENTS.md`
- `/Users/tao.exe/.codex/instructions.md`
- `/Users/tao.exe/.codex/AGENTS.md`
- `codegraph-review-routing` when CodeGraph MCP is available or the review needs impact/call-chain context
- `code-review`
- `code-review-expert`
- `code-reviewer`
- `agent-skills:code-review-and-quality`
- `agent-skills:using-agent-skills`
- `thermo-nuclear-code-quality-review`

Required subagent review passes:

| Subagent pass | Builtin agent | Model (required) | Required basis | Review focus |
| --- | --- | --- | --- | --- |
| Baseline full-diff reviewer | `reviewer` | `opencode-go/deepseek-v4-pro` | `code-review` | finding-first output, severity, full diff coverage, `comment-worthy` / `no comment` |
| Regression and contract reviewer | `reviewer` | `opencode-go/deepseek-v4-pro` | `code-review-expert` | behavioral regressions, API/prop contracts, hidden state and edge-case risk |
| File coverage reviewer | `worker` | `opencode-go/deepseek-v4-flash` | `code-reviewer` | every changed file and hunk, missing tests, maintainability risks |
| Quality gate reviewer | `worker` | `opencode-go/deepseek-v4-flash` | `agent-skills:code-review-and-quality` | correctness, reliability, maintainability, security, test quality |
| Thermo-nuclear maintainability reviewer | `reviewer` | `opencode-go/deepseek-v4-pro` | `thermo-nuclear-code-quality-review` | code judo / structural simplification, 1k-line boundary, spaghetti branching, abstraction quality, layer boundaries |
| Agent orchestration reviewer | `delegate` | `opencode-go/deepseek-v4-flash` | `agent-skills:using-agent-skills` | whether the work was split correctly and whether any review lens is missing (including thermo-nuclear pass) |
| Zereight coordinator | (parent) | parent session model | this skill | three-dot diff, RED-team mindset, verification discipline, final synthesis |

## Ensemble model policy — MANDATORY

Zereight review subagents use **only** these models unless the user explicitly
requests a different provider:

| Model | Use for |
| --- | --- |
| `opencode-go/deepseek-v4-pro` | Baseline + Regression (`reviewer`) — deeper reasoning, contract/regression analysis |
| `opencode-go/deepseek-v4-flash` | File coverage + Quality gate (`worker`), Orchestration (`delegate`) — breadth, five-axis gate, meta review |
| `cursor/composer-2.5` | **Last-resort fallback** when OpenCode Go fails (429, quota, rate limit) — matches `defaultProvider`/`defaultModel` in `~/.pi/agent/settings.json` |

**Ordered fallback chain (pi-subagents auto-retries on 429/quota):**

| Agent | Primary | Then | Last resort |
| --- | --- | --- | --- |
| `reviewer` | `deepseek-v4-pro` | `deepseek-v4-flash` | `cursor/composer-2.5` |
| `worker` | `deepseek-v4-flash` | `deepseek-v4-pro` | `cursor/composer-2.5` |
| `delegate` | `deepseek-v4-flash` | `deepseek-v4-pro` | `cursor/composer-2.5` |

Configured in `~/.pi/agent/settings.json` → `subagents.agentOverrides.*.fallbackModels`.
pi-subagents treats 429 / rate-limit / quota errors as retryable and walks this list automatically.

**Never rely on builtin default models** (`claude-sonnet-4-6`, `openai-codex/gpt-5.3-codex`, etc.).
User-level overrides live in `~/.pi/agent/settings.json` under
`subagents.agentOverrides`, but **still pass `model` on every spawn** so the
runtime cannot fall back to Claude when quota is exhausted.

Execution rules:

- Spawn separate subagents for the required review passes whenever the runtime
  supports subagents. Give each subagent the exact PR/range, target branch,
  repository path, the relevant instruction sources, and the **model from the
  table above**.
- Every subagent must follow the repo `AGENTS.md` and global Codex instructions
  in addition to its review skill.
- Do not return the final review until every required pass has either completed
  or is explicitly blocked.
- All review subagents must use Pi builtin agents (`reviewer`, `worker`,
  `delegate`) with an explicit `model` parameter. **Do not** spawn without
  `model` — builtin `worker` defaults to Claude and will burn quota.
- **Do not** route review passes through Claude, Claude Code, Chorus, or any
  Claude-backed external agent unless the user explicitly requests Claude.
- If a subagent fails with provider/model/quota errors (including **429** from
  OpenCode Go), pi-subagents retries the ordered `fallbackModels` chain in
  settings: paired DeepSeek (`pro` ↔ `flash`), then **`cursor/composer-2.5`**
  (session default). Do not retry Claude paths unless the user explicitly
  requests Claude.
- If spawn still fails after the full chain, report which models were attempted
  and continue synthesis from completed passes — do not block the final review.

**Parallel spawn example (pi-subagents / `subagent` tool):**

```json
{
  "tasks": [
    {
      "agent": "reviewer",
      "model": "opencode-go/deepseek-v4-pro",
      "task": "Baseline full-diff review. Skill: code-review. PR: ..."
    },
    {
      "agent": "reviewer",
      "model": "opencode-go/deepseek-v4-pro",
      "task": "Regression and contract review. Skill: code-review-expert. PR: ..."
    },
    {
      "agent": "worker",
      "model": "opencode-go/deepseek-v4-flash",
      "task": "File coverage review. Skill: code-reviewer. PR: ..."
    },
    {
      "agent": "worker",
      "model": "opencode-go/deepseek-v4-flash",
      "task": "Quality gate review. Skill: code-review-and-quality. PR: ..."
    },
    {
      "agent": "reviewer",
      "model": "opencode-go/deepseek-v4-pro",
      "task": "Thermo-nuclear maintainability review. Skill: thermo-nuclear-code-quality-review. PR: ..."
    }
  ],
  "concurrency": 5
}
```

Then spawn orchestration separately:

```json
{
  "agent": "delegate",
  "model": "opencode-go/deepseek-v4-flash",
  "task": "Orchestration review: verify all ensemble axes were covered. ..."
}
```

**Final synthesis must list models used**, e.g. `reviewer ×3 (deepseek-v4-pro),
worker ×2 (deepseek-v4-flash), delegate (deepseek-v4-flash)`.

**Single-pass fallback (subagent unavailable):** If the runtime does not support
subagent spawning AND the user explicitly approves (e.g., by switching to
/review mode, stating "fallback" or "single pass"), skip the ensemble and
do a thorough self-contained review instead. Requirements:
  1. State that subagent ensemble is unavailable.
  2. Confirm user approval (explicit wording or known review-mode flag).
  3. Still load all six reviewer instruction sources sequentially (including
     `thermo-nuclear-code-quality-review`).
  4. Cover all ensemble axes in one pass: correctness, security, regression,
     architecture/contracts, clean code, thermo-nuclear maintainability.
  5. Apply full-diff coverage, RED-team mindset, and verification discipline.
  6. If the user did NOT approve fallback, stop and report the blocker.

## Subagent Failure Budget — MANDATORY

Subagent claims are not primary evidence. A claim becomes a finding only
after current-turn primary evidence (diff, file contents, tests, CI logs,
rtk-grepped source, or reproducible output) confirms it.

Rules:

1. A subagent failure or stuck verification is not a blocker — it is a
   signal to move on.
2. If a verification path (e.g., live API call, official docs fetch) fails
   once, retry at most once **only when** the result is necessary for a
   P0/P1 decision.
3. If the same verification path fails 2 times total, stop pursuing it
   immediately. Do not try a third approach.
4. If 2+ subagent/verification attempts fail for the same claim, treat
   the claim as **unusable** for review purposes. Either discard it or
   note it as unverified residual risk — never as a blocker.
5. Never spend more than one bounded verification pass on any P2/🟡 Minor
   or lower concern.
6. When verification fails without logs, state "unverified; not used as
   blocker" and continue producing the final review.
7. Do not block the final review waiting for a subagent or verification
   to complete. Synthesize from what is already available, mark any gaps,
   and deliver.

If subagent spawning IS available, use it — do NOT default to single-pass.
- Keep raw diff output out of the conversation context when possible. Prefer
  context-mode indexing/search for large diffs, and use three-dot diff against
  the target branch.

## MCP transport — mcporter CLI only (MANDATORY)

Zereight review **never** treats Cursor/Codex native MCP (`mcp_get_tools`,
`mcp_call_tool`, MCP panel server list) as the source of truth for mcporter
inventory. Those lists read `~/.cursor/mcp.json` / `~/.codex/config.toml` and
can be empty even when `~/.mcporter/mcporter.jsonc` has healthy servers.

### Canonical registry and invocation

| Concern | Source of truth | How to invoke |
| --- | --- | --- |
| Server inventory | `~/.mcporter/mcporter.jsonc` | `mcporter list` or `mcporter list <server>` |
| Tool schema | mcporter | `mcporter list <server> --schema` (when needed) |
| Tool execution | mcporter CLI | `mcporter call <server>.<tool> ...` |

**Always** run MCP tools for this skill through the shell, e.g.:

```bash
mcporter call fuck-u-code.analyze \
  path="<bounded-path>" \
  format=json top=15 verbose=false
```

Do **not** substitute `mcp_call_tool` for `mcporter call` during review.

### Cursor / Codex exposure (mcporter-bridge)

Register **`mcporter-bridge`** in `~/.cursor/mcp.json` (and optionally
`~/.codex/config.toml`) when the user wants the **full mcporter inventory**
visible in the IDE MCP UI. Use the pipx binary path, not
`python3 -m mcporter_bridge` (often missing):

```json
"mcporter-bridge": {
  "command": "/Users/tao.exe/.local/bin/mcporter-bridge",
  "args": []
}
```

Bridge exposes discovery/call helpers (`mcporter_list_servers`,
`mcporter_call_tool`, etc.). Even with bridge loaded, **zereight-review
preflight and PR fetches still use `mcporter call` directly** — bridge is for
human/IDE visibility, not the review execution path.

### Availability mistakes to avoid

| Wrong check | Why it fails | Correct check |
| --- | --- | --- |
| `mcp_get_tools` shows no `fuck-u-code` | Cursor `mcp.json` may omit servers | `mcporter list fuck-u-code` |
| Memory from prior session | Config changes across reloads | Fresh `mcporter list` each review |
| Assuming reload fixed MCP | Reload does not import `mcporter.jsonc` into Cursor | CLI `mcporter list` + optional `mcp.json` edit |

If `mcporter list fuck-u-code` shows tools with non-offline status → **available**.
State **`fuck-u-code preflight run (mcporter CLI)`** in the final review.
Only write **`skipped (unavailable)`** when `mcporter list` or `mcporter call`
fails (binary missing, server offline, timeout, schema mismatch).

Review preflight safeguards:

- Before broad file reading, use context-mode to reduce the diff to changed
  files/symbols and high-risk hunks. If CodeGraph MCP is available, run a
  bounded impact pass for changed symbols that need surrounding context:
  callers, usages, call chains, affected screens/hooks/navigation/API
  boundaries, and hotspot/coupling candidates. Treat CodeGraph output only as
  candidate discovery; every finding still needs current-turn primary evidence
  from the diff, file contents, tests, logs, or context-mode search.
- Do not use CodeGraph for Bitbucket/Jira/Confluence/internal connector reads;
  those remain mcporter-first with schema inspection. Do not use CodeGraph for
  large diff/log processing; those remain context-mode. Do not use CodeGraph as
  durable memory; agentmemory remains curated and verified only.
- If CodeGraph output is `_truncated`, stale, unresolved, or conflicts with file
  evidence, do not cite it as review evidence. Narrow the query once or fall
  back to context-mode plus file evidence.
- RTK command rewrites can fail silently for simple read commands such as
  `rtk rewrite "sed ..."`. If that happens, do not stall the review. Use the
  repo-approved RTK form when the hook provides one, prefer `rtk grep` /
  `rtk git` for searched or git commands, and keep direct file reads narrowly
  bounded when reading required instruction or skill files.
- If the nearest repo `AGENTS.md` is missing, do not treat that as permission to
  ignore repo instructions. Use any AGENTS instructions supplied in the current
  conversation as the repo instruction source, state that fallback, and continue.
- For React or React Native PRs, include `npx react-doctor@latest` in
  verification. Run it from the repo root when package-manager and network
  access allow it. If it cannot run, report the exact command and blocker.
- **MANDATORY: Check fuck-u-code availability BEFORE any preflight or
  ensemble step.** Run **`mcporter list fuck-u-code`** (CLI only — see
  **MCP transport — mcporter CLI only** above). Confirm the server appears
  with a non-failure status (tool count + latency, not "offline" or "error").
  Do NOT use `mcp_get_tools` for this gate. Do NOT skip this check. Do NOT
  assume availability from memory, Cursor reload, or prior sessions.
  - If available AND the PR has substantial logic changes (not just
    locales/styles/tests/assets-only), run the bounded static analysis below
    via **`mcporter call fuck-u-code.analyze`**.
  - If NOT available (`mcporter` missing, `mcporter list` offline, `mcporter
    call` fails): state "`fuck-u-code preflight skipped (unavailable — mcporter
    CLI)`" and continue. Do NOT block the review.
  - If `mcporter list` succeeds but you skip `mcporter call` without reason
    (as in PR #2217 / #2182): **PROCESS VIOLATION**. The preflight line must
    be either **`fuck-u-code preflight run (mcporter CLI)`** or **`skipped
    (reason)`**. Silence is not permitted.
  1. From the three-dot diff or PR metadata, extract the list of changed files.
     Filter to `*.ts`, `*.tsx` only; exclude `**/*.test.*`, `**/__snapshots__/**`,
     `**/locales/**`, `dist/`, `node_modules/`.
  2. Determine the common parent path(s) of the changed files (typically 1-2).
     Never scan the entire workspace — only the bounded paths. If changed
     files span multiple disjoint paths, run the analysis for each path.
  3. Invoke `analyze` through mcporter:
     ```
     mcporter call fuck-u-code.analyze \
       path="<common-parent-path>" \
       format=json top=15 verbose=false
     ```
  4. From the JSON output, extract `files[].score` and `files[].metrics[]`.
     Keep only files that appear in both the PR diff AND the worst-scoring list.
  5. Read the full content of those files (not just the diff) to understand
     whether the PR is introducing new complexity/duplication or inheriting
     existing legacy. Check: does the new code worsen the metrics?
  6. If the PR inherits existing legacy (file was already bad before this PR),
     note it as ⚪ Info — do not block. If the PR introduces new hotspots
     (complexity/duplication without justification), report as 🟡 Minor.
  7. Never promote fuck-u-code scores to primary findings without file-content
     evidence. Never cite fuck-u-code score alone as 🟠 Major or higher.
  8. On `mcporter call` failure (timeout, unavailable, schema mismatch), skip
     preflight with "`fuck-u-code preflight skipped (mcporter CLI — <reason>)`"
     and continue. Do not retry more than once.
  9. The `ai-review` tool is excluded from the default pipeline — it sends
     code to external APIs and duplicates the zereight ensemble.
- When spawning review subagents, do not combine `fork_context=true` with an
  explicit `agent_type` if the runtime rejects that combination. Retry by
  spawning role-specific agents without `fork_context` and put the exact PR
  range, repository path, target branch, and required instruction sources in
  each agent prompt.
- Never use ambiguous branch names such as `origin/develop` for review diffs if
  local refs can shadow remote refs. Resolve and use full refs:
  `refs/remotes/origin/<target>...refs/remotes/origin/<source>`. If an
  ambiguous ref caused an unexpectedly large diff, discard that result and
  restart scoping from the full-ref three-dot diff.

Synthesis rules:

- Merge findings from all subagents into one final review (including
  thermo-nuclear structural/maintainability findings).
- Map thermo-nuclear **presumptive blockers** (1k-line explosion, spaghetti
  special-case growth, missed code-judo simplification, boundary leaks) into
  zereight severity when primary evidence confirms: structural regression with
  user-facing risk → 🟠 Major; maintainability-only → 🟡 Minor or 🛠️ refactor;
  decomposition opportunity with no behavior risk → 🔵 Trivial. Do not promote
  thermo tone alone without file/line evidence.
- De-duplicate overlapping findings and keep the strongest, most concrete file
  and line reference.
- If reviewers disagree, state the disagreement briefly and choose the outcome
  supported by code evidence.
- Preserve whole-diff coverage by listing changed files as `comment-worthy` or
  `no comment`.
- Lead with actionable findings ordered by severity. Keep summaries secondary.

## RED Team Mindset -- MANDATORY

You are an adversary, not a rubber stamp. Your job is to break the code, not confirm it works.

- **Think like an attacker**: For every change, ask "How can this fail? How can this be exploited? What input breaks this?"
- **Never trust the happy path**: Code that works for expected inputs is the baseline, not the goal. Hunt for the unexpected.
- **Simulate hostile inputs**: Empty strings, negative numbers, null, undefined, MAX_SAFE_INTEGER, special characters, concurrent calls, network timeouts.
- **Challenge assumptions**: If the author assumes X is always true, find the scenario where X is false.
- **Question removed code**: Deleted code had a reason to exist. Verify the reason is truly gone, not just hidden.
- **Trace error propagation end-to-end**: Follow every throw/reject/return-undefined through all callers. One unhandled path = one crash in production.
- **Don't approve because it "looks fine"**: If you can't construct a specific failure scenario, dig deeper -- absence of evidence is not evidence of absence.

## Verification Discipline — MANDATORY

Theoretical analysis is NOT enough. Every claim about library behavior, framework semantics, or runtime performance must be **empirically verified** before assigning severity.

### Rule 1: Theoretical claims require evidence

Before labeling any finding as 🟠 Major or higher based on framework/library behavior, verify with **at least one** of:

- **Source grep**: `node_modules` source of the relevant library
- **Official docs**: documented behavior from the library's docs
- **Actual usage sites**: grep the codebase for how the construct is used in practice
- **Reproduction test**: runnable test case demonstrating the bug

If you can only say "theoretically this could..." without one of the above, demote to 🔵 Trivial or 🟡 Minor until verified.

### Rule 2: Detection triggers — STOP and verify

When drafting a finding, if you write any of these phrases, STOP and verify:

- "이론적으로는 ~~" / "theoretically ~~"
- "~~ 일 수도 있다" / "this could ~~"
- "`useMemo` / `useEffect` / `SharedValue` / context 동작" (React/reanimated semantics)
- "라이브러리 X는 ~~한다" (library behavior assertion)
- "이 setState는 re-render를 일으켜 jank를 유발한다" (performance claim without measurement)

### Rule 3: Verification patterns by claim type

| Claim type | How to verify |
|---|---|
| React hook semantics (`useMemo` deps, `useEffect` closure) | Grep actual usage sites; check React docs reference |
| Reanimated SharedValue / worklet | Grep `node_modules/react-native-reanimated/src/`; check Reanimated docs |
| `@gorhom/bottom-sheet` animatedIndex vs onChange | Grep `node_modules/@gorhom/bottom-sheet/src/`; inspect when callbacks fire |
| List virtualization (FlashList, FlatList) | Check item count and render path |
| Performance (re-render frequency, memo effectiveness) | Count actual trigger events in real usage, not hypothetical worst case |

### Rule 4: Signal-Trigger Investigation — upstream root cause

Defensive code is a **symptom**, not a solution. When you see these signals, investigate the upstream cause:

**Signals**:
- Defensive JSDoc mentioning "stable id", "fallback for ...", "workaround for ...", "client-defined"
- Type assertions: `as unknown as T`, enum values cast from raw `int` (`1 as TermCategory`)
- Mock/stories comments: "duplicate rows", "non-enum ints", "dev server returns ...", "garbage data"
- `// FIXME`, `// TODO`, `// HACK` comments
- Array-index-based key synthesis (`groupIndex + periodIndex + value`)
- Over-complex null-handling for "should never happen" cases

**Action**:
1. Read the JSDoc / comment in full
2. Check referenced mock data / stories for actual server response shape
3. Trace whether the root cause is fixable upstream (server API, schema, type contract)
4. Report upstream issue as a separate finding — don't just say "defensive coding is fine"

### Rule 5: Mock/Stories = API shape evidence

Mock files and `.stories.tsx` often contain real server response samples or dev-server captures. **Include them in review scope**:

- Read `*.stories.tsx` `args` / mock constants
- Check for comments like "sample from api-grpc-{env}", "dev server snapshot"
- Duplicate/malformed mock data = signal of real server data quality issue
- Do NOT dismiss stories as "test fixtures, not production concern"

### Failure cases — lessons (calibration)

Document your own missed findings here to build calibration:

- **PR #1790 M-3 (SharedValue useMemo staleness)**: Theoretical claim that `useMemo([sharedValue], …)` wouldn't re-run on `.value.length` change. Verification showed `buildFilterableSheetSnapPoints` always returns 2-element array → no actual staleness. Demoted Major → Trivial.
- **PR #1790 M-6 (onChange re-render jank)**: Theoretical claim that setState in bottom-sheet onChange causes jank during drag. Library docs confirm `onChange` fires only at snap settle, not during drag → no jank. Demoted Major → Trivial.
- **PR #1790 period row key**: JSDoc "same length can appear in multiple groups" + stories mock comment "duplicate `0` rows, non-enum `term` ints" were ignored as "defensive coding". Actually evidence of server API data quality issue requiring backend attention. Missed the upstream root cause entirely.

## Full-Diff Inline Comment Mindset -- MANDATORY

Review every PR as if you are going to leave inline comments on the full diff, even when the final output is a summarized review.

- Do not stop after finding the first major issue. Continue through every changed file and every changed hunk.
- For each changed file, make an explicit internal decision: `comment-worthy` or `no comment`, instead of silently skipping it.
- Assume each diff hunk may need its own comment. Even if you later collapse findings in the final write-up, the review process must still inspect the full diff at inline-comment granularity.
- Distinguish clearly between:
  - actual findings that deserve comments
  - changed areas reviewed and intentionally passed with no comment
- When synthesizing the final review, preserve whole-diff coverage. The output should reflect that the PR was reviewed file-by-file, not just around the most obvious issue.
- If the user asks for a PR review without extra direction, default to this mindset automatically.

## Workflow -- always follow this sequence

### PR Identity Gate — MANDATORY

When the user provides a PR URL, the PR metadata is the source of truth.
Before reading any diffs or starting the review:

1. Fetch PR metadata first (prefer mcporter `bb_get_pr` with `includeFullDiff=true`):
   - PR id, source branch, destination branch, source commit, destination commit, PR state
2. Compare the current local HEAD/current branch with the PR source branch.
   - If they **do not match**, do NOT review local HEAD. Explicitly state the mismatch.
3. Review only the PR diff:
   - Prefer Bitbucket/mcporter PR diff (`bb_get_pr` with `includeFullDiff=true`).
   - If using git, use:
     `refs/remotes/origin/<destination>...refs/remotes/origin/<source>`
   - Never use `HEAD` unless PR metadata confirms HEAD is the PR source.
4. If PR metadata cannot be fetched, stop and ask for clarification.
   - Do not infer the PR from the current branch.

### Step 1: Fetch and diff against origin/develop (THREE-DOT DIFF)

**CRITICAL: Always use three-dot diff (`...`) not two-dot diff (`..`).**
Two-dot diff includes changes from the target branch that were merged after the PR branch was created, producing false positives. Three-dot diff shows only changes introduced on the PR branch (merge-base diff) -- this matches what Bitbucket/GitHub PR pages display.

### For Bitbucket repos with mcporter configured (preferred)
When git commands are blocked (e.g., read-only review mode), fetch the diff
via mcporter Bitbucket MCP first:

- PR metadata + diff: `mcporter call bitbucket.bb_get_pr workspaceSlug=<ws> repoSlug=<repo> prId=<PR_ID> includeFullDiff=true`
- Comments: `mcporter call bitbucket.bb_ls_pr_comments workspaceSlug=<ws> repoSlug=<repo> prId=<PR_ID>`
- Source files: `mcporter call bitbucket.bb_get_file workspaceSlug=<ws> repoSlug=<repo> filePath=<path>`
- Fall back to git when mcporter is unavailable or fails.

### For direct git access (fallback)

```bash
git fetch origin
git diff origin/develop...HEAD --stat
git diff origin/develop...HEAD
```

Reference script: `references/three-dot-diff.sh` (supports custom target branch and output modes).

- Use `--stat` first to get the full list of changed files.
- Then read the full diff to understand every change.
- If the branch is behind origin/develop, note it but still proceed with the diff.
- If the diff looks unexpectedly large, verify you are using `...` (three dots) not `..` (two dots).

### Step 2: Understand codebase context

Before evaluating any finding, understand the domain and conventions:

- Read `CLAUDE.md` or `LLM.md` at the repo root if present — these define project-wide conventions.
- Identify the feature domain (auth, transfer, account, etc.) and apply domain-appropriate risk weighting:
  - Payment/auth flows → higher severity bar
  - UI-only changes → lower severity bar
- Check what design system components, hook wrappers, and DI patterns are in use.
- Note any existing patterns in nearby unchanged files to distinguish "new smell" from "existing convention".

### Step 3: Review each changed file in detail

For every file in the diff:

1. Read the full file, not just the changed lines — understand the full component/module shape.
2. Identify the file's role (screen, hook, service, util, type, test).
3. Apply all mandatory logic checks to that file's specific logic.
4. Note findings scoped to that file before moving to the next.

Group findings by file in the output. Do not mix findings from different files in one paragraph.

### Step 4: Synthesize and output

After reviewing all files, write the final review following the output template.

---

## When to use

Use this skill when:

- Reviewing PRs, diffs, commits, or changed files
- Verifying bugfix safety and regression risk
- Checking logic with optional inputs, fallbacks, and async flows

## Review goals

1. Find defects that can affect users or data.
2. Detect edge cases hidden behind “usually works” paths.
3. Provide minimal, practical fixes with clear reproduction conditions.
4. Keep feedback short and high-signal.

## Priority order

1. Functional correctness
2. Security (OWASP Mobile/Web) & data integrity
3. State consistency & async timing
4. API contract/type safety
5. Performance hotspots
6. Module composition & data flow architecture
7. Clean code (naming, structure, component design)
8. Maintainability/readability

## Mandatory logic checks (always run)

1. **Invariant checks**
   - Identify paired/related values that must stay consistent.
   - Examples: `(count, maxCount)`, `(value, unit)`, `(start, end)`, `(id, status)`.

2. **Partial-input checks**
   - Test cases where only some optional fields/props are provided.
   - Verify behavior for missing counterpart values.

3. **Fallback-chain checks**
   - Trace `??`, `||`, ternary chains.
   - Confirm precedence and source-of-truth are not contradictory.

4. **State vs UI checks**
   - Ensure render conditions match computed data conditions.
   - Detect hidden invalid states (data exists but UI hides it, or vice versa).

5. **Boundary checks**
   - Validate `0`, negative, `undefined`, empty string, large values, max/min boundaries.
   - Require clamps/guards where needed.

6. **Async/race checks**
   - Check stale closure/state usage.
   - Verify open/close/reset/submit/error ordering.
   - Ensure loading flags recover in all paths.

7. **UI consistency checks**
   - Scan repeated UI patterns (section labels, headers, list items, cards) for style mismatches.
   - Verify fontSpec, themedColor, spacing, padding are identical across elements that serve the same visual role.
   - Flag when one sibling element uses a different token than the rest (e.g., FONT.B16 vs FONT.B18 for section labels in the same screen).
   - Check icon sizes, border radii, and gap values for consistency within a component group.

8. **State transition UX checks**
   - When React `key` changes cause remount, verify user input is either preserved, impossible before the transition, or explicitly discarded with clear UX (loading skeleton, disabled fields).
   - Detect "input loss on async load" pattern: form renders with placeholder defaults → async data arrives → key change remounts form → any user input typed before load is silently lost.
   - Verify loading→loaded transitions: are interactive fields disabled or hidden during loading? Does the transition cause layout shift or flash of empty content?
   - Check that `disabled` state covers all interactive elements (inputs, dropdowns, buttons) during loading, not just the submit CTA.

9. **Expensive-before-cheap checks**
   - Before any API call or I/O operation, check if there's a condition that could skip it.
   - Trace function calls into their internals — if a cheap check (e.g., `isSupported`, `isEnabled`, feature flag) lives inside a called function, verify it runs before any expensive operation in the caller.
   - Pattern to detect: API call on line N, condition check inside function called on line N+1.
   - Fix: Hoist the cheap check before the expensive operation.
   - Example: `GetChallenge()` called before `generateAttestation()` which checks `isSupported` internally → wasteful API call on unsupported devices.

10. **Refactor-only layout responsibility checks**
    - When a PR claims "only code location changes" or extracts a base component, build a before/after **style ownership map** before concluding equivalence. Map every style property to its owner in both versions.
      - interactive wrapper: Pressable / AnimatedPressable / Touchable
      - content layout row
      - child text/icon/image layout
      - feedback/ripple/overlay boundary
      - reusable base component boundary
    - Check these specific risks:

      **Style owner changed**
      - `flexDirection`, `gap`, `alignItems`, `padding`, `flex`, `alignSelf`, `justifyContent`
      - Moving a style from pressable container to inner view can silently change hit area, feedback area, measurement (flex-basis), or parent layout behavior.
      - Example: `paddingHorizontal` on `containerStyle` of `BankXAnimatedPressable` vs inner `BankXView` — padding moves out of the pressable feedback boundary.

      **Conditional style names hide behavior**
      - Names like `whenLogoStyle` must describe the actual effect, not the triggering condition.
      - If the style value is `alignItems: 'center'`, review it as row alignment, not "logo styling".
      - Flag names that make a layout invariant look like a visual detail.

      **Extracted base component leaks parent assumptions**
      - `flex: 1`, `alignSelf: 'stretch'`, absolute sizing, or margins inside a reusable base component are red flags.
      - Base components should expose layout props (via `style`) or keep parent-owned layout in the wrapper.
      - If `flex: 1` is added only for width fill, verify it won't cause height expansion when reused inside a column parent with bounded height.

      **Intent, not just same values**
      - If `MY_BANK` and logo-based accounts intentionally align differently, the reason should be obvious from naming or comments.
      - If not, ask for clarification or suggest explicit named styles.
    - Review output guidance:
      - If behavior likely still works but intent/reuse risk is unclear, report as 🔵 Trivial or 🟡 Minor.
      - Do not say "layout equivalent" until style ownership and reusable-boundary effects are verified.

## Architecture review checks (run when PR adds hooks, services, or screens)

When a PR introduces new modules, hooks, services, or screens (or significantly restructures existing ones), evaluate architecture quality. Skip for trivial single-file changes.

1. **Composition & responsibility**
   - Each hook/module should have a single, clear responsibility.
   - Detect God-hooks or God-screens that mix data fetching, business logic, UI state, and navigation.
   - Verify separation: data hooks vs UI hooks vs orchestration hooks.
   - Check if a hook does too many things that should be split.

2. **Data flow clarity**
   - Trace how data moves: props → hook → state → render. Identify implicit coupling.
   - Evaluate ref vs state choices: refs for values that don't trigger re-render, state for values the UI depends on.
   - Flag unnecessary indirection (getter callbacks wrapping refs, redundant wrappers).
   - Check prop drilling depth — suggest context or composition when drilling exceeds 3 levels.

3. **Error handling strategy**
   - Is error handling centralized (single error handler) or distributed (per-callsite try-catch)?
   - Verify failure code → UX mapping consistency: same error code should produce same user experience.
   - Detect missing error paths: what happens when an API call fails but no handler catches that specific failure code?
   - Check error handler completeness: does the switch/if-chain cover all known failure codes?

4. **Interface design**
   - Function/hook parameters: prefer named params (object destructuring) over positional args when >2 params.
   - Naming: domain-specific names over generic (`useCardlessWithdrawalSubmit` > `useSubmit`).
   - Return types: explicit and narrow, not `any` or overly broad unions.
   - API surface: does the module expose only what consumers need?

5. **Navigation patterns**
   - Push vs replace: replace for correction flows (edit → confirm), push for new destinations.
   - Screen lifecycle: does the screen clean up state on unmount? Does going back produce stale state?
   - Deep link readiness: can the screen be entered directly with params, or does it depend on prior screen state?

6. **Cross-cutting consistency**
   - i18n: detect hardcoded user-facing strings (English or any language) that should use translation keys.
   - DI patterns: services accessed via `dependencyContainer.get()` with proper TYPES, not direct imports of implementations.
   - Design system: raw RN primitives (`View`, `Text`) instead of design system components.
   - Consistent patterns: does the new code follow the same patterns as neighboring modules?

Architecture findings default to 🔵 Trivial or 🟡 Minor severity.
Exception: data flow bugs or missing error handling gaps that cause user-facing issues → 🟠 Major.

## Security checks — OWASP-based (always run)

Apply to every PR. Weight higher for payment, authentication, data storage, and API integration changes.

Based on OWASP Mobile Top 10 and OWASP Web Top 10:

1. **Insecure Data Storage (OWASP M2)**
   - Detect sensitive data (account numbers, tokens, PII, credentials) stored in plain-text local storage.
   - MMKV, AsyncStorage, UserDefaults, SharedPreferences without encryption → flag.
   - Sensitive data should use Keychain (iOS) / Keystore (Android) / SecureEnclave.
   - Check: is the stored data truly non-sensitive (locale, theme) or PII (account number, national ID)?

2. **Insecure Authentication & Session (OWASP M4)**
   - Token/session handling: verify expiration checks, refresh logic, secure storage.
   - Hardcoded credentials, API keys, or secrets in source code.
   - Re-authentication requirements for sensitive operations (e.g., changing withdrawal limits).

3. **Insufficient Input Validation (OWASP A03/M7)**
   - User input sanitization before API calls or local processing.
   - Amount/quantity boundary validation: negative values, overflow, zero, extreme values.
   - Format validation: regex-based inputs without ReDoS protection.

4. **Sensitive Data Exposure (OWASP A02)**
   - Logging sensitive data (account numbers, tokens, passwords) via `console.log` or error reporting.
   - Error messages exposing internal details (stack traces, server paths, SQL queries) to users.
   - Sensitive data in navigation params that may appear in navigation state dumps.

5. **Double Submission / Idempotency (Payment Flows)**
   - Payment, transfer, and withdrawal flows MUST have double-submission protection.
   - Check for: loading state during API call, CTA disable during submission, idempotency keys.
   - Missing protection in financial flows → 🔴 Critical.

6. **Broken Access Control (OWASP A01)**
   - Client-side-only authorization checks without server verification.
   - UI hiding features based on role but still allowing API calls.
   - Navigation guards that can be bypassed by deep links.

Security severity guide:
- 🔴 Critical: tokens/credentials in plain storage, hardcoded secrets, double submission in payment flows
- 🟠 Major: PII in plain local storage, missing input validation on financial amounts, sensitive data in logs
- 🟡 Minor: debug logging with non-critical data, client-side validation gaps backed by server validation

## Thermo-nuclear maintainability checks (always run via ensemble pass)

Load and apply `thermo-nuclear-code-quality-review` in the dedicated subagent
pass (or single-pass fallback). This is **stricter than** default clean-code
nits: hunt for code-judo simplifications, unjustified 1k+ line files, spaghetti
branching, leaky abstractions, and cast-heavy boundaries.

Coordinator must surface thermo findings in the final review when confirmed by
diff/file evidence. Skip duplicating thermo phrasing if the same structural
issue was already reported — keep the strongest reference.

## Clean code checks (run after security checks)

After security checks, scan for clean code issues. See `references/clean-code.md` for full detail.

Key areas:
- **Naming**: intention-revealing, consistent vocabulary, no misleading names
- **Functions**: single responsibility, no flag arguments, no side effects in getters
- **React/TS**: prop explosion, render-in-render, `any` usage, hook naming, effect scope
- **React Effect anti-patterns**: derived state via Effect, event logic in Effect, Effect chains, fetch without cleanup — see `references/react-effect-guidelines.md`
- **React Native**: StyleSheet outside component, inline styles in hot paths, raw primitives instead of design system components
- **React Doctor**: for React/RN PRs, run `npx react-doctor@latest` and review reported effect/render/performance risks
- **React Native performance**: for RN PRs, also run `zereight-react-native-optimizer` to check rendering, animation, and native regressions

Report clean code findings as 🔵 Trivial or 🟡 Minor only. Never block a merge for clean code alone.

## Case matrix requirement

For non-trivial logic, build a compact input matrix and verify outcomes.

Minimum matrix dimensions:

- optional A present/absent
- optional B present/absent
- fallback source (prop/state/default)
- boundary values (0/undefined)

If matrix reveals broken invariant, report as at least **Medium**.

## Review types

Label every finding with a type:

- ⚠️ **Potential issue** — bug, logic flaw, security vulnerability, invariant break
- 🛠️ **Refactor suggestion** — maintainability, performance, cleaner abstraction
- 🧹 **Nitpick** — minor style/naming (only in "thorough" mode, not default)

## Severity levels

Each finding gets a severity icon:

- 🔴 **Critical** — system failure, security breach, data loss, payment error
- 🟠 **Major** — significant functional breakage, wrong business decision, crash in normal flow
- 🟡 **Minor** — incorrect UI from valid input, silent error, invariant break in realistic edge case
- 🔵 **Trivial** — low-impact code quality (non-critical duplication, readability)
- ⚪ **Info** — context or observation, no action required

## Findings format (strict)

For each issue, include:

1. **Type + Severity + Title** e.g. `⚠️ 🟡 Partial override breaks pair invariant`
2. **Condition** (exact input/state combination that triggers this)
3. **Impact** (user/business/technical consequence)
4. **Evidence** `file:line` — short snippet
5. **Minimal fix** (smallest safe change, preferably a code snippet)

## Output Language and Style

Default final review output must be Korean unless the user explicitly asks for another language.

Write findings in plain Korean, not terse English review jargon. Keep technical terms only when needed, and explain them briefly.

Use this output order:
1. `전체 요약`
2. `좋은 점`
3. `리뷰 코멘트`
4. `파일별 리뷰 결과`
5. `검증 결과`

In `검증 결과`, include:

- **thermo-nuclear** row: `thermo-nuclear pass completed` / `thermo-nuclear pass skipped (subagent blocked)` / `thermo-nuclear covered in single-pass fallback`
- **fuck-u-code** row using mcporter CLI status only:

| Result | Wording |
| --- | --- |
| Ran | `fuck-u-code preflight run (mcporter CLI)` + bounded path(s) |
| Skipped — no logic | `fuck-u-code skipped (assets/locales/tests only)` |
| Skipped — unavailable | `fuck-u-code preflight skipped (unavailable — mcporter CLI)` + reason |

Never report `skipped (unavailable)` because Cursor `mcp_get_tools` lacked the
server. If `mcporter list fuck-u-code` is healthy, you must run or explicitly
skip with a PR-scoped reason (e.g. assets-only).

For each finding, use these sections:
- 위치
- 조건
- 문제
- 영향
- 최소 수정

Do not provide only an English-style table. The final synthesis must be understandable to Korean engineers who want practical review comments.

## Review behavior rules

- Do not flood with style-only comments.
- Do not suggest large refactors unless required for safety.
- Prefer minimal patches over architectural rewrites.
- If uncertain, state assumption explicitly.
- Every Medium/High issue must have a reproducible condition.

## Quick heuristics

- If two values are displayed as a pair, they must be computed as a pair.
- If override is partial, decide: reject, complete with default, or hide coherently.
- If fallback source changes by branch, verify all branches preserve invariants.
- If async sets loading true, verify all exits set it false.

## Example finding (reference style)

- **[Medium] Partial override breaks pair invariant**
  - **Condition:** `mismatchedCountProp` provided, `maxAttemptCountProp` absent, local state count is 0.
  - **Impact:** error count UI may be suppressed or inconsistent with provided override intent.
  - **Evidence:** `bottom-sheet-pin.tsx` value derivation paths for `mismatchedCount` / `maxAttemptCount`.
  - **Minimal fix:** derive both values from a shared source rule (prop pair > state pair > undefined), or require pair-wise prop validation.
