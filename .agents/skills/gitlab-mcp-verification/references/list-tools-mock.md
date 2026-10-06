# Tool catalog smoke

An MCP client lists available tools after connect to confirm the server advertises the GitLab tool registry expected for the configured toolsets.

## Sub-features

- `tools-list` — `tools/list` returns without error over stdio.
- `tools-health-present` — result includes `health_check`.
- `tools-toolsets` — count aligns with `GITLAB_TOOLSETS` env for the run.

## How to get to it (user POV)

- Connect MCP client to the GitLab MCP server.
- Use the client's tool picker or send MCP **`tools/list`**.

## Driving it with stdio-mcp-mock

Preconditions:

- Doctor passes.
- Mock GitLab running or env pointing at mock API (same as health check base env).

- **CI parity.** Run `npm run test:mock` and require exit 0 (includes schema and transport coverage).
- **Targeted test.** Run `node --import tsx/esm --test test/mcp-server-name.test.ts` when verifying server identity strings only.
- **Proof.** Save test stdout to `$GITLAB_MCP_VERIFY_ARTIFACTS/tools-list.log` when driving manually; exit code 0 is necessary but not sufficient — log must show passing tests.

## Gotchas

- Full `test:mock` takes minutes; use health-check drive for a fast pre-merge proof unless tool registry changed.
- Tool names in docs must stay synced — run `npm run check:skill-sync` when registry edits land.
- Empty `GITLAB_TOOLSETS` behavior is covered by `test/test-empty-toolsets.ts`; do not assume defaults without reading env docs.
