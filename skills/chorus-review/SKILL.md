---
name: chorus-review
description: Cost-aware Chorus review workflow for explicit review requests only. Use only when the user explicitly invokes `$chorus-review`, says `chorus-review`, or asks to review with Chorus. Routes review work through a Claude-optional, Codex xhigh, Gemini review profile; preserves normal Codex low reasoning outside review; checks Claude health before use; avoids spending Claude/Codex quota unless this skill was explicitly requested.
---

# Chorus Review

## Trigger Guard

Use this skill only when the user explicitly invokes `$chorus-review`, says `chorus-review`, or asks to review with Chorus.

Do not use this skill for generic review requests such as `리뷰해줘`, `review this`, or `PR 봐줘`. Handle those with the normal code-review workflow unless the user explicitly asks for Chorus.

Before spending any Claude, Codex, or Gemini quota, confirm the request is an explicit Chorus review request. If it is not explicit, stop using this skill.

## Review Profile

Use this target profile for explicit Chorus reviews:

- Codex: required reviewer, `model_reasoning_effort = xhigh`.
- Gemini: required reviewer.
- Claude: optional reviewer, only when not rate limited or quota exhausted.
- Quorum: `2 of 3` when Claude is available.
- Claude unavailable: continue with Codex xhigh + Gemini as `2 of 2`.

Keep the user's normal Codex configuration unchanged. The user's everyday Codex setup can stay on low reasoning; this skill is for review-only escalation.

## Required Preflight

Run `scripts/check-chorus-review-readiness.sh` before claiming Chorus review readiness. The script is read-only.

Use the output as the source of truth for:

- whether `chorus` is installed;
- whether `chorus status` responds;
- whether Codex supports `--model` and `-c/--config`;
- whether Gemini is available;
- whether Claude is available;
- whether the installed/local Chorus code appears to support explicit Codex `model_reasoning_effort` overrides.

If readiness reports that Codex xhigh requires a Chorus patch, say that xhigh is not guaranteed yet. Do not claim xhigh is active unless the patch is detected or verified in the current turn.

## Claude Policy

Check Claude health before using it.

- If `cli-health` or Chorus precheck says Claude is `quota_exhausted` or `rate_limited` and the reset window has not elapsed, skip Claude.
- If Claude state is unknown, use the cheapest available probe or Chorus precheck result. Do not force a full Claude review just to test capacity.
- If Claude appears rate limited, do not spawn Claude anyway.
- Do not retry Claude in a loop after rate-limit or quota failure.

Claude is useful signal, not a required reviewer. Codex xhigh + Gemini is the fallback profile.

## Codex xhigh Policy

Do not rely on `~/.codex/config.toml` to make Chorus headless reviews xhigh.

Current Chorus Codex headless execution can use `--ignore-user-config`, so the user's normal `model_reasoning_effort = "low"` may be ignored. Review-only xhigh needs an explicit Codex config override in the Chorus Codex shim:

```bash
codex exec ... -c model_reasoning_effort="xhigh"
```

If the Chorus patch is missing, report the limitation and avoid overstating the result.

## Operating Steps

1. Confirm the user explicitly requested `$chorus-review` or Chorus review.
2. Run the readiness script.
3. If Chorus is unavailable, report the exact missing prerequisite.
4. If Codex xhigh patch is missing, report that xhigh is not guaranteed and point to `references/chorus-patch-plan.md`.
5. Use the Chorus review profile only when prerequisites are good enough for the requested review.
6. Skip Claude when rate limited; do not block the review on Claude.
7. Keep output outcome-first: review launched, blocked, or partially available.

## References

- `references/chorus-review-profile.md`: operational profile and examples.
- `references/chorus-patch-plan.md`: code patch needed to guarantee Codex xhigh and Claude precheck behavior.
