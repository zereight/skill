# Flow ownership & screen-role review

Use this reference in the **Flow ownership & screen-role** ensemble pass and in
coordinator single-pass fallback when the diff touches navigable screens,
multi-step flows, or cross-screen data handoff.

**Complements (does not replace):** correctness (`code-review`), thermo-nuclear
(layer leaks), ponytail-review (delete complexity). This lens asks: **who owns
data and orchestration, and where will the next requirement change land?**

Load repo `CLAUDE.md` / `LLM.md` **Data layering pattern** when present
(Feature / Screen / Network layers).

---

## Scope triggers — spawn the pass when ANY match

- New or changed `*Screen` / `*-screen.tsx` / navigator / route params
- Guide → detail / list → detail / wizard step handoff
- `navigation.preload`, `replace`, `push` with params that carry fetched data
- `initial*` / `prepared*` / `prepare*` props or nav params
- Upstream screen calls `*-api` / `BANKX_API` before navigating downstream
- Duplicate similar handlers across two screens (e.g. onboarding + settings)

Skip when the PR is assets, locales, tests-only, or a single-file util with no
navigation/screen boundary change.

---

## Core questions (answer for every triggered PR)

1. **Data owner:** Which screen/module **owns** each piece of data the downstream
   UI needs on first paint?
2. **Orchestration owner:** Who decides **when** fetch runs (mount, CTA, preload,
   effect)?
3. **Requirement growth:** If downstream needs **one more field** next sprint,
   do we edit upstream prepare + nav params, or only the target screen/hook?
4. **Dual paths:** Does the PR introduce **two code paths** for the same screen
   (e.g. `initialRefCode` vs full mount fetch)? What breaks if a third entry
   point is added?
5. **Empty / loading UX:** If fetch is async, is `undefined` state **loading UI**
   (not blank root)?

---

## Anti-pattern: upstream prepare for downstream display

```
[Guide]  --prepare API-->  nav params  -->  [Target Screen]  displays
```

**Valid when:** intentional one-shot bootstrap and team accepts upstream
orchestration.

**Risk when:** target screen's future data needs **accumulate in guide prepare**
and nav params — guide becomes a hidden data layer.

**Prefer when requirements may grow on target screen:**

```
[Guide]  --preload + navigate (thin)-->  [Target]  owns fetch + loading + display
```

Or: guide CTA only triggers navigation; target shows loading until ready.

**Distinguish:**

| Layer | Guide may do | Target should do |
| --- | --- | --- |
| Network | ❌ `BANKX_API` in screen file | ✅ via `*-api.ts` / hook |
| Prepare orchestration | ⚠️ CTA-time prepare (trade-off) | ✅ ongoing fetch / polling |
| Display state | ❌ | ✅ hook + UI |
| Stale async guards | ⚠️ if prepare stays on guide | ✅ or shared hook |

Calling `prepare*Async` from `*-api.ts` is **not** the same as raw API in the
screen — but **orchestration duplication** across guide screens is still a
maintainability finding.

---

## React Navigation `navigation.preload` (RN 7+)

**What preload does:** mount target screen **off-screen**, run effects, animate
in on `navigate`/`replace`.

**What preload does NOT do:** wait for network; guarantee data on first visible
frame.

**Clean pattern:**

1. Guide: `preload(screen)` + `replace(screen)` — **no** `BANKX_API` in guide
2. Target: loading UI while `verificationDetail` (or equivalent) unset
3. Target hook: fetch on mount (including preload mount)

**Do not** preload without params then expect `useState(initialFromParams)` to
update when params arrive later — **first mount wins** unless `key` remounts or
state follows route params explicitly.

**Compare to upstream prepare:**

| | Upstream prepare + params | preload + target-owned fetch |
| --- | --- | --- |
| Guide thickness | orchestration + error on guide | thin trigger |
| Target paths | often `initialX` skip branch | single mount path |
| New field on target | tempts guide prepare growth | target/hook only |
| Blank screen fix | data before nav | loading UI on target |
| Team precedent | custom per PR | RN API (`@react-navigation/core` types) |

Promote preload + loading UI as **🛠️ refactor / ⚪ Ask** when upstream prepare
is only fixing empty first frame without loading state.

---

## Requirement-change blast radius (rate the PR)

| Rating | Meaning |
| --- | --- |
| **Low** | New downstream fields → target hook/UI only; guide unchanged |
| **Medium** | Tune prepare rules / timeout → `*-api.ts` (+ maybe 2 guide files) |
| **High** | Each new entry point copies guide orchestration; nav params become feature contract |
| **Structural** | Third flow needs new `*-api.ts` + guide copy; consider shared hook |

Report blast radius in pass output: `requirement-change blast radius: Low|Medium|High|Structural — <one line>`.

---

## Checklist (file evidence required)

- [ ] Identify **source screen** and **target screen** in the flow
- [ ] List data passed via nav params / props — will it grow?
- [ ] Trace **first paint**: what is `undefined` before async completes?
- [ ] Count **duplicate orchestration** blocks (requestId, focus invalidate, etc.)
- [ ] Count **prepare / status-switch** duplicates across features
- [ ] Note **hook branches** (`if (initialX) skip …`) — dual path debt
- [ ] If RN: grep diff for `preload(` — used, missing opportunity, or N/A
- [ ] Cross-check **data layering** doc: Screen vs Feature vs Network types
- [ ] Simulate: "target needs one more API field" — list files to touch

---

## Ensemble pass output format

Return to coordinator:

```markdown
## Flow ownership pass

- **data owner:** <screen/hook/module> — <one line>
- **orchestration owner:** <who triggers fetch>
- **upstream prepare used:** yes | no
- **RN preload applicable:** yes (used | recommended) | no | N/A
- **dual code paths:** yes | no — <detail>
- **requirement-change blast radius:** Low|Medium|High|Structural — <reason>
- **loading UI on async gap:** yes | no | N/A

### Findings
(⚠️/🛠️ with file:line, condition, impact, minimal fix)

### Alternatives considered
(one paragraph: upstream prepare vs preload + target owner — which fits THIS PR)
```

Default severity: **🛠️ refactor** or **🟡 Minor** for ownership/pattern issues;
**🟠 Major** only when wrong owner causes user-facing bug (empty screen, stale
nav, wrong screen on error) with file evidence.

---

## Calibration: MP-1992 (711 dipchip QR) — not automatic regression

- **Problem:** QR screen empty while mount-time fetch pending
- **PR approach:** guide CTA `prepare*` → `initialRefCode` → skip target first fetch
- **Ownership concern:** future QR fields may expand guide prepare / nav params
- **Cleaner alternative:** `navigation.preload` + target loading UI + single hook path
- **Not a contradiction:** guide calling `prepare*Async` from `*-api.ts` is **not**
  raw API in screen — but orchestration **duplication** across onboarding/settings
  guides is a valid finding

Use this case as **pattern recognition**, not as "always reject upstream prepare."

---

## Handoff to ponytail pass

Route to **Ponytail simplicity** subagent (do not duplicate as Major):

- Identical guide orchestration copied twice → `yagni` / shared hook
- `initialX` branch + full mount branch in same hook → `shrink` / single path
- Speculative `prepare` fields not needed this PR → `delete` / `yagni`

Ponytail pass owns **line-count and duplication**; this pass owns **role and
future change location**.

## Handoff to navigation gate

When findings involve **back stack**, `push`/`replace`, or `resetTargetStack`,
split by **caller + path tag** per `references/navigation-review-gate.md` —
do not promote whole-PR stack regressions from flow ownership alone.
