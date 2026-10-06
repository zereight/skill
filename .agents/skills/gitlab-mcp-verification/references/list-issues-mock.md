# List issues (mock)

An MCP client reads project issues through **`list_issues`** against mock GitLab issue endpoints — the common read-only agent path after connect.

## Sub-features

- `list-issues-default` — returns JSON array (possibly empty) without GitLab 400 from blank filters.
- `list-issues-filter` — label or state filters return stable shapes (see `test/test-list-issues.ts`).

## How to get to it (user POV)

- Configure MCP with GitLab token and project access.
- Call **`list_issues`** with `project_id` (or namespace path per tool schema).

## Driving it with stdio-mcp-mock

Preconditions:

- Doctor passes.
- Mock GitLab seeded or default mock routes active (see `test/utils/mock-gitlab-server.ts` issue store).

- **Harness reference.** Run `node --import tsx/esm --test test/test-list-issues.ts`. Exit code 0.
- **Blank filter regression.** When touching query serialization, also run `node --import tsx/esm --test test/test-blank-filters.ts`.
- **Proof.** Capture passing test output under `$GITLAB_MCP_VERIFY_ARTIFACTS/list-issues.log`.

## Gotchas

- This feature file does not yet ship a one-command bundled shell drive; use the test paths above or extend `scripts/` following `drive-health-check-mock.ts`.
- Live `list_issues` against gitlab.com consumes rate limit; prefer mock tests in CI and pre-merge verification.
- Project id must match mock fixture data or responses will be empty — empty is valid proof if the call succeeded.
