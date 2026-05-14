---
name: opencode-build-subagent
description: "Explicit-only opencode delegation skill for research drafts, source discovery, timeline/IOC drafts, file/text edits, code exploration, first-pass triage, and review-assist candidate discovery. Codex must verify primary evidence before final conclusions."
---

# opencode-build-subagent

Use this skill ONLY when the user explicitly asks for opencode delegation.
Trigger keywords: '$opencode-build-subagent', '-build-subagent', 'use opencode', 'with opencode', 'opencode', 'opencode skill', or similar explicit opencode wording (including romanized Korean: opencode sseo, opencode ro). Do NOT auto-delegate without explicit user request.

## Delegated task coverage

- Security research drafts / candidate collection
- Research drafts: source discovery, timeline/IOC/explanation drafts, comparison drafts
- File/text edits, narrow code exploration, impact-candidate collection
- First-pass test/log failure triage
- Refactor/design drafts, docs/PR description drafts
- Review-assist candidate discovery

## Contract

- Always call `/Users/tao.exe/.codex/bin/opencode-build-subagent` for delegated work.
- The worker always runs `opencode run` with agent `build`.
- Default model is `opencode-go/deepseek-v4-flash`.
- The worker may edit the current checkout directly.
- **opencode output is candidate/helper output, NOT final evidence.**
- Codex must inspect primary evidence (file contents, git diff, test output, logs) before asserting findings or verification.
- Keep work local only when the task is tiny, security-sensitive, destructive, blocked by permissions, or explicitly requires Codex-native tools.
- Do not delegate: connector evidence reads, destructive decisions, final verification/conclusions after primary evidence, simple Q&A, current mode/status checks: these require Codex with primary evidence.

## Required Follow-up

After every worker run:

1. Inspect `git diff --stat` and changed file names.
2. Review changed files against primary sources before asserting correctness.
3. Run the smallest relevant verification available.
4. Mention that opencode edited the checkout if files changed.
5. Do not treat opencode output as verified: re-check with primary evidence.

## Example

```bash
/Users/tao.exe/.codex/bin/opencode-build-subagent \
  --dir /Users/tao.exe/Documents/bankx/mobile-app-workspace \
  "Implement the requested change. Keep edits minimal."
```
