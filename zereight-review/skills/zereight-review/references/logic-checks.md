# Logic Checks (Mandatory)

Run all 6 checks on every review. No skipping.

## 1. Invariant Checks

Paired/related values that must stay consistent throughout all code paths.

Common pairs to look for:
- `(count, maxCount)` — must share the same source; partial override silently breaks UI
- `(value, unit)` — mixing sources yields nonsensical display
- `(start, end)` — only one being updated leads to invalid ranges
- `(id, status)` — id without status (or vice versa) breaks downstream logic
- `(isLoading, data)` — loading cleared before data is set causes flash of wrong state

**Check**: do all code paths that update one side also update the other?

## 2. Partial-Input Checks

When inputs are optional, test what happens when only *some* are provided.

Minimum combinations to verify:
- A only (B absent)
- B only (A absent)
- Both present
- Neither present

**Check**: does each combination produce a coherent state, or does one break an invariant?

## 3. Fallback-Chain Checks

Trace every `??`, `||`, and ternary to understand the source-of-truth hierarchy.

Questions to answer:
- What is the intended priority? (prop > state > default, or state > prop?)
- Can prop and state disagree? What wins?
- If fallback source changes mid-branch, do all branches preserve the same invariant?

**Check**: can two different inputs produce contradictory derived values that are then used together?

## 4. State vs UI Checks

The condition that triggers a computation and the condition that renders its result must be in sync.

Common mismatch pattern:
```
// Computed when A && B both present
const value = A && B ? compute(A, B) : undefined

// Rendered when only A present  ← MISMATCH
if (A) show(value)  // value could be undefined here
```

**Check**: is every render guard at least as strict as the computation guard?

## 5. Boundary Checks

Test at and around the edges of valid input ranges.

Values to always test:
- `0` (zero — often off-by-one or division by zero risk)
- Negative numbers (especially for counts, sizes, timestamps)
- `undefined` / `null` (distinguish if the code handles both)
- Empty string `""` (often falsy but type-valid)
- Maximum values (overflow, display truncation)
- Minimum values (clamp correctness)

**Check**: are clamps/guards present, and do they reject or normalize invalid inputs consistently?

## 6. Async / Race Checks

Verify state transitions across async operations.

Key patterns to check:
- **Stale closure**: does the callback capture a value that may have changed by the time it runs?
- **Double submit**: is there protection against submitting while a request is in-flight?
- **Loading flag recovery**: if the async path throws, is `isLoading` reset in `finally`?
- **Order dependency**: does the code assume `open → fetch → submit` always happens in that order?
- **Cleanup on unmount**: does cancellation/abort happen if the component unmounts mid-request?

**Check**: draw the state machine for open/close/reset/submit/error. Are there unreachable "stuck" states?
