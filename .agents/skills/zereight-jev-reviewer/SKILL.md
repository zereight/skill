---
name: zereight-jev-reviewer
description: >-
  Standalone PR/diff code review for JS/TS built on TypeSafe Jev
  via OpenRouter (typesafe/jev-router). Staged pipeline: risk matrix per file,
  hunk location, mechanism, severity, owner routing, then agent verification
  against real code. Replaces zereight-review; no subagent ensemble. Use for
  "jev로 리뷰", PR review, diff review, /zereight-jev-reviewer.
disable-model-invocation: true
---

# zereight-jev-reviewer

새 리뷰 스킬이며 `zereight-review`와 의존 관계가 없다. 파이프라인의 판단 단계는 `tool/`의 스크립트가 맡고,
에이전트는 마지막에 후보를 코드로 검증해 최종 리뷰를 작성한다.
토대는 [jev-review](https://github.com/devagrawal09/jev-review) (MIT)이고 TypeSafe 클라이언트를 OpenRouter 어댓터로 교체했다.

## Workflow

1. **Scope**: 변경된 패키지 경로를 정한다(예: `packages/api`). 비용과 시간이 파일 수에 비례한다.
2. **Jev 실행**: `jev_review` 도구를 호출한다(bash로 CLI를 직접 실행하지 않는다).
   ```
   jev_review({ path: "<변경된 패키지 경로>", base: "origin/develop" })
   ```
   `base`를 생략하면 작업 트리(+untracked)를 리뷰한다. 반환값은 finding 목록, 상위 matrix, 라우팅된 모델,
   전체 JSON 경로(`$TMPDIR/jev-review/report-*.json`)이다. 도구가 없으면 `/reload`를 하거나
   `ln -sfn ~/.agents/skills/zereight-jev-reviewer/extension ~/.pi/agent/extensions/zereight-jev-reviewer`를 실행한다.
   Pi 밖(터미널)에서는 `node tool/src/cli/review-changes.ts <path>`로 같은 파이프라인을 실행할 수 있다.
3. **검증(필수)**: `findings[]`를 severity 순으로 읽고 각 항목의 `file:line`을 실제 코드에서 열어
   재현 가능한지 확인한다. 호출부(production caller)와 라이브러리 동작을 확인하지 못하면 후보를 버린다.
   `matrix`에서 확률이 높지만 finding으로 이어지지 않은 파일도 한 번 훑는다.
4. **보고**: 아래 형식으로 채팅에 작성한다. 요청 없이 호스트(Bitbucket/GitHub/GitLab)에 게시하지 않는다.

## Severity 매핑

| Jev severity | 에이전트 판정 |
| --- | --- |
| ≥ 2 (`request_changes`) | 검증 후 재현 증거가 있으면 🟠, 사용자 영향까지 입증되면 🔴 |
| 1.5 ~ 2 | 🟡 또는 🟠 (증거 기준) |
| < 1.5 | 보고하지 않거나 한 줄 메모 |

testGap은 테스트 부재만으로 🟠 이상으로 올리지 않는다. 라이브러리 throw, false-return, Promise hang을
근거로 한 제어 흐름 지적은 callee 코드를 인용하지 못하면 🟡 이하로 둔다.

## 보고 형식

```
{1줄: 다음 행동 (명령, file:line, 또는 "머지 가능")}
{2줄: 한 줄 판정}

🔴/🟠/🟡 file:line — 문제 / 증거(코드 인용) / 수정 제안   (상위 5개)

검증 결과: jev N files, M signals, K findings → 검증 통과 J개 / 폐기 K-J개, routed <models>
```

## Env

| Var | Default | Note |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | — | 필수 |
| `JEV_BASE` | unset | `<base>...HEAD` |
| `JEV_MODEL` | `typesafe/jev-router` | `json_schema` 지원 모델이면 교체 가능 |
| `JEV_REASONING_EFFORT` | router 결정 | `low`로 토큰 절약 |
| `JEV_MAX_TOKENS` | `6000` | "Empty completion"이 나오면 증가 |

최초 1회: `cd ~/.agents/skills/zereight-jev-reviewer/tool && npm install` (Node 24+).

## 알려진 한계 (2026-10-07 검증)

- `jev-router`는 라우터다. 관찰된 라우팅은 `deepseek/deepseek-v4.1-flash`(Together)였다.
- logprobs가 앞부분 토큰만 반환되어 실제로는 모델이 적은 확률을 쓴다. 값이 0.8~0.99로 높아
  `SCREEN_THRESHOLD = 0.7`(`tool/src/domain/config.ts`)이 너무 느슨하다. 실제 PR로 보정이 필요하다.
- 판단 근거는 patch와 변경된 테스트뿐이다. caller/navigation 맥락은 3단계 검증에서 에이전트가 채운다.
- JS/TS 만 대상이다(native, locale, asset 제외). 1파일 기준 약 90초.
