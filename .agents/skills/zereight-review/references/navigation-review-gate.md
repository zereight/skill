# Navigation & caller-context review gate

Use in the **coordinator** (mandatory when navigation/screen flow changes) and
inject into **regression**, **React/RN**, and **flow ownership** pass prompts.

**Core rule:** A navigation finding is invalid unless it names **which symbol**,
**which production caller(s)**, and **which entry path** (stack assumption) it
applies to. Do not broadcast a stack theory across all PR paths.

Complements: `flow-ownership-review.md`, `direction-alternative-gate.md`,
`PR Axis Gate`, `Scenario Matrix` (below).

---

## When to run

Run when the diff touches any of:

- `navigation-type.ts`, `*navigator*`, `*Screen`, `navigateTo*`, `navigation.`
- `destinationAfterSuccess`, `onFaceVerifiedAsync`, `navigateConfig`
- `resetTargetStack`, `flushPreviousStack`, `navigateToDestination`
- Removed blank / hop screens that only fetched then navigated

Skip only for assets/locales/tests-only with zero navigation hunks. Record
`navigation gate: skipped (not a navigation PR)` in `검증 결과`.

---

## 1. Caller Context Gate — MANDATORY before 🟠 navigation findings

For each **new or changed** navigation helper / export used in the PR, fill:

| symbol | production callers (file:line) | entry path tag | stack assumption | finding applies? |
| --- | --- | --- | --- | --- |
| `fooNavigateAsync` | `schema.ts:SP6` only | `resume-from-stem` | `[Stem] → target` | push/replace: this path only |

**How to fill callers:**

```bash
rg "<symbol>" --glob '*.ts' --glob '*.tsx' --glob '!*.test.*' --glob '!**/__snapshots__/**'
```

Exclude: tests, mocks, comments, deleted files on PR branch.

**Rules:**

- If a finding applies to **one caller only**, say so in the **title** and
  `Applicable paths:` line. Do not imply whole-PR regression.
- If callers differ in stack shape, **split findings** per caller — never merge.
- Silence on this table for nav PRs with 🟠+ findings = **PROCESS VIOLATION**.

Record in `검증 결과`:

```
caller context: <symbol> → <callers> | table: filled | path-split: yes|no
```

---

## 2. Navigation Diff Gate — three steps (do not conflate)

For each changed navigation path, decompose into **three steps**. Compare
**like with like** across BEFORE/AFTER.

| Step | Question | Example mistake |
| --- | --- | --- |
| **Hop** | Was there an intermediate screen/navigator? Removed? | Blank screen deleted ✓ |
| **Terminal primitive** | Final entry to target: `push` / `replace` / `navigate` / `navigateToDestination`? | Compare `navigate(OnboardingNav)` with `push(Terms)` ✗ |
| **Stack contract** | `resetTargetStack` / `flushPreviousStack` / none? | Option removed but not wired elsewhere |

**FORBIDDEN:**

> "PR uses `push` but develop used `navigate`" — when `navigate` was only to a
> **hop** and develop's **terminal** step was `replace`.

Terminal-step diff must cite **the same target navigator/screen** on both sides.

---

## 3. Path tags — extend PR Axis (mandatory on nav PRs)

Tag every navigation finding with **at least one** path tag:

| Tag | Meaning | Typical stack |
| --- | --- | --- |
| `resume-from-stem` | Save point / Home resume CTA | `[Stem] → target` |
| `in-flow-continuous` | First-time flow, no save-point re-entry | `[Stem, FlowNav{…}, …]` |
| `post-fr-success` | After face-auth success CTA | varies |
| `deep-link` | Direct route entry | verify params |

Record in `검증 결과`:

```
path tags: resume-from-stem | in-flow-continuous | … — used in findings: yes|no
```

**Severity cap without verification:**

| Verification | Max severity for stack theory |
| --- | --- |
| `UNVERIFIED` (code theory only) | 🟡 + "confirm on path X" |
| Author/device confirmed OK on path P | **Withdraw** finding for path P |
| Author/device confirmed bug on path P | 🟠+ for path P |

