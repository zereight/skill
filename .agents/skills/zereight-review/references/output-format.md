# Output Format

## Delivery (SSOT)

- **Default:** Write the review in the **current session** (chat). Do **not** post to Bitbucket, GitHub, or GitLab unless the user explicitly asks (e.g. `댓글 달아`, `PR에 코멘트 올려`, `post the review`).
- `리뷰해줘` / `zereight-review` alone = report only, no host posting.
- Full format below is the **deliverable text**, not an instruction to auto-post it.

## Chat shape



**PROCESS VIOLATION:** a chat review that opens with summary/context, dumps 10 sections, or ends with "더 필요하면 말해".


### Conflict table

| Fight | Winner |
| --- | --- |
| First line is action vs `전체 요약` | Action wins. One-line verdict sits on line 2. |
| Cap 5 vs every finding | Show top 5 by severity. Remaining as a count. Do not drop them from analysis. |
| No recap vs `좋은 점` / `파일별 리뷰 결과` | Skip those sections unless the user asks. |
| Small working set vs `검증 결과` rows | `검증 결과` stays complete (PROCESS VIOLATION if omitted). Compact table. Not the closer. |
| One closer vs extra nits | Last line is ONE action under two minutes. Extra issues: "따로: N개. 펼칠까?" |

### Chat order (do not skip numbered items; do skip the old 10-section wall)

```
{line 1: next action — command, file:line, or "머지 가능"}
{line 2: 한 줄 판정 + 시간 추정}

## 지금 할 일
1. 🟠 title — `file:line` — 최소 수정 한 줄
2. …
(max 5. If more: `외 N개. 펼치려면 말해`)

## 문제 지도
(required on logic PRs with comment-worthy findings — problem-map-output.md)
(same 1–5 items, full 어디/뭐/언제/유저영향/최소수정 fields)

## 방향 대안
(required on logic PRs — 3-row A/B/C table only)

## 구조·역할 / 모션 / 테스트
(only if that pass ran AND it changes a decision — 3 lines max each)

## AI delivery gate
(required when `delivery gate scope: yes` — zereight-ai-delivery-gate; coordinator only)

## 검증 결과
(compact rows — still mandatory)

Next: {one action, <2 min}
```

Skip unless asked: `전체 요약` as a section, `좋은 점`, `리뷰 코멘트` duplicates, `파일별 리뷰 결과`, closing pleasantries.

If no comment-worthy findings:

```
머지 가능. 막히는 🟠 없음.
Approve — about 0 minutes of patch work.
문제 지도: 해당 없음
[검증 결과 compact]
Next: 머지하거나 댓글 달 위치만 지정해.
```

---

## Line 1 + verdict

Line 1 is something the reader can do. Not context.

Good: `` `splash-screen.tsx:188` 이중 호출부터 잠가. 아래 1번. ``
Good: `머지 가능. 막히는 🟠 없음.`
Bad: `이 PR은 스플래시 초기화를 다룹니다. 몇 가지 이슈가…`

Line 2 is verdict + time:

| Verdict | When |
|---------|------|
| **Approve** | No findings, or 🔵 / ⚪ only |
| **Approve with comments** | 🟡 only, not blocking |
| **Request changes** | Any 🔴 or 🟠, or user-facing 🟡 |

Example: `Request changes — about 20 minutes if you patch 1. An afternoon if you take C.`

---

## 지금 할 일

Numbered. One bounded action per step. Severity order: 🔴 → 🟠 → 🟡 → 🔵.

Max 5 visible. Each line: severity + title + `file:line` + the fix verb.

```
1. 🟠 pair invariant — `bottom-sheet-pin.tsx:74` — derive both props from one flag
2. 🟡 missing cleanup — `use-pin.ts:40` — generation token before setState
```

Do not put two "and then" clauses in one step.

---

## 문제 지도

SSOT: `references/problem-map-output.md`.

