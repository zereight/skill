# PR Review Procedure

Use when Phase 2 (Review) or Phase 4 (Fix) needs GitHub PR operations.

## Defaults

- Prefer GitHub MCP tools for reading/posting PR comments and reviews.
- Use three-dot diff against the PR base.
- Review every changed file. Internally mark each file `comment-worthy` or `no comment`.
- Do not duplicate existing review comments; check prior comments first.
- **Default: review-only in chat.** Report verdict in chat; do **not** post on GitHub unless
  the user explicitly asks (`RC`, `리뷰 달아`, `approve`, `merge`, `스레드 resolve 해`).
- Phrases such as `재리뷰`, `리뷰해줘`, `확인해줘` mean **analyze and report** — not permission
  to submit a GitHub review.
- GitHub comments in English unless the user specifies otherwise.
- **Explain findings with code, metaphor, or ASCII** — see [Output shape](#output-shape).

## PR List / Next Candidate

```bash
gh pr list --repo zereight/gitlab-mcp --state open --limit 50 --json number,title,author,reviewDecision,isDraft,reviewRequests
```

1. Prefer non-draft PRs with `reviewDecision: REVIEW_REQUIRED`.
2. Inspect `CHANGES_REQUESTED` PRs when commits/comments landed **after the latest**
   `CHANGES_REQUESTED` from the **current reviewer account**.
3. **Never use an older `CHANGES_REQUESTED` as baseline** when a newer one exists with no
   activity after it → classify as **`awaiting author`**, not re-review.
4. "Next PR" → lowest-effort actionable target from the list.

## Follow-up Triage

```bash
gh pr view <N> --repo zereight/gitlab-mcp --json number,title,reviewDecision,updatedAt,headRefOid,baseRefOid,reviews,comments,commits
gh api repos/zereight/gitlab-mcp/pulls/<N>/comments
```

1. Latest `CHANGES_REQUESTED` from current account = **only** re-review baseline.
2. Activity after baseline: commits, comments, thread replies, force-push.
3. Any post-baseline activity → re-review; none → **`awaiting author`**.
4. Re-review unresolved threads + files touched by newer commits.
5. Merge-ready in chat when P0/P1 fixed and checks pass; post/merge only on explicit ask.

## Review Comment Resolution (posting permission required)

```bash
gh api graphql -f query='query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){nodes{id isResolved path comments(first:5){nodes{id databaseId body author{login}}}}}}}}' -f owner=zereight -f name=gitlab-mcp -F number=<N>
```

For each `isResolved: false` thread, verify against **current PR head**:

- **fixed on head** → short English thanks + commit ref → `resolveReviewThread`
- **still open** → minimal fix → verify → reply + resolve
- **won't fix** → rationale reply; resolve only if documented or user accepted

Do not resolve during review-only chat.

### Resolved-thread reply tone

When a thread is **actually fixed on head**, reply before resolving:

- **English**, one or two short sentences — human maintainer voice, not AI boilerplate.
- Cite the fixing commit (short SHA) when helpful.
- No "Made with Cursor", no emoji spam, no "I've carefully reviewed…".

Good:

```text
Thanks — fixed in abc1234.
Good catch on the YAML quotes. Fixed in 398514b.
Addressed in the latest push; deleteTools now includes the new tool.
```

Avoid:

```text
Thank you for bringing this to my attention! I have thoroughly addressed your concerns...
This has been resolved as per your feedback. Please let me know if you need anything else!
```

Then `resolveReviewThread`. Do not resolve without a reply when the fix landed in a new commit.

```bash
gh api repos/zereight/gitlab-mcp/pulls/<N>/comments \
  -f body='Thanks — fixed in <short-sha>.' \
  -F in_reply_to=<COMMENT_DATABASE_ID>

gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<THREAD_ID>"}) { thread { isResolved } } }'
```

## Review Workflow

1. Fetch PR context: title/body/SHAs, comments, changed files, diff.
2. If checkout blocked, fetch PR head ref:

```bash
git fetch origin pull/<N>/head:refs/remotes/origin/pr-<N>-review
git diff <BASE_SHA> refs/remotes/origin/pr-<N>-review
```

3. Inspect risky surfaces first (auth, middleware, docs vs runtime, schemas, tests, release).
4. Verify: `npm run build`, targeted tests. Report exact blocker if env fails.

## Diff boundary

- Source of truth: `gh pr view --json files` or Pulls files API.
- Local diff: `git diff $(git merge-base origin/main PR_HEAD)..PR_HEAD` (three-dot).
- Never use `baseRefOid..headRefOid` when `main` moved — false additions possible.

## Output shape

Every review must include **at least one** of: code snippet/diff, metaphor, or ASCII diagram
(see SKILL.md § Explanation style). Tables alone are not enough for P0/P1.

**Verdict**: REQUEST CHANGES | APPROVE | NEEDS DISCUSSION  
**Confidence**: HIGH | MEDIUM | LOW

**Flow** (ASCII — required for auth/tool/transport PRs; optional for trivial docs-only):

    caller ─> middleware ─> createServer() ─> tool exposed?

**Breaking / behavior change** (when applicable)

- Surface / default / permission tier change
- Registry sets + docs + skill sync status
- Affected deploy modes (readonly / modify / full)

**README i18n sync** (when any `README*.md` changed)

- `README.md` / `README.ko.md` / `README.zh-CN.md` — updated? parity? drift notes

**Findings**

- `P1` `path:line` — **code or ASCII** showing failure mode, then one-line impact.
  - Good: diff hunk + `modify mode ─X─> delete_foo still callable`
  - Bad: "might cause issues with permission mode"

**No Comment**

- `path`: reviewed; no issue worth commenting.

**Verification**

- `command`: passed/failed with exact reason.

### Finding templates

**Code-first** (runtime / schema / registry):

    - P1 tools/registry.ts — new delete tool not in deleteTools
      // added: delete_snippet
      // deleteTools.has('delete_snippet') === false  → leaks in modify

**ASCII-first** (auth / transport / filter chain):

    POST /mcp ──no Bearer──> server PAT used ──> all tools for everyone

**Metaphor-first** (policy / docs / promotional PRs):

    Third-party SVG hotlink = stranger's poster in the lobby — content changes without our commit.

## Verification discipline

- Blockers only from primary evidence: diff, file contents, tests, CI logs, official docs.
- Unverified subagent claims → residual risk, not blocker.
- Do not recommend "merge and fix later" when core contract is broken.

## Anti-patterns

- Prose-only findings with no code snippet, metaphor, or ASCII diagram
- Posting/resolving because skill says "do not stop to ask" when user only asked to review.
- Re-review baseline from older `CHANGES_REQUESTED` while newer one has no activity after it.
- Resolving threads without verifying current head.
- Resolving without a brief thanks when fix landed in a follow-up commit.
- Closing linked issues at merge without asking reporter to verify.
