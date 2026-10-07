---
name: zereight-jev-reviewer
description: >-
  PR/diff code review for JS/TS. TypeSafe Jev (typesafe/jev-1.13 via OpenRouter)
  screens every changed file into a risk matrix and finding candidates, the tool
  collects each top file's neighbors (importers through barrels, imports,
  siblings), then the agent verifies candidates and runs a generative review of
  the top files with those neighbors, judged by zereight-review's references.
  Use for "jev로 리뷰", PR review, diff review, /zereight-jev-reviewer.
disable-model-invocation: true
---

# zereight-jev-reviewer

파이프라인은 세 층으로 나뉜다.

1. **Jev 스크리닝**(`tool/`, 모델 호출): 변경 파일마다 위험 확률 matrix와 finding 후보를 만든다.
2. **이웃 수집**(`tool/src/adapters/neighbors.ts`, 모델 호출 없음): matrix 상위 파일마다 patch에 보이지 않는
   주변 코드를 모은다. importer(2단계, barrel은 단계로 세지 않음), 로컬 import, 같은 디렉터리의 형제 파일이다.
3. **에이전트 리뷰**: Jev 후보를 코드로 검증하고, 상위 파일을 이웃과 함께 생성형으로 리뷰한다.

Jev는 분류기라서 질문에 없는 문제를 찾지 못하고 근거도 반환하지 않는다. 그래서 Jev는 어느 파일을 깊게 볼지
정하는 데만 쓰고, 무엇이 문제인지는 4단계 생성형 리뷰가 찾는다. 판단 기준은 이 스킬에 따로 두지 않고
`zereight-review`의 references를 그대로 참조한다(SSOT). 다만 `zereight-review`의 서브에이전트 앙상블,
외부 스캐너, 게시 단계는 포함하지 않는다. 그 수준이 필요하면 `zereight-review`를 쓴다.

