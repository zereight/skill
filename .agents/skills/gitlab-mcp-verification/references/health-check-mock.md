# Health check against mock GitLab

An MCP client verifies the server is alive, authenticated against GitLab, and reports MCP package version plus GitLab instance metadata from a mock `/version` endpoint.

## Sub-features

- `health-ok` — `health_check` returns `status: ok` and `authenticated: true`.
- `health-version` — response includes GitLab `version`, `revision`, and `enterprise` when mock `/version` succeeds.
- `health-mcp-version` — `mcp_server_version` matches `package.json`.

## How to get to it (user POV)

- Connect MCP client to `zereight-mcp-gitlab` / `node build/index.js` with valid GitLab credentials.
- Invoke the **`health_check`** tool with empty arguments (no project scope required).

## Driving it with stdio-mcp-mock

Preconditions:

- `bash "$HOME/.agents/skills/gitlab-mcp-verification/scripts/doctor.sh"` exits 0.
- `GITLAB_MCP_VERIFY_ARTIFACTS` directory exists (created by drive script).

- **Run bundled drive.** From a `gitlab-mcp` clone, execute `bash "$HOME/.agents/skills/gitlab-mcp-verification/scripts/drive-health-check-mock.sh"`. Exit code 0.
- **Inspect JSON proof.** Open `$GITLAB_MCP_VERIFY_ARTIFACTS/health-check.json`. Fields include `status`, `authenticated`, `mcp_server_version`, and GitLab version fields from mock.
- **Cross-check version.** Compare `mcp_server_version` in JSON to `node -p "require('./package.json').version"`. Values must match.
- **Alternate harness.** Run `node --import tsx/esm --test test/test-health-check.ts` for the same behavior inside node:test (CI parity).

## Gotchas

- Missing `npm run build` causes doctor failure before any tool call.
- Running outside a `@zereight/mcp-gitlab` clone fails doctor on the package-name check — set `GITLAB_MCP_REPO_ROOT` instead of guessing.
- Live GitLab credentials are not required for this feature; do not point at production to prove mock behavior.
- `USE_PIPELINE=true` is set by the bundled drive to match existing test harness stdin parsing.
- Cleanup removes mock PID bookkeeping only; keep `health-check.json` for the proof record.
