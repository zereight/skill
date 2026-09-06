# Async Effect Cancellation — Generation Token vs Boolean

Use when reviewing `useEffect` / `useBankXEffect` that starts an **async IIFE**
(`void fooAsync()`, `const run = async () => …`) and must ignore results after
cleanup or when dependencies re-run.

**SSOT example (BankX):** `packages/design-system-components/src/bankx-modal.tsx`
— `visible=true` → `await dismissKeyboardBeforeModalAsync()` → fade-in only if
the captured generation still matches.

---

## Scope triggers — grep the diff for any of

- `let cancelled` / `let isCancelled` / `cancelled = true` in effect cleanup
- `cancelledRef.current = false` at effect **start** (reset on re-run)
- `void <name>Async()` inside `useEffect` / `useBankXEffect`
- `await` after `visible` / `enabled` / route param flip
- Modal, bottom sheet, keyboard dismiss, navigation transition, debounced submit

If none match, mark `async cancellation: N/A` in internal notes and skip.

---

## The bug boolean cancel cannot fix

**Scenario:** `visible: true → false → true` before the first `await` resolves.

| Step | Boolean `cancelledRef` | Generation token |
| --- | --- | --- |
| Effect #1 `visible=true` | `cancelled = false`, async **A** starts | `generation=1`, async **A** captures `1` |
| Cleanup (visible=false) | `cancelled = true` | `generation` → `2` |
| Effect #2 `visible=true` | `cancelled = false` **again**, async **B** starts | `generation=3`, async **B** captures `3` |
| Async **A** resumes | `cancelled` is **false** → **stale fade-in / setState** | current `3` ≠ `1` → **skip** ✓ |
| Async **B** resumes | proceeds (intended) | `3` === `3` → proceed ✓ |

**Root cause:** boolean “cancelled” is **global mutable state** reset to `false` on
every new effect run. Old async work cannot tell “I was cancelled” from “a new
run started.”

**Generation fix:** each effect run gets a monotonic id; cleanup increments the
global counter; each async captures its id and compares before side effects.

---

## Preferred patterns (BankX / React 19)

### ✅ Generation token with `useRef` (no `let`)

```ts
const showModalGenerationRef = useRef(0)

useBankXEffect(() => {
  if (!visible) {
    // hide path…
    return
  }

  const generation = showModalGenerationRef.current + 1
  showModalGenerationRef.current = generation

  const showModalAsync = async () => {
    await dismissKeyboardBeforeModalAsync()
    if (showModalGenerationRef.current !== generation) return
    opacity.value = withTiming(1, { duration: ANIMATION_DURATION_IN_MS })
  }

  void showModalAsync()

  return () => {
    showModalGenerationRef.current += 1
    subscription.remove()
  }
}, [visible, opacity])
```

### ✅ AbortController (fetch / cancellable IO)

When the async work is a `fetch` or supports `AbortSignal`, prefer
`AbortController` in cleanup. Still combine with generation if multiple
non-abortable steps (native dismiss, animation) run in sequence.

### ❌ Boolean reset at effect entry

```ts
// 🔴 Stale async from prior run can succeed after re-open
cancelledRef.current = false
void showModalAsync()
return () => { cancelledRef.current = true }
```

### ❌ `let cancelled` in effect body

Violates `functional/no-let` in this repo; use `useRef` or generation instead.

---

## Related: keyboard dismiss without arbitrary timeouts

`KeyboardController.dismiss()` (react-native-keyboard-controller) already
`await`s `keyboardDidHide` (or resolves immediately when closed). Do **not**
recommend `Promise.race(..., setTimeout(250))` unless the reviewer has evidence
the promise never resolves **and** input refocus is unfixed.

**Layering (PLF-3866 pattern):**

1. **Input layer** — blur / skip refocus on forced OTP reset (root cause).
2. **Modal layer** — `await KeyboardController.dismiss()` + generation guard.
3. **Optional** — `keyboardDidShow` → re-dismiss while modal visible.

Hang prevention = generation invalidation, not a 250ms UX guess.

---

## Review severity guide

| Finding | Severity |
| --- | --- |
| Boolean cancel reset on effect re-run + async UI side effect (modal, navigation, setState) | ⚠️ 🟠 Major when rapid toggle/re-open is realistic; 🟡 Minor when effect deps rarely re-fire |
| Missing cancel guard on async started in effect (no boolean, no generation) | ⚠️ 🟠 Major if setState/navigation on unmounted or stale props |
| `let cancelled` only (lint issue, same race as boolean) | 🛠️ 🔵 Trivial + suggest generation |
| Generation token used correctly | ✅ Note in review; no finding |
| Arbitrary `setTimeout` race for keyboard/modal timing without contract evidence | 🛠️ 🟡 Minor — suggest event-driven `dismiss()` + generation |

---

## Review output template

When flagging, include:

1. **Condition** — e.g. modal closed and reopened before `await` completes.
2. **Impact** — stale fade-in, double navigation, setState after unmount.
3. **Evidence** — `file:line` with boolean reset + async continuation.
4. **Minimal fix** — generation capture + cleanup increment (snippet above).

---

## Ensemble routing

- **React/RN specialist pass** — primary owner when pattern appears in
  `useEffect` / `useBankXEffect` / modal / sheet / keyboard code.
- **Motion craft pass** — only if finding is about animation timing feel, not
  cancellation correctness.
- **Ponytail pass** — do not delete generation guard as `yagni`; it is a
  correctness guard for async effects.
