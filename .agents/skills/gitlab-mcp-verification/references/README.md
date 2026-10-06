# GitLab MCP verification map

Maintained recipes for driving **@zereight/mcp-gitlab** the way an MCP client does.
Read this index before calling tools; use the linked feature file as the exact proof script.

## Baseline preconditions

- Run from a `gitlab-mcp` clone with `npm install` and `npm run build` completed.
  The drive scripts resolve the clone from `GITLAB_MCP_REPO_ROOT`, else the git
  toplevel of the current directory.
- Run `bash "$HOME/.agents/skills/gitlab-mcp-verification/scripts/doctor.sh"` and require exit 0.
- Set `GITLAB_MCP_VERIFY_RUN_ID` (or accept the drive script default timestamp).
- Artifacts go to `~/.agents/verify-artifacts/gitlab-mcp-verification/<run-id>/`
  unless `GITLAB_MCP_VERIFY_ARTIFACTS` overrides it — outside the repo by design.
- Mock drives use disposable mock GitLab ports; do not attach to a developer's long-running stdio MCP session.

## Driving conventions

- Start from baseline unless a feature adds preconditions.
- Tool names match `tools/registry.ts` exactly.
- Mock token for health and most unit tests: `glpat-mock-token-12345`.
- Stdio drives send one JSON-RPC `tools/call` line on stdin (see `test/test-health-check.ts`).
- HTTP transport recipes live in `test/test-all-transport-server.ts` and streamable-http tests — not the default agent path.
- After mutations in live recipes, restore fixtures; never delete proof artifacts during cleanup.

## Proof and skip reporting

- Capture JSON tool payloads and exit codes, not paraphrased summaries.
- Record feature ID and entry point with every artifact directory.
- If a precondition fails, report the command and missing state; do not claim another feature path as proof.
- `npm run test:mock` is suite breadth; it does not replace a feature file's user path unless the user asked for full mock CI.

## Feature entry contract

Each feature file uses H1 plus four H2 sections in order: `Sub-features`, `How to get to it (user POV)`,
`Driving it with stdio-mcp-mock`, `Gotchas`.

## Features

- [Health check against mock GitLab](./health-check-mock.md) — stdio `health_check`, auth + version metadata.
- [Tool catalog smoke](./list-tools-mock.md) — `tools/list` shape and expected tool presence (mock env).
- [List issues (mock)](./list-issues-mock.md) — read path via mock GitLab issue API (when extending verification).
