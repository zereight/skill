# zereight-review

Edge-case-first code review skill producing concise, CodeRabbit-style feedback.

## When to use

- Reviewing PRs, diffs, commits, or changed files
- Verifying logic with optional inputs, fallback chains, and async flows
- Checking bugfix safety and regression risk

## Install

```bash
npx skills add /path/to/skills-repo -g --skill zereight-review -y
```

## What it checks

| Check | Description |
|-------|-------------|
| Invariant | Paired values that must stay consistent (e.g. `count`/`maxCount`) |
| Partial input | Behavior when only some optional fields/props are provided |
| Fallback chain | `??`, `\|\|`, ternary precedence and source-of-truth conflicts |
| State vs UI | Render conditions vs computed data conditions |
| Boundary | `0`, negative, `undefined`, empty string, overflow |
| Async/race | Stale closure, open/close/reset/submit ordering, loading flag recovery |

## Output format

1. High-Level Summary
2. ✅ What's good
3. ⚠️ Findings (condition / impact / evidence / minimal fix)
4. Case Matrix (when fallback/merge logic exists)
5. 🎯 Verdict
