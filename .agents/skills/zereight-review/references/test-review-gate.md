# Test code review gate

Use in the **coordinator** and inject into the **Test quality reviewer** pass
prompt. Reviews **changed test code only** — production logic stays with the
other passes. Four axes: necessity, duplication/placement, slop, gaps.

**Core rule:** Every added or changed test must defend the **invariant** it
guards in one line. A test that cannot name what rule it protects is a
deletion candidate, not coverage.

**Basis skills (load the ones in scope for the diff):**

- `consolidate-test-suites` (`/Users/tao.exe/.agents/skills/consolidate-test-suites/SKILL.md`) — axes 1+2
- `testing-anti-patterns` (`/Users/tao.exe/.agents/skills/testing-anti-patterns/SKILL.md`) — axis 3
- `test-writing` (`/Users/tao.exe/.agents/skills/test-writing/SKILL.md`) — axis 3
- `zereight-react-native-testing` (`/Users/tao.exe/.agents/skills/zereight-react-native-testing/SKILL.md`) — RN lens, only when the diff has RN component tests

All four are `disable-model-invocation` reference skills: do not auto-invoke,
apply their checklists to the diff in this pass.

---

## When to run

Run when the three-dot diff touches any of:

- `**/*.test.*`, `**/__tests__/**`, `**/__snapshots__/**`
- test helpers/fixtures under test dirs (`test-utils/*`, `fixtures/*`, `mocks/*`)

Skip otherwise. Record `test scope: no` in `검증 결과`. Missing-tests concern
on a logic PR with zero test hunks stays with the **file coverage reviewer**
(one line) — do not spawn this pass just to say "no tests".

---

## 1. Necessity — one invariant per test

From `consolidate-test-suites` Hard Rules. For each added/changed test, name:

```markdown
- `<test name>` guards: <one-line invariant> | UNNAMABLE → delete candidate
```

**Rules:**

- UNNAMABLE → 🔵 Trivial + 🛠️ delete suggestion. A test with no statable
  rule is noise even when green.
- Must NOT lock implementation details (call order, internal state, exact
  call counts) unless that implementation unit itself owns the invariant.
- A new standalone regression-style file is allowed only when **all** hold:
  no canonical suite can express the case cleanly, deterministic repro,
  durable incident/contract value, and folding it in would make the suite
  less clear. Otherwise → fold into the existing suite (🛠️).

---

## 2. Duplication & placement — one owning layer

From `consolidate-test-suites` Owning Layer Rules + Duplicate Cleanup.

- Same invariant asserted in multiple layers/files → keep the **strongest
  owned location**, merge unique assertions into it, delete or simplify the
  weaker duplicates (🔵).
- Owning layer: **unit** when one module owns the rule and it reproduces
  without I/O/transport/persistence/retries/lifecycle; **integration** at
  component boundaries or with serialization/ordering/replay/coordination;
  **e2e** only when the user-visible contract cannot be trusted from
  lower layers alone.
- Tie-break unit vs integration → integration. Never e2e to compensate for
  uncertainty or because it is easier to reproduce there.
- Keeping more than one layer for one invariant is allowed only when each
  layer names a **distinct failure mode**. No named mode → merge (🔵).
- Wrong-layer placement with real maintenance cost → 🟡.

---

## 3. Slop — anti-patterns & overspecification

From `testing-anti-patterns` Iron Laws + `test-writing` overspecification
rules. Grep the changed test hunks for:

| Signal | Verdict |
| --- | --- |
| Asserting on mock existence (`*-mock` testIDs, mock render output) | 🟡 — test real behavior or unmock |
| Test-only method added to a production class | 🟡 minimum — move to test utils; 🟠 only with proven production-call risk |
| Mock at the wrong level (mocked-away side effect the test depends on) | 🟡 — mock the slow/external op, not the depended-on method |
| Incomplete mock (partial API shape, missing downstream fields) | 🟡 — mirror the real schema |
| Mock setup >50% of the test, or "mock to be safe" | 🟡 — question the mock; consider integration test |
| `mockImplementationOnce` chains, call-order assertions | 🟡 — couples to implementation |
| `spyOn` without call verification, stub call-count checks | 🔵 — use a plain fake |
| Multiple mocks per test, expect pile-up in one case | 🔵 — split by behavior |
| `beforeEach` hidden shared setup | 🔵 — factory/data helpers |

---

## 4. Gaps — axis-linked missing cases

- **Axis A (bugfix):** the fixed bug needs a failing-before repro test.
  Missing → 🟡.
- Changed branches, boundary values, or error paths with no covering
  case → 🟡 per gap (cap at top 3 per file, note the rest as one line).
- Snapshot-only coverage for a behavior change → 🟡 (snapshots lock
  output; they do not assert behavior).
- **Missing tests alone never reach 🟠.** Absence of coverage is not a
  blocker; only a proven user-facing defect is.

---

## 5. RNTL lens — only for RN component tests

When the diff has `*.tsx` tests rendering components, load
`zereight-react-native-testing` and check its Rules against the hunks:

- version first: `package.json` → v13 (sync) vs v14 (async) reference
- `screen` queries, `getByRole` first, `getByTestId` last resort
- `queryBy*` only for `.not.toBeOnTheScreen()`; `findBy*` for async,
  never `waitFor` + `getBy*`
- no side-effects inside `waitFor`; one assertion per `waitFor`
- no manual `act()` / `cleanup()`; no legacy `accessibility*` when ARIA
  props do; RNTL matchers over raw prop assertions

RNTL violations → 🔵, or 🟡 when the test asserts nothing real
(e.g. `waitFor` with empty callback, assertion outside `waitFor` on
async UI).

---

## Coordinator merge rules

- **File coverage reviewer** keeps one-line "missing tests" ownership on
  no-test-hunk PRs. When this pass ran, it owns gaps — file coverage
  cross-references instead of duplicating.
- **Quality gate reviewer** keeps production-side correctness/security;
  its "test quality" note defers to this pass when spawned.
- Never promote gap/slop findings on 🟠+ without a proven user-facing
  defect in the **production** diff. Test absence ≠ production bug.

---

## Finding format (test)

```markdown
**Axis:** necessity | duplication | slop | gap (+ `RNTL` when applied)
**Invariant:** <one line, or UNNAMABLE>
**Owning layer:** unit | integration | e2e (for axis 2)
**Minimal fix:** delete | merge into <file> | unmock <x> | add case <y>
```

---

## Handoff to coordinator

```markdown
## Test gate pass

- test files reviewed: <list or none>
- invariants named: all | UNNAMABLE ×N (<names>)
- duplicates merged/deleted: <list or none>
- slop: mock-behavior ×M, prod-pollution ×K, overspec ×L
- gaps: <top cases or none>
- RNTL lens: applied (v13|v14) | n/a
```

Record in `검증 결과`:

```markdown
test scope: yes — <files> | no
test review: completed | skipped (no test hunks) | skipped (429 — <reason>)
```
