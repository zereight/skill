# zereight-review

Code review skill focused on **logic correctness and edge cases**.

## Skills

| Skill | Description |
|-------|-------------|
| `zereight-review` | Core review skill |

## Prerequisites

`zereight-review` references the following skills. Install them first:

```bash
# Vercel — React + React Native
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices -yg
npx skills add vercel-labs/agent-skills --skill vercel-composition-patterns -yg
npx skills add vercel-labs/agent-skills --skill vercel-react-native-skills -yg

# Callstack — React Native best practices + device
npx skills add callstackincubator/agent-skills --skill react-native-best-practices -yg
npx skills add callstackincubator/agent-device --skill agent-device -yg

# Plugin Agent Marketplace — React Native full suite
npx skills add pluginagentmarketplace/custom-plugin-react-native --skill react-native-basics -yg
npx skills add pluginagentmarketplace/custom-plugin-react-native --skill react-native-animations -yg
npx skills add pluginagentmarketplace/custom-plugin-react-native --skill react-native-state -yg
npx skills add pluginagentmarketplace/custom-plugin-react-native --skill react-native-navigation -yg
npx skills add pluginagentmarketplace/custom-plugin-react-native --skill react-native-native-modules -yg
npx skills add pluginagentmarketplace/custom-plugin-react-native --skill react-native-testing -yg
npx skills add pluginagentmarketplace/custom-plugin-react-native --skill react-native-deployment -yg

# HeroUI
npx skills add heroui-inc/heroui --skill heroui-react -yg
npx skills add heroui-inc/heroui --skill heroui-native -yg

# Animation performance
npx skills add ibelick/ui-skills --skill fixing-motion-performance -yg

# Storybook for React Native
npx skills add storybookjs/react-native --skill setup-react-native-storybook -yg
npx skills add storybookjs/react-native --skill writing-react-native-storybook-stories -yg
```

## Install

```bash
npx skills add zereight/skill --yes --global
```

Installs to `~/.agents/skills/zereight-review` and symlinks to 40+ agents (Droid, Claude Code, Cursor, Copilot, etc.).

## Update

```bash
npx skills add zereight/skill --yes --global
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