Same items as `지금 할 일`, with the five fields. Do not invent a second finding list.

---

## 방향 대안

Required on logic PRs (even 1-line). Three rows. Recommend first.

Silence = PROCESS VIOLATION.

---

## Findings fields (strict, inside 문제 지도)

Each visible issue includes:

```
### [type-icon] [severity-icon] Title

**Applicable paths:** `<path-tag>` + caller — required for navigation/back-stack findings
**어디 / Evidence:** `<file>:<line>`
**언제 / Condition:** <exact input/state combination>
**유저가 보는 것 / Impact:** <consequence>
**최소 수정:** <smallest safe change, ideally a snippet>
```

**Type icons:** ⚠️ Potential issue · 🛠️ Refactor suggestion · 🧹 Nitpick (thorough mode only)
**Severity icons:** 🔴 Critical · 🟠 Major · 🟡 Minor · 🔵 Trivial · ⚪ Info

Example:

```
### 1. ⚠️ 🟡 Partial prop override breaks pair invariant

**어디:** `bottom-sheet-pin.tsx:74–80`
**언제:** `mismatchedCountProp` provided, `maxAttemptCountProp` absent, local state count is 0
**유저가 보는 것:** "Incorrect PIN X/Y" UI disappears even though the caller set a count
**최소 수정:** treat the pair atomically — if either prop is set, derive both from a shared source
```

---

## Case Matrix

Only when the code merges multiple sources (prop + state + default) or has fallback chains. Put it inside the matching 문제 지도 item. Not a separate top-level dump.

---

## 검증 결과

Mandatory compact table. Not an essay. Not the last line.

Keep every required row from SKILL.md **Output Language and Style** (`PR axis`, `direction alternative`, `ensemble`, scanner rows, nav rows when in scope). Group related rows. Do not omit a row to look brief.

---

## Behavior rules

- Do not report style-only issues as findings
- Do not suggest architectural rewrites unless the current approach has a correctness issue
- If uncertain about intent, state the assumption explicitly before the finding
- Every Medium/High finding must have a reproducible condition (not "this might be a problem")
- Prefer 3 sharp findings over 8 diluted ones
- Pre-send: if the reader sees only line 1 and the last line, they know (a) what to do now and (b) what just happened

---


```
`bottom-sheet-pin.tsx:74` 부터 짝을 한 소스에서 뽑아. 아래 1번.

Request changes — about 15 minutes if tests already cover the pair. An afternoon if not.

## 지금 할 일
1. 🟡 pair invariant — `bottom-sheet-pin.tsx:74` — 둘 중 하나라도 prop이면 둘 다 prop에서 계산
외 0개.

## 문제 지도
### 1. ⚠️ 🟡 Partial prop override breaks pair invariant
**어디:** `bottom-sheet-pin.tsx:74–80`
**뭐가 문제냐:** mismatchedCount만 prop이고 maxAttemptCount는 state fallback이라 짝이 깨짐
**언제 터지냐:** mismatchedCountProp=2, maxAttemptCountProp 없음, stateCount=0
**유저가 보는 것:** "Incorrect PIN X/Y"가 안 보임
**최소 수정:** `usePropOverride` 한 플래그로 둘 다 같은 소스에서 계산

## 문제 아닌 것
없음

## 우선순위 한 장
[P1 코드] pair를 atomic으로

**한마디:** Request changes

## 방향 대안
| | What | Why |
| A (PR) | independently fallback | 짝이 깨짐 |
| B | 둘 다 prop 또는 둘 다 state | 추천. 최소 패치 |
| C | override 삭제 | caller가 count를 못 줌 |

## 검증 결과
PR axis: A — UI pair logic
direction alternative: A=keep independent fallback | B=atomic pair | C=drop override — recommend B
ensemble: completed (N/M passes)

Next: `bottom-sheet-pin.tsx` 74줄 열고 `usePropOverride` 한 줄부터 넣어.
```
