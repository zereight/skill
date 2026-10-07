# Review Focus (zereight/gitlab-mcp)

Repo-specific lens for Phase 2 (Review). Apply after fetching the PR diff.

**Explain every P0/P1 with code, metaphor, or ASCII** (SKILL.md § Explanation style).
Use ASCII for chains (auth, tool filters, transport matrix); use code for registry/schema bugs;
use metaphor for policy/README/promotional risks.

## Priority order

1. Runtime safety and auth boundaries
2. **Breaking changes + env/tool/docs sync** (tool-add/remove PRs, permission modes)
3. Transport/auth configuration matrix
4. Docs examples vs runtime validation
5. Personal/local workflow leakage
6. Tests and CI script wiring
7. Generated/release docs
8. **README i18n sync** (`README.md`, `README.ko.md`, `README.zh-CN.md`)
9. Maintenance clarity

## 1. Runtime safety and auth

When flagging auth issues, draw the request path:

```text
Client ──> transport (stdio/SSE/HTTP) ──> middleware ──> token source ──> tool call
                │                              │
           STREAMABLE_HTTP?              REMOTE_AUTH / OAuth / PAT?
```

Checklist (pair each hit with code or ASCII in findings):
- unauthenticated `/mcp` reaching tool execution
- server-side PAT/JOB token used for remote callers
- middleware no-op under some flag combo
- static token differing across stdio / SSE / Streamable HTTP
- OAuth Bearer treated as PAT
- credential stores / migrations changing auth silently
- `trust proxy` breaking OAuth rate limits (`req.ip`, `X-Forwarded-For` with ports)
- `GITLAB_ALLOWED_GROUPS` only at issuance — docs must say existing sessions not revoked
- group lookup errors must fail closed
- `setAuthTimeout` releases session slots, not only clears maps

Metaphor bank (pick one, tie to actual flag/path):

| Risk | Metaphor |
|------|----------|
| Server PAT for remote callers | Master key under the doormat — every visitor gets admin |
| OAuth Bearer as PAT | Showing passport at bank teller window that only accepts employee badge |
| `trust proxy` misconfig | Wrong apartment number on the buzzer — rate limit hits neighbor |
| Group allowlist at issuance only | VIP list checked at door, not re-checked at bar |

## 2. Breaking changes and env ↔ tool sync

**Goal:** reviewers and users must *see* behavior changes before merge — not discover them
after deploy. Tool-add/remove PRs must keep registry sets, docs, skills, and tests aligned.

### 2a. When to run (trigger)

Any PR that:

- adds, removes, or renames an MCP tool (`tools/registry.ts`, `index.ts` switch cases)
- changes tool exposure (`GITLAB_PERMISSION_MODE`, `GITLAB_TOOLSETS`, legacy flags, regex deny)
- changes defaults, deprecations, or fail-closed behavior
- updates permission / destructive / read-only semantics

### 2b. Registry sets (`tools/registry.ts`)

New or renamed tools → verify membership in the right exported sets:

| Set | Purpose | Example |
|-----|---------|---------|
| `allTools` + `TOOLSET_DEFINITIONS` | toolset filter | new `list_foo` in correct toolset |
| `readOnlyTools` | `GITLAB_PERMISSION_MODE=readonly` | pure reads only |
| `deleteTools` | `GITLAB_PERMISSION_MODE=modify` blocks these | all `delete_*` + 7 named teardown verbs (§ Destructive-capability audit) |
| `destructiveTools` | MCP `destructiveHint` annotation | data-loss tools (broader than `deleteTools`) |
| `wikiToolNames` | `USE_GITLAB_WIKI` legacy override | wiki CRUD |

**`modify` mode trap:** `deleteTools` is narrower than `destructiveTools` — merge/protect/push
stay allowed in modify. A new `delete_*` tool **must** join `deleteTools` or modify mode leaks it.

