# Severity Rubric

## High

Issues that directly harm users, data, or trust. Block merge.

- Auth bypass, privilege escalation, or sensitive data exposure
- Payment / transaction logic error (wrong amount, double charge, missed charge)
- Data corruption or irreversible data loss
- Wrong critical business decision (e.g. approval treated as rejection)
- Crash in a normal, non-edge-case flow
- Security vulnerability (injection, CSRF, improper validation)

## Medium

Issues that produce incorrect behavior from valid inputs, but don't directly cause data loss or security risk.

- Incorrect UI state rendered from a valid, realistic input combination
- Error message silently swallowed or displayed to wrong audience
- Retry flow broken after a failure (user stuck, no recovery path)
- Invariant broken in a realistic (non-contrived) edge case
- Loading state not reset in error path → UI permanently stuck
- Race condition that is reproducible with normal interaction speed

## Low

Issues that reduce maintainability or clarity, but don't affect runtime behavior in realistic usage.

- Missing rationale comments on non-obvious decisions
- Non-critical code duplication (same logic in 2 places, no behavioral divergence yet)
- Readability issues (misleading naming, overly nested conditions)
- Missing boundary guard on an input that is practically always valid
- Style inconsistency with no behavioral consequence

## Downgrade rules

- If a Medium issue requires a contrived or near-impossible input combination → downgrade to Low
- If a High issue is already protected by a layer above (validated at API boundary, etc.) → downgrade to Medium

## Do not report

- Pure style opinions with no behavioral or clarity impact
- Suggestions to adopt a different architecture when the current one works correctly
- Issues already flagged by linting/type checking that the author is clearly aware of
