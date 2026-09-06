# 문제 지도 (Problem Map) — Zereight 출력 템플릿

`zereight-review` 최종 합성에 **필수**로 넣는 섹션.  
엔지니어가 “어디가, 왜, 언제, 유저에게 뭐가 보이는지” 한 번에 파악하도록 한다.

**언제 필수:** logic PR이고 comment-worthy finding이 1개 이상일 때 (🟠+ 또는 actionable 🟡).  
finding이 없으면 `문제 지도: 해당 없음 (comment-worthy finding 없음)` 한 줄.

**`리뷰 코멘트`와의 관계:** 같은 내용을 두 번 쓰지 말 것. 상세는 **문제 지도**, `리뷰 코멘트`는 요약·추가 맥락만.

---

## 섹션 구조 (순서 고정)

```markdown
## 문제 지도

<PR/브랜치 한 줄 맥락 — 선택>

### 1. 🟠 <짧은 제목>
**어디**
- `path/to/file.ts:시작-끝` — 한 줄 설명
- (선택) 코드 인용 블록 — 최대 15줄

**뭐가 문제냐**
- 메커니즘 1–3문장 (jargon 최소)

**언제 터지냐**
- 재현 조건 bullet

**유저/앱이 보는 것**
- 실제 영향 1–2문장

**최소 수정**
- 한 줄 또는 짧은 스니펫

---

### 2. 🟡 ...

### N. 🔵 ... (선택, trivial만 있을 때)

---

## 문제 아닌 것 (헷갈리기 쉬운 것)

| 항목 | 왜 OK / 왜 지금 안 봄 |
|------|----------------------|
| ... | ... |

(해당 없으면: `없음`)

---

## 우선순위 한 장

```
[P0 실기기/QA]  ...
[P1 코드]       ...
[P1 테스트]     ...
[P2 follow-up]  ...
```

**한마디:** <판정 한 줄>
```

---

## 이슈당 필드 규칙

| 필드 | 필수 | 내용 |
|------|------|------|
| **어디** | ✅ | `file:line` 최소 1곳. navigation finding은 symbol + caller + path tag |
| **뭐가 문제냐** | ✅ | 코드/계약이 **어떻게** 잘못 동작하는지 |
| **언제 터지냐** | ✅ | 🟠+는 반드시 재현 가능한 조건. 추측이면 🟡 이하 + “미검증” |
| **유저/앱이 보는 것** | ✅ | 비개발자도 이해 가능한 결과 |
| **최소 수정** | 🟠🟡 권장 | 가장 작은 안전한 패치 |

심각도 순으로 번호 매기기: 🔴 → 🟠 → 🟡 → 🔵.

---

## Navigation PR 추가 규칙

`어디`에 반드시 포함:

- 변경된 nav **symbol**
- production **caller** (grep 근거)
- **path tag** (`resume-from-stem`, `in-flow-continuous`, …)
- **hop vs terminal** (`push` / `replace` / `navigateToDestination`)

`references/navigation-review-gate.md`와 동일 게이트 적용.

---

## 예시 (축약)

### 1. 🟠 lifecycle 에러가 “연결 오류”로 뭉개짐

**어디**
- `packages/core-real/src/network-service.ts:188-200` — `runAsync`
- `packages/foundation/src/apis/error-handling.ts:103-109` — `isLikelyConnectionError`

**뭐가 문제냐**
- `createClient` 실패 시 `NetworkRequestError`에 `providerCode`만 있고 status/business 필드 없음.
- `throwUnaryAPIError`를 안 타면 connection unknown으로 분류됨.

**언제 터지냐**
- delegate 미등록, client 미생성 후 API/metadata 호출

**유저/앱이 보는 것**
- 원인과 무관한 generic “연결 오류” 메시지

**최소 수정**
- provider code별 `NetworkFailureDetail` 매핑 또는 lifecycle도 structured error 반환

---

## Bro / 쉬운 말 버전

사용자가 `/bro` 또는 “쉽게 말해줘”를 요청하면 **문제 지도 구조는 유지**하고 문장만 구어체로 줄인다.  
`어디`(file:line)와 **우선순위 한 장**은 생략하지 않는다.
