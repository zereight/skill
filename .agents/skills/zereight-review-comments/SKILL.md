---
name: zereight-review-comments
description: >-
  Post zereight-review findings as Bitbucket inline PR comments (simple English
  body + ASCII diagrams + short Korean summary at end, code fixes). Use after
  zereight-review when the user asks to post review comments, inline comments,
  "댓글 달아", or /zereight-review-comments.
---

# zereight-review-comments

**SSOT:** `~/Documents/skill/.agents/skills/zereight-review-comments/`  
Mirrored to `~/.agents/skills/`, `~/.cursor/skills/`, `~/.codex/skills/` via symlinks.

**Slash command:** `/zereight-review-comments` (search full name; not the same as `/zereight-review`).

Post **actionable inline review comments** on Bitbucket PRs after a zereight review.
**Default for `zereight-review` is chat-only** — use this skill only when the user
explicitly asks to post on the host.

**Upstream:** Complete (or refresh) review per `zereight-review` / `zereight-mode`
first. This skill handles **format, anchoring, and posting** — not re-inventing findings.

**Chat with the user in Korean** unless they write in English.

**Posted PR comments:** English body + ASCII art. **One short Korean summary at the very end only.**

---

## Consent gate — MANDATORY

Post only when the user clearly requests it, e.g.:

- `댓글 달아`, `인라인 코멘트`, `PR에 코멘트 올려`, `Bitbucket에 리뷰 달아`
- `post the review`, `leave inline comments`

These **do not** grant posting consent:

- `zereight-review`, `리뷰해줘`, `코드 리뷰` → chat only

If ambiguous, ask once.

---

## Workflow

Copy into your todo list before posting:

1. **PR identity** — `bb_get_pr` (state, source/destination branch, updated time)
2. **Merged check** — if `MERGED`/`DECLINED`, tell user; still post only if they insist
3. **Fresh diff** — `git fetch origin <source> <dest>` then
   `git diff refs/remotes/origin/<dest>...refs/remotes/origin/<source>`
4. **Line numbers** — from PR source branch, not local HEAD:
   `git show refs/remotes/origin/<source>:<file-path>`
5. **Existing threads** — `bb_ls_pr_comments`; skip duplicates; use `parentId` for replies
6. **Synthesize findings** — severity order; drop findings fixed in latest commits
7. **Post inline only** — one finding per comment unless user asked for a summary comment
8. **Verify** — API returns `inline Comment successfully added`; confirm in `bb_ls_pr_comments`

---

## PR freshness gate — avoid outdated comments

**PROCESS VIOLATION:** posting line numbers from an old review without re-reading the
current PR head.

Before each post batch:

| Check | Action |
| --- | --- |
| PR `Updated` after your last review | Re-read diff + full changed files |
| Finding references removed code | Drop or rewrite |
| Author fixed issue (e.g. `useBankXEffect`) | Skip that comment; optional ✅ reply on thread |
| Line shifted | Re-resolve anchor with `git show … \| rg -n` |

Prefer anchoring on **lines in the current diff hunk** (`+` lines). Unchanged context
lines may still anchor but are more likely to go outdated on the next push.

---

## Comment format — MANDATORY (English + ASCII + Korean footer)

Every posted inline comment uses this structure.

**Language rules (strict):**

- **Main body: English only** — no Korean in the middle of the comment.
- **Footer: one short Korean summary** — 1–3 lines max, plain words, after the code block.
- **Simple English** — short words, short sentences (elementary-school level).
- Prefer: "wrong", "missing", "too small", "hidden", "breaks".
- Avoid: jargon without a plain word first (say "scroll gap" not "bottomOffset underestimation").
- One idea per sentence. Max ~12 words per sentence when you can.

**Korean summary rules:**

- Label: `**한국어 요약:**` on its own line at the **end**.
- Say: what is wrong + what to do. No duplicate of the full English text.
- Keep it short. Example: "버튼 높이만 재서 스크롤 여백이 부족합니다. CTA 컨테이너 전체 `onLayout`으로 측정해 주세요."

**ASCII art (required):**

- Add a small ASCII diagram that shows the bug or the fix.
- Use boxes, arrows, keyboard, button, screen layers.
- Keep diagrams ~3–8 lines. Monospace only. No images.

