# Output Format

## Structure

Every review must follow this order. Do not skip sections.

```
## High-Level Summary
## ✅ What's good
## ⚠️ Findings
## Case Matrix        ← only when fallback/merge logic exists
## 🎯 Verdict
```

---

## High-Level Summary

2–4 lines. Cover:
1. What the code does (one sentence)
2. Overall quality signal
3. Most important finding (if any)

Example:
> PIN entry bottom sheet that manages attempt count via `usePinAttemptCount` hook.
> Logic is well-structured and error handling is consistent. One Medium finding: partial
> prop override can silently suppress the attempt count UI.

---

## ✅ What's good

2–4 bullets. Be specific — cite actual patterns, not generic praise.

Good:
- ✅ `hasSubmittedRef` prevents double-submit during auto-submit flow
- ✅ `handleToggle` resets attempt count on open and resets form on close — correct ordering

Bad (too generic, avoid):
- ✅ Good code structure
- ✅ Error handling looks fine

---

## ⚠️ Findings

Order by severity: 🔴 Critical → 🟠 Major → 🟡 Minor → 🔵 Trivial. Max 5 unless critical issues exist.

**Each finding must include all 5 fields:**

```
### [type-icon] [severity-icon] Title

**Condition:** <exact input/state combination that triggers this>
**Impact:** <user/business/technical consequence>
**Evidence:** `<file>:<line>` — short snippet
**Minimal fix:** <smallest safe change, ideally a code snippet>
```

**Type icons:** ⚠️ Potential issue · 🛠️ Refactor suggestion · 🧹 Nitpick (thorough mode only)
**Severity icons:** 🔴 Critical · 🟠 Major · 🟡 Minor · 🔵 Trivial · ⚪ Info

Example:
```
### ⚠️ 🟡 Partial prop override breaks pair invariant

**Condition:** `mismatchedCountProp` provided, `maxAttemptCountProp` absent, local state count is 0.
**Impact:** "Incorrect PIN X/Y" UI is suppressed even though caller explicitly set a mismatch count.
**Evidence:** `bottom-sheet-pin.tsx:74–80`
  const mismatchedCount = mismatchedCountProp ?? (mismatchedCountState > 0 ? mismatchedCountState : undefined)
  const maxAttemptCount = maxAttemptCountProp ?? (mismatchedCountState > 0 ? maxAttemptCountState : undefined)
**Minimal fix:** Treat the pair atomically — if either prop is provided, derive both from a shared source:
  const usePropOverride = mismatchedCountProp != null || maxAttemptCountProp != null
  const mismatchedCount = usePropOverride ? mismatchedCountProp : ...
  const maxAttemptCount = usePropOverride ? maxAttemptCountProp : ...
```

---

## Case Matrix

Include only when the code merges multiple sources (prop + state + default) or has conditional fallback chains.

Format: compact table showing input combinations and resulting behavior.

Example:
| `mismatchedCountProp` | `maxAttemptCountProp` | `stateCount` | `mismatchedCount` | `maxAttemptCount` | UI shown? |
|---|---|---|---|---|---|
| 2 | 5 | 0 | 2 | 5 | ✅ |
| 2 | — | 0 | 2 | **undefined** | ❌ Bug |
| — | — | 3 | 3 | 5 | ✅ |
| — | — | 0 | undefined | undefined | ✅ (hidden) |

---

## 🎯 Verdict

Choose one:

| Verdict | When to use |
|---------|-------------|
| **Approve** | No findings, or 🔵 Trivial / ⚪ Info only |
| **Approve with comments** | 🟡 Minor findings present but not blocking |
| **Request changes** | Any 🔴 Critical or 🟠 Major finding, or 🟡 Minor findings that affect user-facing correctness |

One line justification required.

Example:
> 🎯 **Approve with comments** — Medium finding on partial prop override should be addressed before this pattern is reused elsewhere, but doesn't block current usage.

---

## Behavior rules

- Do not report style-only issues as findings
- Do not suggest architectural rewrites unless the current approach has a correctness issue
- If uncertain about intent, state the assumption explicitly before the finding
- Every Medium/High finding must have a reproducible condition (not "this might be a problem")
- Prefer 3 sharp findings over 8 diluted ones
