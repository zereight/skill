---
name: gitlab-mcp-verification
description: >-
  Authoritative verification for @zereight/mcp-gitlab — mock GitLab, stdio MCP
  tool calls, npm test harness. Use when proving the MCP server works, after
  tool/auth/transport changes, or before claiming a GitLab MCP fix is done.
  Triggers on verify gitlab mcp, health_check proof, mock drive, or maintainer
  behavioral verify. Read references/ before driving.
license: MIT
metadata:
  version: "1.1.0"
  target: "zereight/gitlab-mcp"
  style: launch-doctor-drive-evidence
disable-model-invocation: true
---

# GitLab MCP Verification

Agent-oriented verification for **zereight/gitlab-mcp**. The "user" is an MCP
client calling tools; proof is JSON tool results, exit codes, and test logs — not
a browser.

**Feature recipes:** `references/` next to this file

This skill is **global** — it lives outside the repo and verifies whatever clone
the working directory points at. Nothing in the repo needs to reference it.

## Repo resolution

Every script resolves the target clone the same way:

1. `GITLAB_MCP_REPO_ROOT` when set.
2. Otherwise `git rev-parse --show-toplevel` from the current directory.
3. Otherwise the current directory.

Doctor fails fast when the resolved root has no `@zereight/mcp-gitlab`
`package.json`, so a wrong root never looks like a product failure.

```bash
SKILL="$HOME/.agents/skills/gitlab-mcp-verification"
cd ~/Documents/gitlab-mcp   # any clone works
```

## Launch

1. Match Node: `nvm use` (see `.nvmrc`, currently Node 22.x).
2. Build once per verification run (or when `build/index.js` is stale):

   ```bash
   npm run build
   ```

3. **Mock-backed drives** start their own `MockGitLabServer` on an ephemeral port
   (`findMockServerPort()`). No long-lived MCP server is required for the default
   recipes; each drive spawns `node build/index.js` for stdio JSON-RPC (see
   `test/test-health-check.ts`).

4. **Live GitLab drives** (optional, destructive/read-only per tool) need
   `GITLAB_TOKEN_TEST` or `GITLAB_TOKEN` and `TEST_PROJECT_ID` — only when a
   reference file explicitly says `live`. Prefer mock recipes first.

**Ready signal:** `doctor` exits 0. For tool drives, mock server log line
`Mock GitLab API listening` then JSON `status: "ok"` for `health_check`.

**Teardown:** Mock drives call `mockGitLab.stop()` in `finally`. Never
`pkill zereight-mcp-gitlab` or kill by binary name — only stop processes this run
spawned (mock HTTP server PID, short-lived stdio child).

## Doctor

Read-only preflight. Run from the repo clone:

```bash
bash "$SKILL/scripts/doctor.sh"
```

Requires:

- resolved root is a `@zereight/mcp-gitlab` clone
- `node` satisfies `engines.node` in `package.json`
- `build/index.js` exists (script prints `npm run build` hint if missing)
- `tsx` available via devDependencies (`npm install` done)
- No write to GitLab

If doctor fails, fix build/install before any drive.

## Drive

Default harness: **stdio MCP** + **mock GitLab** (same pattern as
`test/test-health-check.ts`, `test/clients/stdio-client.ts`).

Before driving:

1. Run **doctor**.
2. Open `references/README.md` and pick the feature ID.
3. Set a disposable run id:

   ```bash
   export GITLAB_MCP_VERIFY_RUN_ID="${GITLAB_MCP_VERIFY_RUN_ID:-$(date +%s)}"
   export GITLAB_MCP_VERIFY_ARTIFACTS="${GITLAB_MCP_VERIFY_ARTIFACTS:-$HOME/.agents/verify-artifacts/gitlab-mcp-verification/${GITLAB_MCP_VERIFY_RUN_ID}}"
   mkdir -p "$GITLAB_MCP_VERIFY_ARTIFACTS"
   ```

**Bundled drives** (repo clone = CWD):

| Feature ID | Command |
|------------|---------|
| `health-check-mock` | `bash "$SKILL/scripts/drive-health-check-mock.sh"` |
| `mock-suite-smoke` | `npm run test:mock` (full mock/unit suite; slower) |

Prefer **one reference file** per proof unless the user asked for full CI parity.

Stable handles:

- Tool names: exact registry strings (`health_check`, `list_issues`, …)
- Mock token: `glpat-mock-token-12345` (see `test/test-health-check.ts`)
- Env: `GITLAB_API_URL`, `GITLAB_PERSONAL_ACCESS_TOKEN`, `GITLAB_TOOLSETS`

Do not drive a shared developer stdio session while verification runs; mock
ports are per-run.

## Evidence

Artifacts default **outside the repo** at
`~/.agents/verify-artifacts/gitlab-mcp-verification/<run-id>/` so a clone stays
clean. Point `GITLAB_MCP_VERIFY_ARTIFACTS` at the repo only when a PR wants
in-repo proof (then ignore that path locally).

| Artifact | Contents |
|----------|----------|
| `doctor.log` | doctor stdout/stderr |
| `health-check.json` | Parsed `health_check` tool payload |
| `health-check.meta.json` | run id, git HEAD, package version |

**Proof standards**

- Exercise the **real tool path** (`tools/call` over stdio), not internal helpers only.
- Capture **request + structured result** (JSON), not only "exit 0".
- Mock drives must show **`authenticated: true`** and **`mcp_server_version`** matching
  `package.json`.
- `npm run test:mock` proves breadth; a single mapped feature proves the user path
  named in the reference file.
- Live GitLab: read-only tools unless the reference explicitly allows mutation; never
  verify destructive tools against production without explicit user consent.

## Cleanup

After each drive (including failed attempts):

```bash
bash "$SKILL/scripts/cleanup-run.sh"
```

- Stops mock servers started by drive scripts (PID file under artifacts dir).
- Does **not** delete `$GITLAB_MCP_VERIFY_ARTIFACTS` — proof survives cleanup.
- Does not remove `build/`.

Confirm evidence still exists:

```bash
test -f "$GITLAB_MCP_VERIFY_ARTIFACTS/health-check.json" && echo ok
```

## Helpers

`$SKILL` resolves through the SSOT symlink; scripts run from any CWD.

```bash
bash "$SKILL/scripts/doctor.sh"
GITLAB_MCP_VERIFY_RUN_ID=manual bash "$SKILL/scripts/drive-health-check-mock.sh"
bash "$SKILL/scripts/cleanup-run.sh"
```

`drive-health-check-mock.sh` invokes `tsx` on `$SKILL/scripts/drive-health-check-mock.ts`.

## Maintenance

When tools, auth env vars, or mock layout change, update the matching file under
`references/` and re-run doctor + one drive before merging doc-only skill changes.

This skill is global: SSOT link `~/.agents/skills/gitlab-mcp-verification` →
`~/Documents/skill/.agents/skills/gitlab-mcp-verification` (repo `zereight/skill`),
fanned out to `~/.cursor/skills`, `~/.codex/skills`, `~/.claude/skills`,
`~/.pi/skills`. After editing, run
`bash ~/.agents/skills/zereight-skill-ssot-sync/scripts/sync.sh --sync`.

For broader "did we ship it?" checks, maintainer skill `gitlab-mcp-maintainer`
phase 3 still applies; this skill is **behavioral drive**, not PR checklist replacement.
