# zereight-review-comments

Post zereight review findings as **Bitbucket inline comments** (bilingual EN/KO, structured format, code fixes).

**SSOT:** `~/Documents/skill/.agents/skills/zereight-review-comments/`

## Cursor slash menu

1. Reload Cursor window after adding or moving the skill (`Developer: Reload Window`).
2. Type **`/zereight-review-comments`** (full skill `name` from frontmatter).
3. `/zereight-review` is a **different** skill (chat review only). This skill is for **posting** inline comments.

If still missing: verify `ls -la ~/.cursor/skills/zereight-review-comments` resolves to `SKILL.md`.

## When to use

After `zereight-review`, when the user explicitly asks to post:

- `댓글 달아`, `인라인 코멘트`, `PR에 코멘트 올려`
- `post inline comments`, `leave PR comments`

## Pair with

| Skill | Role |
| --- | --- |
| `zereight-review` | Findings (chat-only by default) |
| `zereight-review-comments` | Post to Bitbucket |
| `zereight-mode` | BankX fix-snippet conventions |

## Critical gotcha

Bitbucket `bb_add_pr_comment` inline anchor uses **`inline.line`**, not `inline.to`.

## Install / sync

Symlink from Cursor and Codex (already wired if you use `~/.agents` SSOT):

```bash
ln -sf ../../.agents/skills/zereight-review-comments ~/.cursor/skills/zereight-review-comments
ln -sf ~/.agents/skills/zereight-review-comments ~/.codex/skills/zereight-review-comments
```
