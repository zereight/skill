# Direction Alternative Gate

Use this in the **coordinator** (mandatory) and inject into **ponytail** +
**thermo-nuclear** pass prompts. Do **not** spawn a 10th subagent for it —
ensemble echo already failed here; the coordinator must write the table.

**Question this gate answers:** Is the PR the smallest *correct* change, or
the smallest change *inside a dual-path the repo no longer needs*?

---

## Why this exists

PR #4049 (MP-2927) retargeted `upsertMetadataAsync(CLIENTS.API → CERT)` because
the API client was not created yet. That 1-line fix was **locally correct**.
The better fix was: create the API client first (or drop CERT) so the original
call stays valid. Review approved the symptom fix because:

1. Axis A + 1-line diffs skipped architecture (`Skip for trivial single-file`).
2. API spec `client: CLIENTS.CERT` was treated as architectural SSOT.
3. Reviewer comment “inject into both clients” was **refuted** from the PR
   author’s framing instead of treated as a competing hypothesis.
4. Ponytail said `Lean already. Ship` without grepping whether CERT still had
   live callers.

---

## When to run

Run on every code PR (any `*.ts` / `*.tsx` / `*.kt` / `*.swift` outside tests,
locales, snapshots). Skip only for assets/locales/tests-only — then record
`direction alternative: skipped (not a logic PR)`.

**1-line and “trivial” diffs are in scope.** Especially:

- Target swap: `CLIENTS.A` ↔ `CLIENTS.B`, mock ↔ real, flag on/off
- Dual upsert / dual client / dual hook “also write the other one”
- Reorder-sensitive calls (`createX` then `useX`)
- Workaround comments: “because X is not ready yet”

---

## Mandatory table (before Approve)

Write **at least two** alternatives besides the PR. Silence = PROCESS VIOLATION.

| Option | What changes | Why it would work | Net complexity |
| --- | --- | --- | --- |
| **A — PR as written** | (the diff) | | |
| **B — reorder / hoist** | Move the cheap prerequisite (create client, init, flag) before the failing call | Original call site stays | |
| **C — delete a path** | Remove the unused client/flag/hook so only one path remains | Dual-path was the bug | |

If B or C is strictly simpler and still fixes the user-facing bug, surface it
as **🛠️** (not a merge blocker unless user-facing risk remains in A). Do **not**
hide it because “this PR is a 1-line fix”.

---

## Core questions (answer all)

1. **Symptom vs cause:** Does the diff change the *call target* to match the
   currently-alive object, instead of making the originally-intended object
   alive (or deleting the extra object)?
2. **Live callers:** Grep the **sibling identifier** (`CLIENTS.CERT`,
   `createCertClientAsync`, the other hook, the other flag). Count production
   callers excluding tests, mocks, comments, dead API-spec fields.
   - Spec/config `client:` fields are **settings**, not proof the path is
     required. If every spec points at CERT but runtime only needs one gRPC
     client, CERT is a candidate for **C**.
3. **Init order:** Can moving `createX` / `initX` before the failing call make
   option A unnecessary? If yes, B is the default 🛠️.
4. **Existing PR comments:** Each thread is a **competing hypothesis**. Adopt
   it, or explain why that implied alternative is *worse* (blast radius,
   timing, security) — never “author already handled it” from the PR
   description alone.
5. **Echo check:** If baseline + regression + quality all Approve A and none
   mention B/C, that is **not** consensus. Coordinator must still fill the
   table from file/grep evidence.

---

## Ponytail injection (1-line target-swap)

Do **not** emit `Lean already. Ship` on a target-swap until sibling grep is
done. If the sibling has ~0 production callers (or only exists to serve this
workaround), finding shape:

`L<n>: delete: retarget to unused dual client. Create the intended client first, or delete the unused client.`

Net line count may be **negative in a follow-up PR**, not in this hunk —
still report it. Correctness of A is out of ponytail scope; **existence of C**
is in scope.

---

## Thermo injection

Code-judo for dual-path workarounds: prefer **one client / one hook / one
flag**. Do not recommend extracting a helper that writes to both paths unless
both paths have proven live callers after this PR.

---

## Severity

| Result | How to report |
| --- | --- |
| A is correct and B/C are worse or equal | ⚪ Info — table only, Approve A |
| B or C is simpler and still fixes the bug | 🛠️ refactor (or 🟡 if leaving A will re-break on the next similar call) |
| A introduces a new dual-write and callers of the other path are zero | 🟡 — do not Approve as “minimal correct fix” without naming C |
| A is user-facing broken even after B/C | 🟠+ as usual |

Never block merge **only** because C is a larger cleanup. Do **not** skip
naming C.

---

## 검증 결과 row (required)

```
direction alternative: A=<one line> | B=<one line> | C=<one line> — recommend <A|B|C> because <reason>
```

or `direction alternative: skipped (not a logic PR)`.

Silence on a logic PR = PROCESS VIOLATION.
