---
name: harness
description: >
  Pi-native evaluate→improve→persist harness. Provides a systematic loop for
  generating candidates, judging them against rubrics, and accumulating knowledge
  as playbooks. Use for iterative output improvement, not for one-off edits
  (use continuity) or single PR review (use zereight-review).
argument-hint: "[solve|knowledge|status]"
---

# harness (Pi-native evaluation loop)

Builds on autoctx (judge/improve core) + Pi tools to provide a coherent harness.

## Stack

| Layer | Source | Role |
|-------|--------|------|
| Extension | `~/.pi/agent/extensions/harness/index.ts` | Tools + TUI + lifecycle |
| Judge engine | `autoctx` (via `pi-autocontext` dep) | LLM-based evaluation |
| Skill | `.agents/skills/harness/SKILL.md` | Usage guide + routing |

## Tools

| Tool | Description |
|------|-------------|
| `harness_solve` | Full loop: generate → judge → improve → persist playbook |
| `harness_knowledge` | Read/write/list playbooks (`knowledge/<scenario>/playbook.md`) |
| `harness_status` | Recent runs, scores, and scenarios overview |

## Usage

```
# Solve a task with rubric-driven improvement
goal: "Improve zereight-review checklist for RN PRs"
rubric: "Actionable findings, Effect anti-patterns, security when relevant"
→ Best output + playbook saved to knowledge/<scenario>/

# Check previous runs
→ Recent runs with scores and scenarios

# Browse accumulated knowledge
action: list → all scenarios with playbooks
action: read, scenario: zereight-review → full playbook
```

## When to use

| Need | Use |
|------|-----|
| Systematic output improvement | `harness_solve` |
| Review accumulated lessons | `harness_knowledge read` |
| Check past run history | `harness_status` |
| One-off judge/improve | `autocontext_judge` / `autocontext_improve` (pi-autocontext) |

## Cost

- `harness_solve` consumes Pi provider quota per generation round.
- Start with `gens: 1` to calibrate rubric, then increase.
- `harness_knowledge` and `harness_status` are zero-cost.
