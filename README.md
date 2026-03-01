# zereight skills

Personal agent skills for code review. CodeRabbit-style feedback focused on correctness and risk.

## Skills

| Skill | Description |
|-------|-------------|
| `zereight-review` | Core review — logic correctness, edge cases, clean code, React Effect anti-patterns |
| `zereight-react-native-optimizer` | RN performance review — rendering, animation, native/bridge checks |

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
# Prerequisites first (see below), then:
npx skills add zereight/skill --yes --global
```

Installs both skills to `~/.agents/skills/` and symlinks to 40+ agents (Droid, Claude Code, Cursor, Copilot, etc.).

## Update

```bash
npx skills add zereight/skill --yes --global
```

## Skill details

### zereight-review

Logic-first code review. Runs mandatory checks on every PR, reports in CodeRabbit format.

**Checks:** Invariant · Partial input · Fallback chain · State vs UI · Boundary · Async/race · Clean code · React Effect anti-patterns
**For RN PRs:** also runs `zereight-react-native-optimizer`
**Output:** Summary / ✅ Good / ⚠️ Findings / Case Matrix / 🎯 Verdict

### zereight-react-native-optimizer

RN performance regression detector. Run alongside `zereight-review` on React Native PRs.

**Checks:** Rendering (FlashList, memo, Context) · Animation (Reanimated, UI thread, gesture) · Native (bridge, memory leaks, image, bundle)
