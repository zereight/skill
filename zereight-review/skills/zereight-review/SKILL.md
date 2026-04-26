---
name: zereight-review
description: Comprehensive code review skill for practical PR feedback. Use for feature, bugfix, and refactor reviews. Prioritizes correctness, edge cases, logic invariants, fallback-chain safety, async state transitions, architecture analysis, OWASP security, and clear actionable feedback in concise CodeRabbit-style format.
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
- `code-review`
- `code-review-expert`
- `code-reviewer`
- `agent-skills:code-review-and-quality`
- `agent-skills:using-agent-skills`
- `coderabbit:code-review`

Required subagent review passes:

| Subagent pass | Required basis | Review focus |
| --- | --- | --- |
| Baseline full-diff reviewer | `code-review` | finding-first output, severity, full diff coverage, `comment-worthy` / `no comment` |
| Regression and contract reviewer | `code-review-expert` | behavioral regressions, API/prop contracts, hidden state and edge-case risk |
| File coverage reviewer | `code-reviewer` | every changed file and hunk, missing tests, maintainability risks |
| Quality gate reviewer | `agent-skills:code-review-and-quality` | correctness, reliability, maintainability, security, test quality |
| Agent orchestration reviewer | `agent-skills:using-agent-skills` | whether the work was split correctly and whether any review lens is missing |
| CodeRabbit-style reviewer | `coderabbit:code-review` | concise inline-comment style, priority calibration, actionable PR feedback |
| Zereight coordinator | this skill | three-dot diff, RED-team mindset, verification discipline, final synthesis |

Execution rules:

- Spawn separate subagents for the required review passes whenever the runtime
  supports subagents. Give each subagent the exact PR/range, target branch,
  repository path, and the relevant instruction sources.
- Every subagent must follow the repo `AGENTS.md` and global Codex instructions
  in addition to its review skill.
- For the `coderabbit:code-review` pass, prefer running CodeRabbit CLI instead
  of only emulating its style. Before running it, switch the working tree to the
  PR source branch at the latest `origin` state, even when a local branch with
  the same name already exists. Local branches may be stale.
  - Fetch the exact source and target branches from origin.
  - Check out the PR source branch from `origin/<source-branch>` in a way that
    discards only stale local branch position, not unrelated user work.
  - Verify the review range with an exact three-dot diff against
    `refs/remotes/origin/<target-branch>` before invoking CodeRabbit.
  - Invoke CodeRabbit with the target branch/base explicitly when the CLI
    supports it.
  - If CodeRabbit reports usage limits, quota exhaustion, authentication limits,
    or rate limits, record that blocker and continue the ensemble without the
    CodeRabbit CLI result. In that case, the `coderabbit:code-review` pass may
    fall back to manual CodeRabbit-style priority calibration and wording.
- Do not return the final review until every required pass has either completed
  or is explicitly blocked. If a required skill or subagent tool is unavailable,
  stop and report the blocker instead of silently skipping it.
- Keep raw diff output out of the conversation context when possible. Prefer
  context-mode indexing/search for large diffs, and use three-dot diff against
  the target branch.

Review preflight safeguards:

- RTK command rewrites can fail silently for simple read commands such as
  `rtk rewrite "sed ..."`. If that happens, do not stall the review. Use the
  repo-approved RTK form when the hook provides one, prefer `rtk grep` /
  `rtk git` for searched or git commands, and keep direct file reads narrowly
  bounded when reading required instruction or skill files.
- If the nearest repo `AGENTS.md` is missing, do not treat that as permission to
  ignore repo instructions. Use any AGENTS instructions supplied in the current
  conversation as the repo instruction source, state that fallback, and continue.
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

- Merge findings from all subagents into one final review.
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

### Step 1: Fetch and diff against origin/develop (THREE-DOT DIFF)

**CRITICAL: Always use three-dot diff (`...`) not two-dot diff (`..`).**
Two-dot diff includes changes from the target branch that were merged after the PR branch was created, producing false positives. Three-dot diff shows only changes introduced on the PR branch (merge-base diff) -- this matches what Bitbucket/GitHub PR pages display.

Before reading any file, run:

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

## Clean code checks (run after security checks)

After security checks, scan for clean code issues. See `references/clean-code.md` for full detail.

Key areas:
- **Naming**: intention-revealing, consistent vocabulary, no misleading names
- **Functions**: single responsibility, no flag arguments, no side effects in getters
- **React/TS**: prop explosion, render-in-render, `any` usage, hook naming, effect scope
- **React Effect anti-patterns**: derived state via Effect, event logic in Effect, Effect chains, fetch without cleanup — see `references/react-effect-guidelines.md`
- **React Native**: StyleSheet outside component, inline styles in hot paths, raw primitives instead of design system components
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

## Review types (CodeRabbit style)

Label every finding with a type:

- ⚠️ **Potential issue** — bug, logic flaw, security vulnerability, invariant break
- 🛠️ **Refactor suggestion** — maintainability, performance, cleaner abstraction
- 🧹 **Nitpick** — minor style/naming (only in "thorough" mode, not default)

## Severity levels (CodeRabbit style)

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

## Output template

1. `High-Level Summary` (2-4 lines)
2. `✅ What’s good` (2-4 bullets, cite specific patterns not generic praise)
3. `⚠️ Findings` (ordered 🔴→🟠→🟡→🔵, max 5 unless critical)
4. `Case Matrix` (only when fallback/merge logic exists)
5. `🎯 Verdict` (`Approve` | `Approve with comments` | `Request changes`)

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
