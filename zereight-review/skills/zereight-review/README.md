# zereight-review

CodeRabbit-style code review skill focused on **logic correctness and edge cases**.
Prioritizes correctness and risk over style nitpicks.

For React Native PRs, run alongside `zereight-react-native-optimizer`.

## Install

```bash
npx skills add zereight/skill --yes --global
```

## When to use

- Reviewing PRs, diffs, commits, or changed files
- Verifying logic with optional inputs, fallback chains, and async flows
- Checking bugfix safety and regression risk

## What it checks

| Check | Description |
|-------|-------------|
| Invariant | Paired values that must stay consistent (e.g. `count`/`maxCount`) |
| Partial input | Behavior when only some optional fields/props are provided |
| Fallback chain | `??`, `\|\|`, ternary precedence and source-of-truth conflicts |
| State vs UI | Render conditions vs computed data conditions |
| Boundary | `0`, negative, `undefined`, empty string, overflow |
| Async / race | Stale closure, open/close/reset/submit ordering, loading flag recovery |
| Clean code | Naming, component design, React Effect anti-patterns, RN StyleSheet |
| React Effects | Derived state, event logic in Effect, Effect chains, fetch without cleanup |

## References

| File | Content |
|------|---------|
| `references/logic-checks.md` | 6가지 필수 로직 체크 상세 가이드 |
| `references/severity-rubric.md` | High / Medium / Low 심각도 기준 |
| `references/output-format.md` | 출력 포맷 템플릿 + 예시 |
| `references/examples.md` | 실제 finding 예시 3개 |
| `references/clean-code.md` | Universal + React/TS/RN 클린코드 체크 |
| `references/react-effect-guidelines.md` | useEffect 안티패턴 9가지 (Bad/Good) |

## Output format

1. High-Level Summary
2. ✅ What's good
3. ⚠️ Findings — `[type icon] [severity icon] Title` / Condition / Impact / Evidence / Minimal fix
4. Case Matrix (fallback/merge 로직이 있을 때만)
5. 🎯 Verdict (`Approve` / `Approve with comments` / `Request changes`)

### Severity icons

🔴 Critical · 🟠 Major · 🟡 Minor · 🔵 Trivial · ⚪ Info

### Review type icons

⚠️ Potential issue · 🛠️ Refactor suggestion · 🧹 Nitpick
