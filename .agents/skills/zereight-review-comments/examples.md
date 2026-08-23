# zereight-review-comments — examples

**Rule:** Posted comments = **simple English body** + **ASCII diagram** + **short Korean summary at the end**.

---

## Example 1 — 🟠 Major: bottomOffset too small (PR #2971)

**Anchor:** `bankx-cta-aware-scroll-view.tsx` line 40

**Posted content:**

```markdown
⚠️ 🟠 Major — We measure only the button, not the whole CTA footer

```
  NOW (bad)                         WANT (good)
  +---------------------------+     +---------------------------+
  | scroll content            |     | scroll content            |
  | [ text field  <focus> ]   |     | [ text field  <focus> ]   |
  +---------------------------+     +---------------------------+
  | gradient (NOT counted)    |     |                           |
  | [  SAVE button ]  ^       |     | [gradient+btn+safe area]  |
  |    only this height       |     |    count ALL of this  ^   |
  +---------------------------+     +---------------------------+
        |                                   |
        v                                   v
   field goes UNDER CTA                 field stays VISIBLE
```

**Where:** `bankx-cta-aware-scroll-view.tsx:40`

**When:**
1. Open a screen with gradient CTA (CDD or Thai OCR).
2. Open the keyboard.
3. Tap the last text field.

**What is wrong:** `onButtonLayout` saves only button height. It skips safe area padding, gradient, and container padding. Two-button CTA runs the handler twice (last win).

**Why it hurts:** The scroll gap is too small. The typing field can hide under the CTA.

**How to fix:** Measure the full footer once with `BankXCTAContainer.onLayout`.

```typescript
const handleCtaContainerLayout = useBankXCallback((event: LayoutChangeEvent) => {
  setCtaFooterHeight(event.nativeEvent.layout.height)
}, [])
```

**한국어 요약:** 버튼 높이만 재서 스크롤 여백이 부족합니다. gradient·safe area 빠져 있어요. `BankXCTAContainer.onLayout`으로 CTA 전체 높이를 한 번만 측정해 주세요.
```

---

## Example 2 — 🟠 Major: wrong ScrollView type (PR #2971)

**Anchor:** `bankx-cta-aware-scroll-view.tsx` line 55

**Posted content:**

```markdown
⚠️ 🟠 Major — Type says BankXScrollView, but code uses another ScrollView

```
  TYPE (what TS thinks)          CODE (what really runs)
  +------------------+           +------------------+
  | BankXScrollView  |  ----X--> | KeyboardAware    |
  | - themedColor    |           |   ScrollView     |
  | - GH scroll      |           | (other props     |
  | - autoScroll     |           |  may be ignored) |
  +------------------+           +------------------+
         |                                |
         v                                v
    "looks safe"                    silent behavior change
```

**Where:** `bankx-cta-aware-scroll-view.tsx:55`

**When:** Use any screen that switched to `BankXCtaAwareScrollView`.

**What is wrong:** Props come from `BankXScrollViewProps`, but we render `KeyboardAwareScrollView` with a plain spread. BankX scroll rules are not applied.

**Why it hurts:** Scroll feel, theme background, and header scroll can change with no error.

**How to fix:** Use a narrow props type, or wrap real `BankXScrollView` inside.

```typescript
type BankXCtaAwareScrollViewProps = KeyboardAwareScrollViewProps & {
  bottomOffset: NonNullable<KeyboardAwareScrollViewProps['bottomOffset']>
}
```

**한국어 요약:** 타입은 BankXScrollView인데 실제로는 다른 ScrollView를 씁니다. themedColor·스크롤 동작이 조용히 바뀔 수 있어요. props 타입을 좁히거나 BankXScrollView를 compose 해 주세요.
```

---

## Example 3 — 🟠 Major: global CTA change (PR #2971)

**Anchor:** `bankx-cta-container.tsx` line 50

**Posted content:**

```markdown
⚠️ 🟠 Major — Sticky CTA changed for ALL screens, not only 5 migrated ones

```
  MIGRATED (5 screens)              NOT MIGRATED (many screens)
  +----------------------+          +----------------------+
  | CtaAware ScrollView  |          | plain ScrollView     |
  | + bottomOffset       |          | (no bottomOffset)    |
  +----------------------+          +----------------------+
  | Sticky CTA           |          | Sticky CTA  <-- NEW  |
  +----------------------+          +----------------------+
         OK pair                         BAD pair
    scroll knows CTA                 scroll does NOT know CTA
```

**Where:** `bankx-cta-container.tsx:50`

**When:** Open email edit, phone change, or OTP input (no CtaAware scroll).

**What is wrong:** Every CTA now uses `KeyboardStickyView`. Only 5 screens got scroll `bottomOffset`. Other forms still use plain scroll.

**Why it hurts:** The field can sit under the sticky CTA on old screens.

**How to fix:** QA old input screens on iOS and Android before merge. Or make sticky opt-in until rollout is done.

**한국어 요약:** CtaAware 마이그레이션은 5곳뿐인데 모든 CTA가 sticky로 바뀌었습니다. 예전 입력 화면에서 필드가 CTA에 가려질 수 있어요. 미마이그레이션 화면 실기 QA 부탁드립니다.
```

---

## Example 4 — mcporter call (correct inline)

```json
{
  "workspaceSlug": "bank-x",
  "repoSlug": "mobile-app-workspace",
  "prId": "2971",
  "content": "⚠️ 🟠 Major — We measure only the button...\n\n```\n  NOW (bad)...\n```\n\n**Where:** ...\n\n**한국어 요약:** 버튼 높이만 재서...",
  "inline": {
    "path": "packages/design-system-components/src/view/bankx-cta-aware-scroll-view.tsx",
    "line": 40
  }
}
```

**Wrong:** `"inline": { "path": "...", "to": 40 }` — use `"line"`, not `"to"`.
