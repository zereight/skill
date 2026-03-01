# Review Examples

Real-world finding examples in zereight-review output format.

---

## Example 1: Partial prop override breaks pair invariant

**Context:** React Native bottom sheet with PIN attempt count display.
Two values (`mismatchedCount`, `maxAttemptCount`) must always be shown as a pair (e.g. "3/5").
Both can come from props or internal state, with independent fallback chains.

### Full review output

---

**High-Level Summary**

PIN entry bottom sheet managing attempt count via `usePinAttemptCount` hook.
Overall structure is clean; hook separation is appropriate. One Minor finding:
partial prop override silently breaks the paired display invariant.

**✅ What's good**

- ✅ `hasSubmittedRef` prevents double-submit during auto-submit flow
- ✅ `handleToggle` resets attempt count on open and resets form on close — correct ordering
- ✅ `useImperativeHandle` exposes only what callers need; internal reset is not leaked

**⚠️ Findings**

### ⚠️ 🟡 Partial prop override breaks pair invariant

**Condition:** `mismatchedCountProp` provided, `maxAttemptCountProp` absent, `mismatchedCountState` is 0.
**Impact:** "Incorrect PIN X/Y" UI is suppressed even though caller explicitly set a mismatch count. The intent of the override is silently ignored.
**Evidence:** `bottom-sheet-pin.tsx:74–80`
```ts
const mismatchedCount = mismatchedCountProp ?? (mismatchedCountState > 0 ? mismatchedCountState : undefined)
const maxAttemptCount = maxAttemptCountProp ?? (mismatchedCountState > 0 ? maxAttemptCountState : undefined)
// → when mismatchedCountProp=2, maxAttemptCountProp=undefined, stateCount=0:
//   mismatchedCount = 2, maxAttemptCount = undefined  ← pair broken
```
**Minimal fix:** Derive both values from the same source rule atomically:
```ts
const usePropOverride = mismatchedCountProp != null || maxAttemptCountProp != null
const mismatchedCount = usePropOverride ? mismatchedCountProp : (mismatchedCountState > 0 ? mismatchedCountState : undefined)
const maxAttemptCount = usePropOverride ? maxAttemptCountProp : (mismatchedCountState > 0 ? maxAttemptCountState : undefined)
```

**Case Matrix**

| `mismatchedCountProp` | `maxAttemptCountProp` | `stateCount` | `mismatchedCount` | `maxAttemptCount` | UI shown? |
|---|---|---|---|---|---|
| 2 | 5 | 0 | 2 | 5 | ✅ |
| 2 | — | 0 | 2 | **undefined** | ❌ Bug |
| — | — | 3 | 3 | 5 | ✅ |
| — | — | 0 | undefined | undefined | ✅ (hidden) |

**🎯 Verdict**

> Approve with comments — Minor finding on partial prop override should be addressed before this pattern is reused elsewhere.

---

## Example 2: Stale closure in async callback

**Context:** A hook captures `authorizationId` at setup time; the sheet can be reopened with a new ID without remounting the hook.

### Finding only

### ⚠️ 🟡 Stale `authorizationId` after sheet reopen

**Condition:** Sheet is opened, closed, then reopened with a different `authorizationId` prop. The submit callback runs with the original (stale) ID.
**Impact:** PIN verification is submitted against a session that has already ended, causing a guaranteed authorization failure.
**Evidence:** `use-pin-verification-sheet.ts:38`
```ts
const handleSubmitAsync = useBankXCallback(async (pin: string) => {
  await verifyPin({ authorizationId, pin })  // ← captured at first render
}, [])  // ← missing authorizationId in deps
```
**Minimal fix:** Add `authorizationId` to the dependency array, or use a ref:
```ts
const authorizationIdRef = useRef(authorizationId)
useEffect(() => { authorizationIdRef.current = authorizationId }, [authorizationId])
// then: await verifyPin({ authorizationId: authorizationIdRef.current, pin })
```

---

## Example 3: Loading flag not reset on error path

**Context:** An async form submission sets `isLoading = true` but only resets it in the success branch.

### Finding only

### ⚠️ 🟠 Loading flag stuck on error path

**Condition:** `handleSubmitAsync` throws (network error, API 500). `isLoading` is set `true` before the call but never reset in the catch path.
**Impact:** Submit button remains disabled permanently. User cannot retry without closing and reopening the sheet.
**Evidence:** `use-pin-form-callbacks.ts:55–68`
```ts
setIsLoading(true)
const result = await submitPin(pin)
setIsLoading(false)  // ← only reached on success; throws bypass this
```
**Minimal fix:**
```ts
setIsLoading(true)
try {
  const result = await submitPin(pin)
  // handle success
} finally {
  setIsLoading(false)
}
```
