# Chorus Review Profile

## Intent

Use Chorus only for explicit review escalation. The profile is designed to preserve everyday cheap Codex usage while spending more reasoning only when the user asks for Chorus review.

## Trigger

Use only for explicit triggers:

- `$chorus-review`
- `chorus-review`
- `Chorus로 리뷰`
- `Chorus review`

Do not use for generic review requests.

## Reviewer Set

Primary reviewer set:

- Codex with `model_reasoning_effort = xhigh`
- Gemini
- Claude when healthy

Claude policy:

- Include Claude only if Chorus or local health state does not show active rate limit or quota exhaustion.
- Skip Claude when reset has not elapsed.
- Do not spend a full Claude run to probe uncertain health.

Quorum:

- Claude healthy: require 2 of 3 reviewers.
- Claude skipped: require Codex + Gemini.

## Readiness Interpretation

`READY` means the prerequisite is available.

`WARN` means the profile may still run, but the user should know a reviewer or xhigh guarantee is missing.

`BLOCKED` means do not claim the Chorus review profile is runnable.

Important warning:

If the readiness script says `xhigh requires patch`, Codex can still run, but xhigh is not guaranteed through Chorus.

## Example User Requests

Use this skill:

```text
$chorus-review 이 PR diff 리뷰해줘
```

```text
chorus-review로 staged diff 봐줘. Claude는 limit이면 빼고 Codex xhigh + Gemini로만.
```

Do not use this skill:

```text
리뷰해줘
```

```text
review this PR
```

## Expected Response Shape

Return:

- readiness result;
- which reviewers will be used;
- whether Codex xhigh is guaranteed;
- whether Claude was included or skipped;
- next command or blocker.
