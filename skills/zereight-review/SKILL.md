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
6. Maintainability/readability

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

## Case matrix requirement

For non-trivial logic, build a compact input matrix and verify outcomes.

Minimum matrix dimensions:

- optional A present/absent
- optional B present/absent
- fallback source (prop/state/default)
- boundary values (0/undefined)

If matrix reveals broken invariant, report as at least **Medium**.

## Findings format (strict)

For each issue, include:

1. **Title** `[High|Medium|Low]`
2. **Condition** (exact input/state combination)
3. **Impact** (user/business/technical consequence)
4. **Evidence** (file + line + short snippet)
5. **Minimal fix** (smallest safe change)

## Severity rubric

- **High**
  - Auth/payment/security risk
  - Data corruption/integrity break
  - Wrong critical business decision
  - Crash in normal flow
- **Medium**
  - Incorrect UI state from valid input
  - Silent error/lost message/retry break
  - Invariant break in realistic edge case
- **Low**
  - Readability/maintainability issues
  - Missing rationale comments
  - Non-critical duplication

## Output template

1. `High-Level Summary` (2-4 lines)
2. `✅ What’s good` (2-4 bullets)
3. `⚠️ Findings` (ordered by severity, max 5 unless critical)
4. `Case Matrix` (only when logic merging/fallback exists)
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
