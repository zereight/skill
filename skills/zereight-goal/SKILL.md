---
name: zereight-goal
description: Stress-test a strategy until confidence is evidence-backed. Use when the user asks whether a plan is 100% reliable, wants loopholes found, or asks to iterate fixes until the strategy is factually solid.
---

# Zereight Goal

Use this skill when the user asks:

- "Are you 100% confident in this strategy?"
- "Find all possible loopholes"
- "Run this loop until you are factually 100% confident"
- equivalent wording about goal strategy, plan confidence, loopholes, and fixes

## Core Rule

Never claim 100% confidence from reasoning alone.

`100% confident` means:

- evidence checked in the current turn
- known assumptions listed
- loopholes tested or closed
- residual risk explicitly bounded
- no unresolved blocker remains

If the available tools or evidence cannot prove the strategy completely, say so and continue with the strongest evidence-backed strategy.

## Goal Hardening Loop

Repeat until no new material loophole remains.

### 1. Restate Goal

Write the goal as a testable outcome.

Format:

```text
Goal: ...
Success criteria:
- ...
Non-goals:
- ...
```

If success criteria are missing, infer conservative criteria from the user's request and mark them as assumptions.

### 2. State Current Strategy

Compress the strategy into concrete steps.

Each step must be verifiable:

```text
Step: ...
Evidence needed: ...
Failure mode: ...
```

### 3. Attack The Strategy

Search for loopholes from these angles:

- Spec mismatch: goal, user intent, API contract, product rule, legal or policy rule
- Data mismatch: stale data, incomplete input, wrong source of truth, hidden default
- Control-flow gap: skipped state, retry path, cancellation path, race, timeout
- Ownership gap: auth, tenant, account, session, permissions, expiry
- Environment gap: platform, version, branch, feature flag, locale, timezone, region
- Operational gap: deploy, rollback, monitoring, logging, migration, support handoff
- UX gap: confusing state, irreversible action, accessibility, error recovery
- Security gap: injection, privilege escalation, data leak, replay, auditability
- Test gap: untested branch, flaky assertion, mocked-away behavior, missing negative case
- Maintenance gap: unclear owner, brittle coupling, duplicated rule, undocumented assumption

For each loophole:

```text
Loophole: ...
Why possible: ...
Evidence status: confirmed | disproven | unknown
Impact: high | medium | low
Fix: ...
Verification: ...
```

### 4. Fix Strategy

Update the strategy only with fixes that close real or plausible loopholes.

Separate:

- Required fixes: needed for correctness, safety, or factual confidence
- Optional cleanup: improves clarity or maintainability but not required

### 5. Verify

Use current-turn evidence before saying verified.

Prefer direct checks:

- read source files, docs, specs, logs, diffs, spreadsheets, tickets, or PRs
- run tests, linters, type checks, builds, or focused scripts
- query primary systems through approved tools
- compare against the exact branch, version, date, environment, or artifact in scope

Do not invent:

- source contents
- API behavior
- dates
- versions
- policy language
- test results

If evidence is unavailable:

```text
Not fully verified: ...
Reason: ...
Needed evidence: ...
```

### 6. Confidence Gate

Before final answer, answer these internally:

- Does every success criterion map to at least one strategy step?
- Does every high/medium loophole have a fix or a documented blocker?
- Did verification run in the current turn for every claim marked verified?
- Are assumptions explicit?
- Is residual risk bounded?

Allowed confidence language:

- `Factually confident within checked scope` when evidence supports the strategy and residual risk is bounded.
- `Not 100% confident yet` when missing evidence remains.
- `Blocked from 100% confidence` when the needed evidence or action is inaccessible.

Forbidden:

- claiming absolute certainty while assumptions or unknown evidence remain
- saying tests passed without running or observing them in the current turn
- hiding residual risk behind vague wording

## Final Output

Use this shape:

```text
Conclusion: ...

Required fixes:
- ...

Loopholes closed:
- ...

Residual risk:
- ...

Verification:
- ...
```

If no material loopholes remain, say:

```text
Conclusion: Factually confident within checked scope.
```

If any material evidence is missing, say:

```text
Conclusion: Not 100% confident yet.
```
