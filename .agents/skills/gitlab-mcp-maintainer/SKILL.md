---

name: gitlab-mcp-maintainer
description: Single entry for zereight/gitlab-mcp maintainer work — triage, review, verify, fix, merge; short Korean follow-ups (머지 ㄱ, 수정해줘, ~된거지?); repo-state checks before release/CI claims; explain findings with code, metaphor, or ASCII diagrams. Loads references/pr-review.md and references/review-focus.md on demand. Replaces gitlab-mcp-pr-review and gitlab-mcp-review-focus.
metadata:
  short-description: Maintainer workflow for zereight/gitlab-mcp
disable-model-invocation: true
---

# GitLab MCP Maintainer

One skill for maintainer work on `zereight/gitlab-mcp`. **Invoke this only** — do not
load deprecated `gitlab-mcp-pr-review` or `gitlab-mcp-review-focus`.

## Defaults

- Answer Korean prompts in Korean.
- Infer PR/issue from the thread before asking.
- **Chat-only** until explicit post/push/merge (`머지 ㄱ`, `리뷰 달아`, `merge`, `푸시`).
- **Merge lock** — see [Merge authorization](#merge-authorization). `ㄱ` / `진행` / `다 해` never mean merge by themselves.
- **Explain with code, metaphor, or ASCII** — see [Explanation style](#explanation-style).

## Workflow

```text
Context → Triage? → Review → Verify? → Fix? → Merge?
   ↑         (optional)    ↑      (yes/no)  (on ask)  (on ask)
   └─ session continuity / repo state gate ─┘
```

| Phase | When | Do |
|-------|------|-----|
| **0 Context** | Every turn | Infer PR #, issue, or topic from last 3 turns; search open PRs if topic repeats across sessions |
| **1 Triage** | `리뷰 가능한 pr`, `next PR` | `gh pr list`; follow pr-review.md § PR List |
| **2 Review** | URL, `리뷰해줘`, `재리뷰` | Read [references/review-focus.md](references/review-focus.md) then [references/pr-review.md](references/pr-review.md); verdict in chat; **tool/env PRs → §2 breaking sync**; **README PRs → §2g i18n sync** |
| **3 Verify** | `~된거지?`, `다 확인됐지?`, `상관없지?` | Repo state gate + checklist table → one-line verdict |
| **4 Fix** | `수정해줘`, `고쳐`, `다 고쳐 ㄱ`, review feedback | Worktree on PR head; fix threads/CI; verify; push fix commits. **Ends at push — never merges.** Nothing to fix → report "수정할 것 없음" and stop |
| **5 Merge** | `머지 ㄱ`, `머지해줘` | Merge gate → `gh pr merge` → **post-merge issue note** (pending release; see below) |
| **6 Release** | `릴리즈`, `release`, publish 완료 | `scripts/release.sh` → npm publish → **post-release issue note** (version + verify) |

**Short follow-up routing** (skip named phases when obvious):

| User says | Jump to |
|-----------|---------|
| `머지 ㄱ` | 0 → 5 |
| `수정해줘`, `고쳐`, `다 고쳐 ㄱ` | 0 → 4 (**stop; no merge**) |
| `~된거지?` | 0 → 3 |
| `재리뷰 요청`, `리뷰 요청` | 0 → 4 (leftover fix) → § Re-review requests |
| PR URL + silence | 0 → 2 |

## Merge authorization

Merge (and revert, close, release, branch delete) is irreversible from the user's view.
Only run `gh pr merge` when **the latest user message** contains an explicit merge word:

| Authorizes merge | Does NOT authorize merge |
|------------------|--------------------------|
| `머지`, `머지 ㄱ`, `머지해줘`, `merge`, `merge it` | `ㄱ`, `고고`, `진행`, `다 해`, `다 고쳐 ㄱ`, `알아서`, `마무리` |
| | green CI, APPROVED review, "nothing left to fix" |
| | merge words from earlier turns or other PRs |

```text
latest msg has 머지/merge? ──no──> STOP after fix/verify; last line: "머지하려면 '머지 ㄱ'"
        │
       yes
        v
   Merge gate (below) ──> gh pr merge
```

Ambiguous (`ㄱ` right after a verdict that mentioned merge) → ask one line:
`#<N> 머지할까요? (CI green, 리뷰 APPROVED)` — do not infer.

Post-merge issue comments inherit the same lock: no merge → no "Merged to main" comment.

## Re-review requests

When the user asks to request (re-)review (`재리뷰 요청`, `리뷰 요청`, `수정하고 재리뷰 요청 ㄱ`):

1. Verify head first: diff intent intact, threads fixed/resolved, `gh pr checks` (note in-progress jobs).
2. If PR author is `zereight`, post `@cursor please review this PR` via
   `gh pr comment` — do **not** use `@coderabbitai review` (rate-limited; see #728).
3. Poll once (~60s) for the `cursor` "Taking a look!" ack; report landed vs pending.
4. If author is not `zereight`, ask before mentioning `@cursor`.

## Progressive disclosure

| Need | Read |
|------|------|
| PR list, triage, posting rules, resolution, output format + explanation templates | [references/pr-review.md](references/pr-review.md) |
| Auth matrix, Zod/MCP schema, docs traps, CI wiring, ASCII/metaphor banks | [references/review-focus.md](references/review-focus.md) |
| Agent mistake → durable fix | `session-lessons` |
| User preference → skill | `workflow-from-chats` |

Do not load both references for `머지 ㄱ` or pure yes/no verify.

## Explanation style

**Abstract prose alone is not enough.** Every review, verify, or merge-gate answer must use at
least one of:

| Mode | When | Format |
|------|------|--------|
| **Code** | Bug, diff, config, API contract | Minimal snippet or diff hunk — the line that breaks or fixes |
| **Metaphor** | Policy, risk, precedence, "why block merge" | One short analogy — not cute, not padded |
| **ASCII** | Flows, gates, filter chains, state machines | Box/arrow diagram, ≤15 lines |

### Rules

1. **P0/P1 findings** → code **or** ASCII **plus** one-line impact. Metaphor optional but good for policy PRs.
2. **Verdict / yes-no** → ASCII gate diagram **or** code evidence; table for checklist only.
3. **Tables** → status/evidence columns. Causal chains (`A → B → leak`) → ASCII, not bullet essays.
4. **GitHub comments** (when posting) → code fix only; skip metaphor/ASCII in thread replies.
5. Keep diagrams small. Prefer `┌─┐ │ └─┘` or `->`; no Mermaid unless user asks.

### Examples

**Code** (concrete failure):

```diff
- deleteTools.has('delete_foo')  // missing from registry
+ // delete_foo passes modify mode → user can delete in "modify"
```

**Metaphor** (policy PR):

> Third-party badge = renting billboard space on our README header. Star History is our own sign.

**ASCII** (merge gate):

```text
gh pr checks ──fail──> STOP
      │
     pass
      v
unresolved threads? ──yes──> STOP
      │
      no
      v
MERGEABLE + explicit user ask ──> gh pr merge
```

**ASCII** (tool filter chain — see review-focus.md §2c):

```text
toolsets ─> individual ─> legacy flags ─> permission mode ─> regex ─> exposed
                                              │
                                    modify blocks deleteTools
```

### Anti-patterns (explanation)

- Long paragraph where a 5-line ASCII would show the gate.
- "This could be problematic" without a snippet or diagram.
- Metaphor with no tie-back to the actual file/flag/line.
- ASCII novel (>15 lines) — split or summarize in a table instead.

## Yes/no questions

Never answer with only **예/아니오**.

1. Run repo state gate + topic checks.
2. Table: check → status → evidence.
3. **ASCII or code** showing the gate path (pass/fail).
4. One-line verdict.

## Repo state gate

Before **merged / on main / CI green / review done / release side-effects**:

```bash
git fetch origin main
gh pr view <N> --repo zereight/gitlab-mcp --json state,mergedAt,headRefName,reviewDecision
git show origin/main:<path>
gh pr checks <N> --repo zereight/gitlab-mcp
gh run view <run-id> --log-failed
```

State verified ref (e.g. `origin/main` @ `abc12345`). Do not describe `main` from local `feat/*` alone.

## Merge gate

Before `gh pr merge` (explicit user request only — [Merge authorization](#merge-authorization) must pass first):

0. Quote the user's merge word in chat before running the command (e.g. `요청: "머지 ㄱ"`).

1. `gh pr checks` — required jobs pass.
2. Unresolved review threads — none blocking unless waived.
3. Latest `CHANGES_REQUESTED` addressed or dismissed with rationale.
4. PR `OPEN`, mergeable.
5. **Breaking / tool-sync** (when PR touches tools, env exposure, or defaults):
   - `deleteTools` / `readOnlyTools` / `destructiveTools` / toolset membership updated
   - `npm run check:skill-sync` pass
   - env-var docs + `docs/tools/index.md` + changelog reflect behavior
   - permission-mode tests pass if `GITLAB_PERMISSION_MODE` surface changed
6. **README i18n** (when PR touches any root `README*.md` or user-facing behavior in README):
   - `README.md`, `README.ko.md`, `README.zh-CN.md` parity (§2g) — same env vars, flags, examples
   - version pins `@zereight/mcp-gitlab@` aligned across all three

Report merge blockers in a table **and** an ASCII merge-gate diagram showing which step failed;
do not merge tool-add or README-behavior PRs with drift.

## Linked-issue follow-up (merge vs release)

**Merge ≠ release.** Most users run `@zereight/mcp-gitlab` from npm, not `main`.
Never imply the fix is already available to reporters when only merged.

```text
merge to main ──> npm release ──> user upgrades ──> reporter confirms ──> close issue
       │                │
  pending-release    shipped wording
     comment            comment
```

Find links from PR body `Fixes #N` / `Closes #N`, cross-refs, security advisory tickets.
**Do not** `gh issue close` at merge or release — wait for reporter confirmation unless the
user explicitly says close now. Security / private disclosure tickets: same pattern.

### After merge (before release)

When `머지 ㄱ` succeeds and the PR links issues, comment with **pending release** wording
(English, short, human):

```text
Merged to main in #<PR> (merge commit <short-sha>). The fix will be available after the next npm release. Can you confirm once you've upgraded? Keeping the issue open until we hear back.
```

Skip the issue comment when there is no linked issue, or when the user did not ask to notify
reporters (merge-only request with no issue follow-up implied).

PR review threads: resolve with thanks per [pr-review.md](references/pr-review.md) §
Resolved-thread reply tone (posting permission required).

```bash
gh issue comment <N> --repo zereight/gitlab-mcp --body "$(cat <<'EOF'
Merged to main in #667 (merge commit 13c7fc1). The fix will be available after the next npm release. Can you confirm once you've upgraded? Keeping the issue open until we hear back.
EOF
)"
```

### After release

When `scripts/release.sh` completes and npm publish succeeds, comment on still-open linked
issues with the **published version**:

```text
Fixed in @zereight/mcp-gitlab@<version>. Can you confirm on your setup? Keeping the issue open until we hear back.
```

```bash
gh issue comment <N> --repo zereight/gitlab-mcp --body "$(cat <<'EOF'
Fixed in @zereight/mcp-gitlab@2.1.0. Can you confirm on your setup? Keeping the issue open until we hear back.
EOF
)"
```

Report in chat (Korean): which issues were commented, merge vs release wording used, what
stays open.

## Session continuity

Same PR / issue #563 / brew / CI speed across chats:

1. Search open PRs/issues before re-explaining.
2. Reuse `.worktrees/pr-<N>-*` when present.
3. First line of new session: `이어서 PR #581` (user habit — honor when seen).

## Maintainer surfaces

| Topic | First reads |
|-------|-------------|
| Release / brew | `scripts/release.sh`, `.github/workflows/npm-publish.yml`, `scripts/sync-homebrew-formula.sh` |
| CI / mock tests | `scripts/run-mock-tests.sh`, `.github/workflows/pr-test.yml` |
| Skills sync | `.agents/skills/`, `scripts/check-skill-sync.ts` |
| Permission semantics / destructive tools | [references/review-focus.md](references/review-focus.md) §2 Destructive-capability audit |

## Anti-patterns

- Review/verify answers that are prose-only (no code, metaphor, or ASCII)
- Reviewing a deny-list/set PR by name prefix alone — `delete_*` matching misses `cancel_*` /
  `stop_*` / `unprotect_*` teardown verbs; audit by effect (see review-focus § Destructive-capability audit)
- Trusting a doc enumeration without diffing it against the actual registry set (PR #754 needed a
  follow-up commit for `erase_pipeline_job` / `purge_dependency_proxy_cache`)
- Closing a security/teardown finding as "fixed" when only the typed-tool surface is guarded and
  the GraphQL path still passes (scope must be stated, residual risk documented, follow-up linked)
- Brew/release answers without `origin/main`
- CodeRabbit rate-limit = "review done"
- CI green from local mock tests only
- `which PR?` when `#581` or URL already in thread
- Loading 700 lines of review docs for a one-word merge follow-up
- Treating `ㄱ` / `다 고쳐 ㄱ` / green CI as merge approval (PR #771 incident: merged + posted #769 comment without a merge word)
- Resolving review threads silently (no short thanks reply)
- Closing linked issues at merge time without reporter confirmation
- Issue comments that say "Fix is on main" or "Fix shipped" before npm publish — use pending-release wording after merge; versioned wording after release
- AI-sounding GitHub comments ("Thank you for your valuable feedback…")
- Updating `README.md` only while ko/zh still show old permission-mode or env examples
- Re-running `scripts/release.sh` when HEAD is already at the current tag (empty patch / blank notes) — script refuses; do not force
