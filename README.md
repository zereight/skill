# My Agent Skills

Personal agent skills collection. Managed as a single source of truth and installable via `npx skills add`.

## Install

```bash
# Interactive (recommended)
npx skills add /path/to/this/repo

# Non-interactive
npx skills add /path/to/this/repo -g --skill zereight-review -y
```

## Skills

### `zereight-review`

Comprehensive code review focused on **logic correctness and edge cases**, not style.

Prioritizes:
- Invariant breaks (paired values that must stay consistent)
- Partial-input cases (only some optional fields provided)
- Fallback-chain risks (`??`, `||`, ternary precedence)
- State vs UI display mismatch
- Boundary values (`0`, negative, undefined, overflow)
- Async timing / race / stale closure

Output format: CodeRabbit-style (Summary / Good / Findings / Verdict)
