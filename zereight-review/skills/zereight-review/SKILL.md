---
name: zereight-review
description: Comprehensive code review skill for practical PR feedback. Use for feature, bugfix, and refactor reviews. Prioritizes correctness, edge cases, logic invariants, fallback-chain safety, async state transitions, and clear actionable feedback in concise CodeRabbit-style format.
---

# zereight-review

Prioritize **correctness and risk** over style nitpicks.
Default tone: concise, direct, actionable.

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
2. Security & data integrity
3. State consistency & async timing
4. API contract/type safety
5. Performance hotspots
6. Clean code (naming, structure, component design)
7. Maintainability/readability

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

## Clean code checks (run after logic checks)

After mandatory logic checks, scan for clean code issues. See `references/clean-code.md` for full detail.

Key areas:
- **Naming**: intention-revealing, consistent vocabulary, no misleading names
- **Functions**: single responsibility, no flag arguments, no side effects in getters
- **React/TS**: prop explosion, render-in-render, `any` usage, hook naming, effect scope
- **React Effect anti-patterns**: derived state via Effect, event logic in Effect, Effect chains, fetch without cleanup — see `references/react-effect-guidelines.md`
- **React Native**: StyleSheet outside component, inline styles in hot paths, raw primitives instead of design system components

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