```text
permission mode = modify
  │
  ├─ deleteTools ──BLOCK──> delete_*, purge_dependency_proxy_cache
  │
  └─ destructiveTools ──WARN only──> merge, protect, push (still allowed)
```

Quick check:

```bash
node --import tsx/esm -e "import { deleteTools, allTools } from './tools/registry.ts';
const deletes = allTools.filter(t => t.name.startsWith('delete_') || t.name === 'purge_dependency_proxy_cache').map(t => t.name);
const missing = deletes.filter(n => !deleteTools.has(n));
console.log('deleteTools size', deleteTools.size, 'missing', missing);"
```

#### Destructive-capability audit (name pattern ≠ effect)

`deleteTools` is a **hand-maintained name enumeration**. Name-based filtering always leaks:
PR #754 (2026-09) was exactly this — `cancel_pipeline`, `cancel_pipeline_job`, `stop_environment`,
`stop_stale_environments`, `unprotect_branch` destroy live state but never matched `delete_*`, so
they stayed callable in `modify` for ~5 months until an external security report. All five had
existed since #576 (`GITLAB_PERMISSION_MODE`) or earlier; nothing machine-checked the deny list
against the real tool surface.

**Run on every review that touches a destructive tool, permission mode, or registry sets:**

```bash
# Blocked = effect, not prefix. Any destructive verb outside delete_* must be vetted.
# Counts on main after #754: allTools 263, deleteTools 36, destructiveTools 41.
rg -o 'name: "[a-z_0-9]+"' tools/registry.ts \
  | sed 's/name: "//;s/"//' \
  | grep -E '(cancel|stop|erase|purge|unprotect|remove|destroy|drop|abort|cleanup|wipe|reset|revoke|expire|archive|trash|block)'
```

For each hit ask: **does this permanently destroy or irreversibly tear down remote state?**
If yes, it must be in `destructiveTools`, and — when teardown of live resources — `deleteTools`
too. Current known non-`delete_*` blocks: `erase_pipeline_job`, `purge_dependency_proxy_cache`,
`cancel_pipeline`, `cancel_pipeline_job`, `stop_environment`, `stop_stale_environments`,
`unprotect_branch`. The verb list is a heuristic: it produces false positives
(`project_blocked`-style fields) and can miss new verbs — read the tool description when unsure.

**Guard-surface parity:** the typed-tool guard is exact-name matching, but `execute_graphql`
uses name-pattern matching (`DELETE_FIELD_PATTERN` in `utils/graphql-query.ts`). When the PR
widens or documents the blocked set, check both directions:

```text
typed deny list (exact names)          execute_graphql (name pattern)
  delete_* + 7 named teardown verbs      /delete|destroy|remove|prune|purge/
        │                                        │
        └──────────── drift? ───────────────────┘
                pipelineCancel / environmentStop: typed-guard analogue blocked,
                GraphQL name never matches → still passes in modify (#755)
```

Any review where the PR claims "modify blocks destructive tools" must state the **scope**
(typed only vs GraphQL inclusive) and record the residual GraphQL teardown risk in docs
(`pipelineCancel`, `environmentStop`) with a follow-up reference — docs claiming broader
coverage than the guard delivers is a P1.

**Enumeration-drift vigilance:** a PR that widens the guard must update, in the same change:
`deleteTools` (and `destructiveTools` if the invariant applies), the generated enumeration in
`scripts/generate-tool-docs.ts` → `docs/tools/index.md`, `docs/configuration/environment-variables.md`,
README trio, `skills/gitlab-mcp/SKILL.md`, and the invariant tests in `test/test-permission-mode.ts`.
Cross-check the prose against the actual set — PR #754 needed a third commit (`76f8811`) only
because the enumeration omitted `erase_pipeline_job` and `purge_dependency_proxy_cache`.

Counts cited in docs must match measured sizes; prefer regenerating (`npm run docs:tools`)
over hand-editing generated pages. The current doc count is 36 `deleteTools` entries — never
trust a stale doc that says 21.

