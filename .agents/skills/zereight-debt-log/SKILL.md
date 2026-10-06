---

name: zereight-debt-log
description: >-
  Log an ambiguous or uncertain finding from a code review into a running
  technical-debt ledger instead of blocking the review on it. Use when a
  reviewer is unsure whether something is actually wrong ("애매하다",
  "아리까리하다", "확신이 안 선다", "이건 일단 부채로") and wants to note it
  and move on rather than raise a blocking comment or start a full audit.
  Companion to zereight-review. Not for full-repo debt sweeps (see the
  jjw013/tech-debt-skill audit) and not for ponytail's own deliberate-shortcut
  markers (see ponytail-debt).
disable-model-invocation: true
---

# zereight-debt-log

**Chat with the user in Korean** unless they write in English.

## What this is for

During review you sometimes hit something that isn't clearly wrong — a
pattern that might be fine, a missing edge case that might not matter, a
naming choice you disagree with but can't prove is worse. Blocking on it
stalls the PR; ignoring it lets it rot silently. This skill gives it a third
option: **write it down, don't block, move on.**

One entry, one line of reasoning, appended immediately. No sweep, no
category checklist, no schema validation gate.

## Not this skill

| If the task is... | Use instead |
| --- | --- |
| Full 10-category repo-wide debt sweep (deps, security, dead code, a11y...) | `jjw013/tech-debt-skill` (`tech-debt-audit`) |
| Harvesting `ponytail:` markers left as deliberate simplification shortcuts | `ponytail-debt` |
| The actual review that produces findings | `zereight-review` (this skill logs *disposition* of a finding, it doesn't generate findings) |
| Posting findings as PR comments | `zereight-review-comments` |

If the user says "기술부채 스캔해줘" (repo-wide scan) → redirect to
`tech-debt-audit`. If they say "이건 나중에 봐도 되는 거라 애매한데 부채로
남겨두자" (this one specific thing, unsure, log it) → this skill.

## Trigger phrases

`이건 기술부채로`, `아리까리하니까 일단 부채로`, `블로킹 안 하고 부채로 남겨`,
`debt log this`, `log as tech debt`, `/zereight-debt-log`

**Usage pattern:** called *after* a `zereight-review` pass finishes, once —
with the set of items the user already decided are debt-worthy, not
blocking. This skill doesn't re-triage during the review; it just files what
it's handed.

## Ledger

Default location: `~/.agents/TECH_DEBT.md`. Create it with the header
below on first write; append below that on every subsequent write. Never
rewrite existing entries except to change `status`.

```markdown
# Tech Debt Ledger

| ID | Date | Location | Note | Why ambiguous | Status |
| --- | --- | --- | --- | --- | --- |
```

Entry format — one row per item. IDs are namespaced, never global-sequential:

`| DEBT-<provider>-<session>-<NN> | <ISO date> | <file>:<line> or (repo-wide) | <one-line what/where> | <one-line why you didn't block on it> | open |`

ID parts (all lowercase, no spaces):
- `<provider>` — your runtime slug: `muse` (Muse Code), `codex` (Codex CLI),
  `cursor` (Cursor), `pi` (Pi agent). If your runtime isn't listed and you
  can't identify it, use `local`.
- `<session>` — your current session name (e.g. `crystal-horologium`) from
  the session-identity context. If no session name is available, use the
  last 8 hex chars of the session UUID.
- `<NN>` — your own per-session index starting at `01`. Scope it to your
  prefix only: grep the ledger for `DEBT-<provider>-<session>-` and take
  max+1. Never reuse or renumber — one exception: your own rows under
  Concurrency repair.

Example: `DEBT-muse-crystal-horologium-01`. Legacy `DEBT-NNN` rows stay
as-is; they are another writer's history, not yours to migrate.

Keep the "why ambiguous" cell honest — this is what separates it from a
plain TODO. "Might be intentional, couldn't confirm with author" is a good
reason. "Didn't want to deal with it" is not — if that's the real reason,
say so to the user and let them decide whether it belongs here at all.

## Workflow

**Log** (default action):
1. Confirm the ledger path — `~/.agents/TECH_DEBT.md` unless the user
   names another file.
2. Build your prefix `DEBT-<provider>-<session>-` from your runtime and
   session identity (see Ledger). This prefix is yours alone — no other
   agent shares it.
3. Read the file if it exists; grep only your prefix and take max+1 as
   the next `<NN>`. Ignore legacy `DEBT-NNN` rows and other agents'
   prefixes entirely.
4. Append one row per item. Multiple items in one turn → multiple rows, not
   one merged row.
5. Confirm to the user: `Logged DEBT-<provider>-<session>-<NN>. Not blocking the review on this.`

**List** (`부채 목록`, `list debt`, `뭐 남겨놨어`):
Read the ledger, print open rows grouped loosely by area if there are many.
Don't re-triage them — just surface what's there.

**Resolve** (`이거 해결됨`, `DEBT-...-03 처리함`):
Flip `status` to `resolved` on the exact-ID row. Don't delete rows — the ledger is a
history, not a todo list that empties out.

**Promote to ticket** — only on explicit request. This skill does not push
to Jira/GitHub/Linear on its own. If asked, hand the row's content to
whatever ticketing skill is already in play (e.g. `bankx-jira` in this repo)
and let that skill own the actual API call and consent gate.

## Concurrency (multi-agent appends)

Multiple agents can write the ledger at the same time. Namespaced IDs make
collisions structurally impossible: two agents never share a
`DEBT-<provider>-<session>-` prefix, so each agent's `<NN>` sequence is
independent. There is no global highest-ID to race on — do not scan for one.

**Before every append (mandatory):**
1. Re-read the ledger immediately before writing — even if you already read
   it earlier in the turn. Only the pre-write read counts.
2. Recompute max+1 from your own prefix only. If your prefix already has
   the `<NN>` you planned (e.g. you wrote earlier in this session), bump
   past it — never reuse.

**Legacy collisions (duplicate `DEBT-NNN` rows from the old sequential scheme):**
- Renumber only rows **you wrote yourself in the current turn**, moving
  them to your namespaced prefix. This is the sole exception to "never
  renumber".
- Never renumber rows written by another agent — report those duplicates
  to the user and let them decide.
- After your fix, verify with a fresh read that no duplicate of your IDs
  remains.

## Boundaries

- Never silently drop a finding instead of logging it — if you're not going
  to raise it *and* not going to log it, say that out loud and let the user
  veto.
- Never use this to bury something you actually believe is wrong. If you're
  confident it's a bug, that's a review comment, not debt. This skill is for
  genuine uncertainty, not for softening a real finding.
- One-shot per log call. Don't batch-triage the whole ledger unless asked.
- Read/write only `TECH_DEBT.md` (or the user-specified ledger). Never touch
  source files.

## Verification

- [ ] Ledger file exists at the confirmed path with the header row.
- [ ] New IDs use your `DEBT-<provider>-<session>-<NN>` prefix with `<NN>`
  = max+1 over your prefix only; no duplicate of any existing row.
- [ ] Each row's "why ambiguous" cell states an actual reason, not "TODO".
- [ ] User was told the ID(s) just written and that the item is not blocking.