```markdown
⚠️ {severity emoji} {Severity} — {short English title}

```
{ASCII diagram here — show BEFORE (bad) vs AFTER (good) when helpful}
```

**Where:** `path/to/file.tsx:line`

**When:** {1–3 simple steps to see the bug}

**What is wrong:** {1–2 short sentences}

**Why it hurts:** {what the user sees or loses}

**How to fix:** {one short sentence}

```typescript
// small copy-paste fix
```

**한국어 요약:** {1–3줄. 문제 + 수정 방향만 간단히}
```

### Severity icons

| Icon | Level | When |
| --- | --- | --- |
| 🔴 | Critical | security, data loss, payment |
| 🟠 | Major | wrong behavior in normal flow, clear regression |
| 🟡 | Minor | UX edge, convention drift, missing tests |
| 🔵 | Trivial | nit, optional refactor |
| ⚪ | Info | observation only — usually skip posting |

**Do not post** 🔵/⚪ unless user asked for thorough nits.

### Minimal fix rules

- Include **copy-pasteable code** for non-obvious fixes
- Smallest safe change; no drive-by refactors
- BankX conventions: `useBankXCallback` / `useBankXEffect`, no `as`, design tokens

---

## Bitbucket posting — mcporter only

### Inline schema (CRITICAL)

Bitbucket MCP `bb_add_pr_comment` requires:

```json
{
  "inline": {
    "path": "packages/.../file.tsx",
    "line": 187
  }
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `inline.path` | yes | repo-relative path |
| `inline.line` | yes | 1-based line in **PR source** version |
| `inline.to` | **NO** | wrong field — creates general comment or fails validation |

**Preferred invocation:** `mcporter-bridge` → `mcporter_call_tool` with JSON `arguments`
so `inline` is a real object.

```text
server: bitbucket
tool: bb_add_pr_comment
arguments: {
  "workspaceSlug": "bank-x",
  "repoSlug": "mobile-app-workspace",
  "prId": "2917",
  "content": "...",
  "inline": { "path": "...", "line": 187 }
}
```

**Shell fallback** (escape carefully):

```bash
mcporter call bitbucket.bb_add_pr_comment \
  workspaceSlug=bank-x repoSlug=mobile-app-workspace prId=2917 \
  inline:='{"path":"...","line":187}' \
  content="..."
```

Success marker: stdout contains **`inline Comment successfully added`**.

If stdout is only `Comment successfully added` (no `inline`), the anchor failed —
fix `inline.line` and repost.

### Thread replies

```json
{ "parentId": "816226244", "inline": { "path": "...", "line": 258 } }
```

Read the parent thread first; do not duplicate another reviewer's point unless adding value.

### What not to post

- Top-level PR summary **unless** user asked for one — prefer inline per finding
- Duplicate comments after user deleted — fresh review first, then post once
- Comments on merged PRs without user acknowledgment

---

## Finding selection

From zereight synthesis, post only **comment-worthy** items:

1. 🟠 Major and 🔴 Critical — always (if still valid on current head)
2. 🟡 Minor — post when user-facing or convention-breaking
3. Skip findings already discussed and **fixed** in the PR
4. Cap at ~5–8 inline comments per pass; batch remainder in chat if needed

---

## BankX-specific anchors (common)

| Area | Typical file | Anchor near |
| --- | --- | --- |
| Date picker bounds | `bankx-wheel-date-picker.tsx` | handler or `useMemo` data |
| Hook convention | `bankx-wheel-column-picker.tsx` | new `useBankXEffect` / `useEffect` |
| Input wiring | `bankx-date-picker-input.tsx` | component swap line |

Always re-verify line numbers on the **current** PR branch.

---

## Verification checklist

After posting:

- [ ] Each comment: `inline Comment successfully added`
- [ ] `bb_ls_pr_comments` shows `**Inline Comment: File: ...**`
- [ ] No duplicate of Muscat/Shane/other reviewer threads (unless reply)
- [ ] User told: PR link + comment IDs + count posted
- [ ] If PR merged during work: note that comments are historical only

---

## Relation to other skills

| Skill | Role |
| --- | --- |
| `zereight-review` | Findings + chat synthesis; **does not post** by default |
| `zereight-review-comments` | Post findings to Bitbucket inline (this skill) |
| `zereight-mode` | BankX conventions for fix snippets |
| `bankx-jira` | Jira scope only; not for PR comment posting |

---

## Examples

See [examples.md](examples.md) for full English + ASCII examples (PR #2971 pattern).
