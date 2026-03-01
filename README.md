# zereight-review

Code review skill focused on **logic correctness and edge cases**.

## Skills

| Skill | Description |
|-------|-------------|
| `zereight-review` | Core review skill |

## Install

```bash
# Clone this repo, then:
npx skills add /path/to/this/repo --yes --global
```

Installs to `~/.agents/skills/zereight-review` and symlinks to 40+ agents (Droid, Claude Code, Cursor, Copilot, etc.).

## Update

```bash
git -C /path/to/this/repo pull
npx skills add /path/to/this/repo --yes --global
```

## Skill: `zereight-review`

Comprehensive code review focused on **logic correctness and edge cases**, not style.

Prioritizes:
- Invariant breaks (paired values that must stay consistent)
- Partial-input cases (only some optional fields provided)
- Fallback-chain risks (`??`, `||`, ternary precedence)
- State vs UI display mismatch
- Boundary values (`0`, negative, undefined, overflow)
- Async timing / race / stale closure
- Clean code (naming, component design, React Effect anti-patterns)

Output format: CodeRabbit-style (Summary / Good / Findings / Verdict)