### 2c. Env vars that gate tools (cross-check together)

| Variable | Gates |
|----------|--------|
| `GITLAB_PERMISSION_MODE` | `readonly` → `readOnlyTools`; `modify` → `!deleteTools`; `full` → all (after other filters) |
| `GITLAB_READ_ONLY_MODE` | legacy; wins over permission mode — docs must keep deprecation notice |
| `GITLAB_TOOLSETS` / `GITLAB_TOOLS` | toolset + individual enablement |
| `USE_PIPELINE`, `USE_MILESTONE`, `USE_GITLAB_WIKI` | legacy; startup warns whenever the raw value is set. `true` points at `GITLAB_TOOLSETS=pipelines\|milestones\|wiki`. Any other value (`false` included) says to remove it and not to enable that toolset (#784) |
| `GITLAB_DENIED_TOOLS_REGEX` | regex deny on top of permission mode |

Filter order in `index.ts` `createServer()`: toolsets → individual → legacy flags →
**permission mode** → regex → hidden policy. A tool can pass toolsets but still be blocked
by `modify` — PR must not assume “registered = exposed”.

```text
allTools
   │
   v
GITLAB_TOOLSETS / GITLAB_TOOLS ──drop──> not in set
   │
   v
legacy USE_* flags ──drop──> wiki/pipeline off
   │
   v
GITLAB_PERMISSION_MODE ──drop──> readonly? readOnly only
   │                              modify? !deleteTools
   v
GITLAB_DENIED_TOOLS_REGEX ──drop──> regex match
   │
   v
 exposed to client
```

### 2d. Docs and skills (merge blocker if PR touches tools)

| Surface | What to verify |
|---------|----------------|
| `docs/configuration/environment-variables.md` | permission table, tool-filter vars, deprecation notes |
| `docs/tools/index.md` | `GITLAB_PERMISSION_MODE` behavior summary |
| `README.md` / `README.ko.md` / `README.zh-CN.md` | permission-mode callouts in Docker/quickstart |
| `skills/gitlab-mcp/SKILL.md` | tool counts, toolset table |
| `skills/gitlab-mcp/reference/*.md` | new tool listed if in that category |
| `CHANGELOG.md` | user-visible behavior change |

Run when PR changes registry or skills:

```bash
npm run check:skill-sync
npm run build && npm run test:mock -- test/test-permission-mode.ts
```

`check:skill-sync` compares `TOOLSET_DEFINITIONS` / `destructiveTools` to repo skill — CI
should fail if skill drifts.

### 2e. Tests

- `test/test-permission-mode.ts` — modify hides deletes, graphql delete guard; extend
  `DELETE_SAMPLE_TOOLS` when adding representative delete tools
- new tool file wired in `package.json` / `run-mock-tests.sh`
- blocked **and** allowed paths for permission mode / toolsets

### 2f. Breaking-change output (required in review verdict)

When behavior or tool surface changes, include in findings:

```text
**Breaking / behavior change**
- What changed (default, exposure, permission tier)
- Who is affected (readonly/modify/full users, Docker quickstarts, existing sessions)
- Docs updated: yes/no — list files
- Skill sync: check:skill-sync pass/fail
- Registry sets updated: deleteTools / readOnlyTools / destructiveTools / toolset — yes/no

ASCII (when exposure changes):
  before: modify ──X──> delete_foo
  after:  modify ──✓──> delete_foo   ← P1 if deleteTools not updated
```

Comment-worthy (P1) if:

- new `delete_*` not in `deleteTools`
- docs still cite old tool counts or wrong modify delete count
- permission-mode behavior changed without env-var doc + changelog
- fail-closed change without runtime error hint for remediation

**Do not merge** (unless user explicitly waives) when tool-add PR fails `check:skill-sync`
or leaves `deleteTools` out of sync with actual `delete_*` tools.

### 2g. README i18n sync

**Canonical:** `README.md` (English). `README.ko.md` and `README.zh-CN.md` must carry the
**same behavior claims**, examples, env vars, CLI flags, and deprecation notices — not word-for-word
translation, but no language-only drift.

```text
README.md (canonical)
    │
    ├── README.ko.md  ── should mirror env/flags/examples
    └── README.zh-CN.md
         │
    drift? ──> P1 (one language updated, others stale)
```

Metaphor: three-language README = same menu in three scripts — prices and allergens must match.

#### When to run

- PR changes any of `README.md`, `README.ko.md`, `README.zh-CN.md`
- PR changes user-facing behavior documented in README (permission mode, auth, Docker quickstarts,
  new env vars) even if only `docs/` changed — README trio should follow
- Release prep (`scripts/release.sh` bumps `@zereight/mcp-gitlab@` in all three — verify together)

#### Parity checklist (all three files)

| Signal | What to match |
|--------|----------------|
| Env vars | `GITLAB_PERMISSION_MODE`, `GITLAB_READ_ONLY_MODE`, `REMOTE_AUTHORIZATION`, `GITLAB_MCP_OAUTH`, `GITLAB_TOOLSETS`, new vars from PR |
| CLI flags | `--permission-mode`, `--read-only`, transport/auth flags in quickstart |
| Behavior callouts | permission table (`readonly` / `modify` / `full`), delete-tool count for modify, deprecation notes |
| Docker / compose snippets | same `-e` keys per transport section (SSE, Streamable HTTP, remote auth) |
| Version pins | `@zereight/mcp-gitlab@x.y.z` consistent across languages |
| New sections | section added in English → equivalent section in ko + zh-CN (headings localized OK) |

Quick signal scan:

```bash
for f in README.md README.ko.md README.zh-CN.md; do
  echo "=== $f ==="
  rg -n "GITLAB_PERMISSION_MODE|GITLAB_READ_ONLY_MODE|REMOTE_AUTHORIZATION|GITLAB_MCP_OAUTH|--permission-mode" "$f" | wc -l
  rg -n "@zereight/mcp-gitlab@[0-9]" "$f" || true
done
```

Diff-aware review:

```bash
# PR changed README.md but not translations?
gh pr view <N> --json files --jq '.files[].path' | rg '^README'
```

If `README.md` is in the PR file list and behavior/examples changed, **`README.ko.md` and
`README.zh-CN.md` should appear too** — or reviewer must flag intentional English-only deferral.

Section sanity (optional):

```bash
for f in README.md README.ko.md README.zh-CN.md; do
  echo "=== $f ($(rg -c '^## ' $f) sections) ==="
  rg '^## ' "$f"
done
```

Major section count skew (e.g. English gained `## Agent Skill Files` but ko/zh did not) → P1.

#### Relationship to `docs/`

- `docs/configuration/environment-variables.md` is the deep reference; README trio summarizes.
- If env-var PR updates `docs/` but README quickstarts still show old flags → flag both README
  i18n **and** §4 docs-vs-runtime.

#### Review output (when README touched)

```text
**README i18n sync**
| File | Updated | Parity |
| README.md | yes | canonical |
| README.ko.md | yes/no | match / drift: <what> |
| README.zh-CN.md | yes/no | match / drift: <what> |
```

Comment-worthy (P1): English documents new env/behavior; ko or zh-CN missing or contradicts.
**Do not merge** README-behavior PRs with one-language-only updates unless user explicitly defers
translations (note in changelog).

## 3. Transport/auth matrix

Flags to cross-check: `STREAMABLE_HTTP`, `SSE`, `REMOTE_AUTHORIZATION`, `GITLAB_MCP_OAUTH`,
`GITLAB_USE_OAUTH`, `GITLAB_PERSONAL_ACCESS_TOKEN`, `GITLAB_JOB_TOKEN`, `MCP_SERVER_URL`,
`MCP_TRUST_PROXY`, `ENABLE_DYNAMIC_API_URL`.

```text
                    stdio          SSE              Streamable HTTP
                    ─────          ───              ───────────────
REMOTE_AUTH              ✗          ✗ (incompat)     ✓ (required base)
GITLAB_MCP_OAUTH         ✗          ✗ (incompat)     ✓ (required base)
server PAT + no auth     local OK   varies           FAIL CLOSED (remote)
per-request Bearer       n/a        n/a              ✓ preferred
```

Known rules:

- `REMOTE_AUTHORIZATION=true` → requires `STREAMABLE_HTTP=true`; incompatible with `SSE=true`
- `GITLAB_MCP_OAUTH=true` → requires `STREAMABLE_HTTP=true`; incompatible with `SSE=true`
- Streamable HTTP + server PAT + no MCP auth → fail closed
- SSE quickstart must not use `REMOTE_AUTHORIZATION=true`
- Streamable HTTP remote examples need per-request auth or OAuth, not server-side static PAT

## 4. Docs vs runtime

- quickstarts, Docker, client configs, env reference, transport paths (`/sse`, `/mcp`)
- forbidden flag combos absent from examples
- fail-closed changes need docs **and** runtime error hints (`MCP_SERVER_URL`, allowed hosts/origins)

## 4b. Zod vs MCP JSON Schema

`toJSONSchema()` in `utils/schema.ts` — `.refine()` / cross-field rules invisible to clients.

```text
Zod schema                    MCP client sees
──────────                    ───────────────
z.object({ a, b }).refine()   required: []     ← refine invisible
z.object({ a: z.string() })   required: ["a"]  ← OK
```

- optional fields + refine-only "at least one" → empty `required` in tool schema
- prefer real required fields or preprocess aliases before validation
- test: alias only, new field only, both, neither

## 4c. Response parsing

`.parse()` strips unknown fields — confirm intentional contract shrink vs GitLab passthrough.

## 4d. Personal workflow leakage

Hard-coded aliases, local paths, magic no-arg fallbacks, default credential persistence,
client-specific UX changing server defaults for everyone.

## 5. Tests and CI wiring

- new test file in `package.json` script / `run-mock-tests.sh`
- blocked **and** allowed config combos tested
- OAuth deny paths, not only happy path
- mock tests: parallel `node --test` IPC flakes — server suites may need sequential runs

## 5b. Diff hygiene

Huge `index.ts` / `schemas.ts` formatting noise obscures security fixes — prefer focused hunks.

## 6. Generated / release docs

- `auto-changelog` conventions
- release notes: no raw CLI tables or exposed emails
- contributor bullets as `@username`, not `shortlog` dump

## Procedure checklist

1. GitHub changed-file list = source of truth for PR scope.
2. Three-dot diff only (see pr-review.md).
3. Grep added lines for private aliases / paths / silent persistence.
4. Tool-add/remove PR: run §2 registry + `check:skill-sync` + permission-mode tests.
4b. Destructive-tool / permission-mode PR: run §2 Destructive-capability audit (verb grep →
   effect judgment → guard-surface parity) and check enum drift across registry, generated docs,
   env docs, README trio, skill, tests.
5. README / user-facing docs PR: run §2g i18n parity across `README.md`, `README.ko.md`, `README.zh-CN.md`.
6. Schema PRs: spot-check `toJSONSchema()` `required` fields.
7. Mark each file `comment-worthy` or `no comment`.
8. Include **Breaking / behavior change** block when applicable (§2f).
9. Include **README i18n sync** table when any README changed (§2g).
10. Fix phase: verify complaint against **current head** before editing.

## Output

Every finding needs code, metaphor, or ASCII — not bullets alone.

**Findings** — each P0/P1 includes one of:

- diff/snippet showing the bug
- ASCII: `state ──action──> bad result`
- metaphor tied to file/flag/line

**No comment** — `path`: reviewed; no issue worth commenting.

**Residual risk** — unverified claim → what command/diff would confirm or deny it.