토대는 [jev-review](https://github.com/devagrawal09/jev-review) (MIT)이다.
판단 모델은 **`typesafe/jev-1.13`**(진짜 Jev)이며 OpenRouter의 System One API
(`https://openrouter.ai/api/v1/systemone`)를 공식 TypeSafe SDK로 호출한다. 별도의 TypeSafe 계정은 필요 없고
OpenRouter 키만 쓴다. `jev-router`(채팅 라우터)는 사용하지 않는다.
`JEV_PROVIDER=cursor`로 Cursor provider 모델(예: `glm-5p3-flash`)을 대신 쓸 수도 있다(아래 참고).

`ZR` = `~/.agents/skills/zereight-review` (이하 경로 약칭)

## Workflow

1. **Scope**: 변경된 패키지 경로를 정한다(예: `packages/api`). 비용과 시간이 파일 수에 비례한다.
2. **Jev 실행**: `jev_review` 도구를 호출한다(bash로 CLI를 직접 실행하지 않는다).
   ```
   jev_review({ path: "<변경된 패키지 경로>", base: "origin/develop" })
   ```
   `base`를 생략하면 작업 트리(+untracked)를 리뷰한다. 반환값은 finding 목록, 상위 matrix,
   `reviewTargets`(상위 파일과 이웃 목록), 건너뛴 파일(`skipped`), `zer manifest`가 판정한 `scopes`,
   라우팅된 모델, 전체 JSON 경로(`$TMPDIR/jev-review/report-*.json`)이다. 후보에는 ID가 붙는다:
   Jev finding은 `F#`, 생성형 리뷰 대상은 `T#`, 건너뛴 파일은 `S#`이다. `S#`는 32k 토큰을 넘는 patch,
   JS/TS가 아닌 파일, 호출 실패다. "후보 0건"은 "건너뛴 것이 없을 때"만 "문제 없음"에 가깝다.
   도구가 없으면 `/reload`를 하거나
   `ln -sfn ~/.agents/skills/zereight-jev-reviewer/extension ~/.pi/agent/extensions/zereight-jev-reviewer`를 실행한다.
   Pi 밖(터미널)에서는 `node tool/src/cli/review-changes.ts <path>`로 같은 파이프라인을 실행할 수 있다.
3. **후보 검증(필수)**: `findings[]`를 severity 순으로 읽고 각 항목의 `file:line`을 실제 코드에서 열어
   재현 가능한지 확인한다. 호출부(production caller)와 라이브러리 동작을 확인하지 못하면 후보를 버린다.
4. **생성형 리뷰(필수, finding이 0건이어도 실행)**: `reviewTargets[]`의 파일마다 아래를 수행한다.
   - 읽을 것: 대상 파일의 diff, 프로덕션 `importers`와 `transitiveImporters`(stories/test는 뒤로 밀려 있다),
     `siblings` 목록, 판단에 필요한 `imports`. 전체 목록은 report JSON에 있다.
   - 세 가지 질문에 답한다. 체크리스트가 아니라 각 질문을 이웃 코드에 대고 자유롭게 따진다.
     1. **소비처**: 이 변경은 각 importer가 실제로 넘기는 값과 환경(다국어 문자열 길이, OS 글꼴 크기,
        좁은 레이아웃, 빈 값·경계값, 플랫폼 차이)에서 어떻게 깨지는가?
     2. **암묵적 결합**: diff 밖에 이 변경과 같은 값·규칙·가정에 기대는 코드가 있는가? 한쪽만 바뀌면 깨지는가?
     3. **누락된 짝**: 형제 파일이나 같은 계열 구현 중 같이 바뀌었어야 하는데 빠진 것이 있는가?
   - 판단 기준은 `ZR`을 따른다.
     - 항상 적용: `ZR/references/severity-rubric.md`, `ZR/references/logic-checks.md`,
       `ZR/references/clean-code.md`, `ZR/SKILL.md`의 "Self-challenge gate"와 "Verification Discipline" 섹션,
       `~/.agents/skills/thermo-nuclear-code-quality-review` (유지보수성).
     - 조건부 적용: 나머지 `ZR/references/*.md`는 각 문서의 "Scope triggers" 또는 "When to run" 섹션만 먼저 읽고,
       조건에 해당하는 문서만 본문까지 적용한다. 새 판단 기준이 필요하면 이 스킬이 아니라 `ZR/references`에 추가한다.
     `scopes`가 있으면 이를 근거로 고른다: `navigation`이 참이면 `navigation-review-gate.md`, `tests`가 참이면
     `test-review-gate.md`, `motion`이 참이면 모션 기준을 적용한다. `lens`가 붙은 finding은 `lensRef`의 문서를 적용한다.
     `.tsx`의 크기, 패딩, 말줄임, 터치 영역을 건드리면 `ZR/references/rn-layout-review.md`도 적용한다.
   - 대상이 3개를 넘거나 이웃이 많으면 파일별로 서브에이전트에 나눠 맡겨도 된다. 이 경우에도 결과는
     3단계와 같은 기준(코드 인용, 호출부 확인)으로 직접 검증한 뒤에 보고한다.
5. **처분 제출(필수)**: `jev_finalize`를 호출해 모든 `F#`, `T#`, `S#`에 처분을 준다. 통과(ok)하기 전에는 최종 리뷰를 쓰지 않는다.
   - `F#`: finding(`candidate: "F1"`) 하나, 또는 `dropped`(이유와 그 근거가 되는 `file:line`) 하나.
   - `T#`: 4단계 지적을 `candidate: "T1"`로 올리거나, 문제가 없으면 `cleared`에 실제로 읽은 이웃 파일(`checked`)을 적는다.
   - `S#`: `cleared`에 직접 확인한 파일을 적거나 finding으로 올린다.
   - finding의 `line`은 **변경된 줄**이어야 한다(`zer verify`가 diff hunk로 검사). Jev의 `line`은 hunk 시작 줄(문맥 포함)이라
     실패할 수 있으니 실제 변경 줄을 고른다. 변경되지 않은 코드의 문제(누락된 짝, 이웃의 이중 상수)는
     `outsideDiff: true`와 `evidenceRefs`로 제출한다.
   - 통과하면 돌려주는 "검증 결과" 줄을 그대로 최종 리뷰에 붙인다.
6. **보고**: 아래 형식으로 채팅에 작성한다. 요청 없이 호스트(Bitbucket/GitHub/GitLab)에 게시하지 않는다.

## Severity

최종 등급은 `ZR/references/severity-rubric.md`(High/Medium/Low와 Downgrade rules)를 따른다.
표기는 🔴 High, 🟠 Medium, 🟡 Low, 🔵 Trivial(필수 아님, 코멘트 수준)이다.
Jev의 severity는 출발점으로만 쓴다.

| Jev severity | 출발점 |
| --- | --- |
| ≥ 2 (`request_changes`) | 검증 후 재현 증거가 있으면 🟠, 사용자 영향까지 입증되면 🔴 |
| 1.5 ~ 2 | 🟡 또는 🟠 (증거 기준) |
| < 1.5 | 🔵 또는 버림 |

testGap은 테스트 부재만으로 🟠 이상으로 올리지 않는다. 라이브러리 throw, false-return, Promise hang을
근거로 한 제어 흐름 지적은 callee 코드를 인용하지 못하면 🟡 이하로 둔다. 4단계에서 나온 지적은 Jev 점수가 없으므로
rubric만으로 등급을 정한다. 기기에서 직접 확인해야 하는 시각 문제는 확인 조건(화면, 언어, 글꼴 크기)을 적고
🟡 이하로 둔다.

## 보고 형식

```
{1줄: 다음 행동 (명령, file:line, 또는 "머지 가능")}
{2줄: 한 줄 판정}

🔴/🟠/🟡/🔵 file:line — 문제 / 증거(코드 인용) / 수정 제안   (등급 순, 🔵 포함 최대 8개)

{jev_finalize가 돌려준 검증 결과 줄}; routed <models>
```

## Env

| Var | Default | Note |
| --- | --- | --- |
| `JEV_PROVIDER` | `jev` | `jev`(진짜 Jev) 또는 `cursor`(Cursor 모델이 대신 판단) |
| `OPENROUTER_API_KEY` | — | `jev` 필수 |
| `JEV_BASE` | unset | `<base>...HEAD` |
| `JEV_MODEL` | jev: `jev-1.13` / cursor: `glm-5p3-flash` | jev는 `jev-latest`도 가능, cursor는 `cursor/` 접두어 허용 |
| `JEV_BASE_URL` | `https://openrouter.ai/api` | jev 전용 |
| `JEV_MODEL_PARAMS` | unset | cursor 전용. `reasoning_effort=low`처럼 `id=value` 쉼표 구분 |
| `CURSOR_API_KEY` | Pi `auth.json`의 cursor 키 | cursor 전용 |

최초 1회: `cd ~/.agents/skills/zereight-jev-reviewer/tool && npm install` (Node 24+).

## 알려진 한계 (2026-10-08 갱신)

- **Jev 컨텍스트는 32,000 토큰**이다(state + 질문). patch가 매우 큰 파일은 호출이 실패할 수 있어 파일 크기를
  확인해야 한다. 출력 토큰은 무료이고 입력은 100만 토큰당 약 $0.042다.
- Jev는 텍스트·근거를 반환하지 않고, 평가 축도 correctness/security/reliability/compatibility/testGap 다섯 개뿐이다.
  i18n·접근성·유지보수성·스코프 문제는 Jev가 아니라 4단계 생성형 리뷰가 찾는다.
- 측정(2026-10-07, 같은 PR #3546 diff, JS/TS 18파일, 호출 39회): Jev `jev-1.13` **6초 / $0.0021 / 후보 3건**.
  비교용으로 이전에 deepseek 경유(`jev-router`)는 86초 / $0.086 / 후보 4건이었다.
- PR #4629(2026-10-07): Jev는 finding 0건이었고, 사람 리뷰가 찾은 세 지적(소비 화면 다국어·큰 글씨,
  diff 밖 이중 상수, 형제 컴포넌트 스코프)은 모두 diff 밖 코드에 근거가 있었다. 이웃 수집은 이 세 근거 파일
  (필터 화면 3개를 포함한 소비 화면 6곳, `app-basic-capsule-tab.tsx`, `app-scrollable-capsule-tab-item.tsx`)을
  모두 수집한다. 파일당 약 0.3초다.
- 이웃 수집은 정적 import만 따라간다. 워크스페이스 `package.json`의 이름으로 alias를 해석하므로
  `@/` 같은 bundler 전용 alias, 동적 경로, DI 바인딩, navigation 이름 기반 참조는 놓친다.
- `JEV_PROVIDER=cursor`는 Cursor가 logprobs를 반환하지 않아 확률이 모델의 자기 보고이고 값이 높게 나온다
  (0.6~0.97). 호출마다 입력 토큰이 약 7k 붙고(구독 한도 차감) 1파일 기준 `glm-5p3-flash` 46초, `composer-2.5` 99초다.
- **Lens**(`tool/lenses/*.md`): 파일 형식과 변경 줄의 정규식이 맞으면 해당 파일에 Jev 질문을 하나 더 붙인다(파일당 최대 4개).
  matrix의 `pattern` 열과 finding의 `lens`로 드러난다. lens는 "무엇을 물을지"만 정의하고 판단 기준은 `ref`가 가리키는
  `ZR/references` 문서에 있다. lens 6개는 OpenQodex(Apache-2.0)에서 다시 쓴 것이라 `NOTICE`에 출처가 있다.
- `jev_finalize`의 줄 검사는 `zer`(`~/.cargo/bin/zer`)를 쓴다. `zer`가 없거나 `base`가 없으면 파일 존재와 줄 범위만 검사하고
  경고를 낸다. `zer`는 검사 실패에도 exit 0을 반환하므로 결과 JSON을 읽는다.
- `SCREEN_THRESHOLD = 0.7`(`tool/src/domain/config.ts`)은 실제 PR 여러 건으로 보정이 필요하다.
  4단계 대상(`MAX_REVIEW_TARGETS = 5`)은 임계값과 무관하게 matrix 최댓값 순으로 고른다.
- JS/TS 만 대상이다(native, locale, asset 제외).
