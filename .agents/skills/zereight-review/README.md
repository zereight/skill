# zereight-review

code review skill focused on **logic correctness and edge cases**.
Prioritizes correctness and risk over style nitpicks.

**Mandatory pipeline:** multi-skill review ensemble (9 subagent passes) + react-doctor preflight (React/RN logic PRs) + **sonarlint-ls-cli** preflight (local, no auth — diff-scoped) + rnsec + fuck-u-code preflight. React Native PRs also require the `zereight-react-native-optimizer` ensemble pass. Screen/flow PRs require **flow ownership** + **ponytail** ensemble passes.

## Install

```bash
npx skills add zereight/skill --yes --global
```

## Delivery default (SSOT)

- **Chat-only by default** — synthesize the review in the session; do **not** post PR comments on Bitbucket/GitHub/GitLab unless the user explicitly asks (`댓글 달아`, `post the review`, etc.).
- When posting is requested, follow **`zereight-review-comments`** (`~/.agents/skills/zereight-review-comments/`).
- `comment-worthy` / `no comment` = per-file **finding** labels, not “post / don’t post on the PR”.

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
| Async effect cancellation | Generation token vs boolean `cancelled` in `useEffect` async — `references/async-effect-cancellation.md` |
| Clean code | Naming, component design, React Effect anti-patterns, RN StyleSheet, React Doctor |
| React Effects | Derived state, event logic in Effect, Effect chains, fetch without cleanup |
| React Doctor | **Mandatory** for React/RN logic PRs — `npx react-doctor@latest --json --no-score -y --diff <base>`; row required in `검증 결과` |
| SonarLint (local) | **Mandatory** when `python3` + `curl` + `git` available — `sonarlint-ls-cli` (`scan.sh analyze`) on PR changed `.ts/.tsx/.js/.jsx/.py/.java` files only. Fully local, no auth/token/project key, no SonarCloud round-trip. Kotlin/Swift/Objective-C have no bundled analyzer (silent zero findings) — reviewed manually instead, noted in `검증 결과`. |
| Review ensemble | **Mandatory** — 9 subagent passes before synthesis; `검증 결과` lists each pass status |
| Flow ownership | Screen role, data owner, upstream prepare vs `navigation.preload`, requirement-change blast radius (`references/flow-ownership-review.md`) |
| Ponytail simplicity | Over-engineering, duplication, yagni (`ponytail-review` — correctness out of scope) |
| Direction alternative | 1-line target-swap in scope: PR as written vs reorder vs delete unused path (`references/direction-alternative-gate.md`). Existing PR comments = competing hypotheses. |
| Navigation & caller context | Per-caller grep, hop vs terminal nav diff, path tags, scenario matrix before 🟠 stack claims (`references/navigation-review-gate.md`) |

## References

| File | Content |
|------|---------|
| `references/logic-checks.md` | 6가지 필수 로직 체크 상세 가이드 |
| `references/severity-rubric.md` | High / Medium / Low 심각도 기준 |
| `references/output-format.md` | 출력 포맷 템플릿 + 예시 |
| `references/examples.md` | 실제 finding 예시 3개 |
| `references/clean-code.md` | Universal + React/TS/RN 클린코드 체크 |
| `references/react-effect-guidelines.md` | useEffect 안티패턴 9가지 (Bad/Good) |
| `references/flow-ownership-review.md` | Screen role, data owner, preload vs upstream prepare |
| `references/direction-alternative-gate.md` | Symptom-fix vs reorder vs delete-a-path (1-line PRs in scope) |
| `references/navigation-review-gate.md` | Caller context, hop vs terminal nav, path tags, scenario matrix, author observation |
| `references/async-effect-cancellation.md` | Generation token vs boolean cancel in async effects |

## Output format

1. `전체 요약`
2. `좋은 점`
3. `리뷰 코멘트`
4. `방향 대안` — A/B/C table on logic PRs (`references/direction-alternative-gate.md`)
5. `구조·역할 관점` / `모션·애니메이션 관점` when those passes ran
6. `파일별 리뷰 결과`
7. `검증 결과` — **PR axis**, **direction alternative**, **ensemble**, **caller context** / **path tags** / **scenario matrix** (nav PRs), **react-doctor**, **sonarlint (local CLI)**, **rnsec**, **fuck-u-code**, **thermo-nuclear** rows (all mandatory when in scope)

### Severity icons

🔴 Critical · 🟠 Major · 🟡 Minor · 🔵 Trivial · ⚪ Info

### Review type icons

⚠️ Potential issue · 🛠️ Refactor suggestion · 🧹 Nitpick
