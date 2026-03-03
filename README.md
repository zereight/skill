# zereight skills

Personal agent skills for code review and React Native development.

## Skills

| Skill | Description |
|-------|-------------|
| `zereight-review` | Core review — logic correctness, edge cases, clean code, React Effect anti-patterns |
| `zereight-react-native-optimizer` | RN performance review — rendering, animation, native/bridge checks |
| `zereight-react-native-testing` | RNTL v13/v14 test writing — queries, matchers, userEvent, async patterns |
| `zereight-react-native` | RN gateway — routes tasks to the right specialist skill |

## Install

```bash
# 1. Prerequisites
npx skills add vercel-labs/agent-skills -yg
npx skills add callstackincubator/agent-skills --skill react-native-best-practices -yg
npx skills add callstackincubator/agent-device --skill agent-device -yg
npx skills add pluginagentmarketplace/custom-plugin-react-native -yg
npx skills add heroui-inc/heroui --skill heroui-react -yg
npx skills add heroui-inc/heroui --skill heroui-native -yg
npx skills add ibelick/ui-skills --skill fixing-motion-performance -yg
npx skills add storybookjs/react-native -yg

# 2. This repo
npx skills add zereight/skill --yes --global
```

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

### zereight-react-native-testing

RNTL test writing guide. Covers v13 (sync, React 18) and v14 (async, React 19+).

**Covers:** render, screen, queries (getBy/getAllBy/queryBy/findBy), Jest matchers, userEvent, fireEvent, waitFor, async patterns, anti-patterns
**Source:** [callstack/react-native-testing-library](https://github.com/callstack/react-native-testing-library/tree/main/skills/react-native-testing)

### zereight-react-native

RN development gateway. Routes tasks to the right specialist skill (basics, animations, state, navigation, native modules, testing, deployment, Storybook, HeroUI).