---

## 4. Scenario Matrix Gate — before 🟠 stack/back findings

Before promoting any 🟠+ navigation/back-stack finding, add a row:

| Scenario | Stack before | Function / caller | Terminal step | Stack after | Back action | Verified? |
| --- | --- | --- | --- | --- | --- | --- |
| SP6 Home resume | `[Stem]` | `navigateTo…` @ SP6 | `push(Terms)` | `[Stem,Terms]` | back → Stem | author |

**Rules:**

- `Verified? = UNVERIFIED` → **max 🟡** unless repro steps included.
- End stacks `[Stem, Terms]` vs `[Stem, FlowNav, Terms]` are **different scenarios** — separate rows.
- GIF/PR description counts as weak evidence; label `Verified? = PR-GIF` not `confirmed`.

Record in `검증 결과`:

```
scenario matrix: filled | rows=N | 🟠 backed rows=M
```

---

## 5. Author / reviewer observation gate

When the author or reviewer reports **runtime behavior** in-thread (e.g. "back
shows Home", "can't repro"):

1. Add `Verified: author` (or `reviewer`) to the matching scenario row.
2. **Immediately** withdraw or downrank findings for that path — do not require
   three clarification rounds.
3. Keep findings only for **other path tags** still `UNVERIFIED`.

Record in `검증 결과`:

```
author observation reconciled: <finding> withdrawn for <path> | <finding> kept for <other-path>
```

Treat observations as **competing evidence**, not noise to refute from theory.

---

## 6. Echo dedup gate (coordinator, after ensemble)

Before synthesis, for each 🟠+ navigation finding:

| Check | Action |
| --- | --- |
| Same claim from ≥2 subagents, one evidence path | Label `echo dedup: N-agent echo` — do **not** auto-promote |
| Primary evidence = caller table + scenario row | Eligible for 🟠+ |
| Primary evidence = `navigateToDestination` comment only | **Max 🟡** until scenario row filled |

Record:

```
echo dedup: <finding-id> — promoted | demoted (N-agent echo, single evidence)
```

---

## 7. react-doctor / diff scope (navigation PRs)

Run react-doctor and diff-based tools on the **PR source ref** (review worktree
or `refs/remotes/origin/<source>`), **not** primary workspace `HEAD` unless
`HEAD` == PR source commit.

Wrong-branch scan → note in `검증 결과` and do not use diagnostics as findings.

---

## Finding format (navigation)

Every navigation finding must include:

```markdown
**Applicable paths:** `resume-from-stem` only | `in-flow-continuous` only | all callers
**Terminal step:** push | replace | navigateToDestination (cite line)
**Verified:** UNVERIFIED | author | PR-GIF | device
```

---

## Calibration: PR #4048 (MP-2924)

**What went wrong:**

- Compared `navigate(OnboardingNavigator → blank hop)` with `push(Terms)` as if
  same migration; terminal step was `replace(Terms)` on develop.
- `navigateToOnboardingProductTermsAsync` has **single caller** (SP6,
  `resume-from-stem`); end stack `[Stem, Terms]` — `push` vs `replace` finding
  was **overstated**.
- `resetTargetStack` / Fatca back-stack theory applied to **whole PR**; only
  `completeFaceVerification…` + `in-flow-continuous` / `post-fr-success` paths
  were in scope for that concern.
- Ensemble ×N echoed without caller grep.

**Fixes encoded in this gate:** Caller Context, Navigation Diff (3-step),
Path tags, Scenario Matrix, Author Observation, Echo dedup.

---

## Handoff to regression / React/RN passes

Return to coordinator:

```markdown
## Navigation gate pass

- caller table: filled | skipped
- terminal-step diffs: <list hop vs terminal changes>
- path tags used: …
- scenario matrix rows: N (UNVERIFIED: M)
- findings split by path: yes | no
- author observations reconciled: …
```

Default severity: unverified stack theory → 🟡; verified wrong back target → 🟠.
