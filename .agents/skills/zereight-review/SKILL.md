---
name: zereight-review
description: Comprehensive code review skill for practical PR feedback. Use for feature, bugfix, and refactor reviews. Prioritizes correctness, edge cases, logic invariants, fallback-chain safety, async state transitions, architecture analysis, flow ownership and screen-role maintainability, ponytail simplicity, motion craft (review-animations), OWASP security, and clear actionable feedback.
---

# zereight-review

Prioritize **correctness and risk** over style nitpicks.
Default tone: concise, direct, actionable.

## Mandatory Review Ensemble -- NON-NEGOTIABLE

When the user invokes `zereight-review`, `$zereight-review`, or asks to use the
Zereight review skill, do not complete the review from a single reviewer pass.
You must run a multi-skill, subagent-based review ensemble first, then synthesize
the results.

Required instruction sources to load before reviewing:

- Nearest repo `AGENTS.md`
- `/Users/tao.exe/.codex/instructions.md`
- `/Users/tao.exe/.codex/AGENTS.md`
- `codegraph-review-routing` when CodeGraph MCP is available or the review needs impact/call-chain context
- `code-review`
- `code-review-expert`
- `code-reviewer`
- `agent-skills:code-review-and-quality`
- `agent-skills:using-agent-skills`
- `thermo-nuclear-code-quality-review`
- `ponytail-review` (`/Users/tao.exe/.cursor/skills/ponytail-review/SKILL.md`)
- `review-animations` (`/Users/tao.exe/.claude/skills/review-animations/SKILL.md` + `STANDARDS.md`)
- `references/flow-ownership-review.md` (this skill — screen role, data owner, RN preload vs upstream prepare)

Required subagent review passes:

| Subagent pass | Builtin agent | Model (required) | Required basis | Review focus |
| --- | --- | --- | --- | --- |
| Baseline full-diff reviewer | `reviewer` | session (`inherit`) | `code-review` | finding-first output, severity, full diff coverage, `comment-worthy` / `no comment` |
| Regression and contract reviewer | `reviewer` | session (`inherit`) | `code-review-expert` | behavioral regressions, API/prop contracts, hidden state and edge-case risk |
| File coverage reviewer | `worker` | session (`inherit`) | `code-reviewer` | every changed file and hunk, missing tests, maintainability risks |
| Quality gate reviewer | `worker` | session (`inherit`) | `agent-skills:code-review-and-quality` | correctness, reliability, maintainability, security, test quality |
| Thermo-nuclear maintainability reviewer | `reviewer` | session (`inherit`) | `thermo-nuclear-code-quality-review` | code judo / structural simplification, 1k-line boundary, spaghetti branching, abstraction quality, layer boundaries |
| Flow ownership & screen-role reviewer | `reviewer` | session (`inherit`) | `references/flow-ownership-review.md` + repo data layering (`CLAUDE.md`) | data owner vs orchestration owner; upstream prepare vs target-owned fetch; `navigation.preload`; nav-param growth; requirement-change blast radius; loading UI on async gap |
| Ponytail simplicity reviewer | `reviewer` | session (`inherit`) | `ponytail-review` | yagni, duplicate orchestration, dual hook paths, shrink/delete — **correctness/security out of scope** |
| Motion craft reviewer | `reviewer` | session (`inherit`) | `review-animations` + `STANDARDS.md` | motion-only hunks; Ten Non-Negotiable Standards; Before/After/Why table + Block/Approve verdict; RN map transform/opacity=spring interruptibility=GPU; **not** general logic |
| Agent orchestration reviewer | `delegate` | session (`inherit`) | `agent-skills:using-agent-skills` | whether the work was split correctly and whether any review lens is missing (thermo-nuclear, flow ownership, ponytail, motion craft, React/RN) |
| React/RN specialist reviewer | `reviewer` | session (`inherit`) | `zereight-react-native-optimizer` + react-doctor JSON | effect/render/list/animation/native perf regressions; **Skia GPU readback loops** (`makeImageSnapshot` + `readPixels` in rAF/effect); reconcile react-doctor diagnostics with diff evidence |
| Zereight coordinator | (parent) | session (parent) | this skill | three-dot diff, RED-team mindset, verification discipline, final synthesis |

**Flow ownership pass rule:** Spawn when the PR changes any navigable screen,
navigator, route params, or multi-step handoff (`*Screen`, `*-screen.tsx`,
`*navigator*`, `navigation-type.ts`, guide→detail flows). Mark
`skipped (not a screen/flow PR)` when the diff is assets/locales/tests-only or
has no navigation/screen boundary change.

**Ponytail pass rule:** Spawn when the diff has substantial logic in
`*.ts` / `*.tsx` (same scope as react-doctor). Skip for assets/locales/tests-only.
Do not promote ponytail `delete`/`yagni` to 🟠+ without user-facing risk evidence.

**React/RN pass rule:** Spawn when the PR changes any `*.ts` / `*.tsx` outside
`**/*.test.*`, `**/__snapshots__/**`, `**/locales/**` only. If the PR is
assets/locales/tests-only, mark the pass `skipped (not React/RN logic PR)` in
`검증 결과` — do not spawn.

**Motion craft pass rule:** Spawn when the three-dot diff touches **motion
code** in `*.ts` / `*.tsx` / `*.css` (exclude `**/*.test.*`,
`**/__snapshots__/**`, `**/locales/**` only). Treat as in scope when **any**
changed hunk matches one or more:

- `react-native-reanimated`, `useAnimatedStyle`, `useAnimatedReaction`,
  `useSharedValue`, `withSpring`, `withTiming`, `withDecay`, `useDerivedValue`,
  `useAnimatedScrollHandler`, `scheduleOnUI`, `scheduleOnRN` in animation paths
- `@gorhom/bottom-sheet` animation config, `footerComponent`, attached footer /
  sheet open-close positioning
- Reanimated layout/entering/exiting, `@shopify/react-native-skia` canvas motion
  (craft only — GPU readback loops stay with React/RN pass)
- CSS/JS `transition`, `@keyframes`, `animation:`, Framer Motion / GSAP usage
- Scroll-driven UI motion (opacity/transform/gradient toggles tied to scroll),
  modal/drawer/toast open-close springs

Mark `skipped (not a motion PR)` when the diff is assets/locales/tests-only or
has no motion hunks after grep. **Do not** use motion pass for pure API/types/
business-logic refactors with zero animation surface.

**Motion vs React/RN split:** React/RN pass owns Reanimated correctness, list
perf, effect anti-patterns, and **Skia GPU readback**. Motion craft pass owns
**feel** (justified motion, frequency, easing/duration, interruptibility,
physicality, reduced-motion, cohesion) and outputs the skill's Block/Approve
verdict. Overlap on scroll→setState: RN pass = perf/thread; motion pass =
instant toggle vs fade, cohesion.

## Ensemble model policy — MANDATORY

Zereight review subagents **always use the current session (parent) model**.
Do **not** hard-pin `composer-2.5`. Do **not** skip passes with
`skipped (model unavailable — composer-2.5 not exposed)`.

Override only when the user explicitly names a different model in the **same**
turn (e.g. “composer로 리뷰”, “fast로”).

**Canonical model id (default = session):**
- Cursor `Task` / `cursor_worker`: `inherit` (parent session model)
- Pi `subagent`: same model id as the parent session, or omit `model` so the
  runtime inherits the parent (prefer explicit parent id when the tool requires
  `model`)
- Coordinator (parent synthesis): current session model (no switch)

| Model | Use for |
| --- | --- |
| session / `inherit` | **All** ensemble passes (`reviewer`, `worker`, `delegate`) and coordinator synthesis |

### Runtime mapping — session model is non-negotiable

Every spawn must follow the **parent session model**. Do not pin a different
Composer tier, Grok, Claude, or fast variant unless the user asked for it in
this turn.

| Runtime | Required `model` on spawn | Forbidden (unless user asked this turn) |
| --- | --- | --- |
| Cursor `Task` / `cursor_worker` | `inherit` | Pinning `composer-2.5`, `composer-2.5-fast`, or another slug instead of session |
| Pi `subagent` | parent session model id (or omit to inherit) | Pinning a different provider/tier than the parent |
| Coordinator (parent synthesis) | Same session as the invoking turn | Switching models mid-review without user request |

**PROCESS VIOLATION:** skipping ensemble passes because `composer-2.5` is not
on the runtime whitelist, or refusing to spawn when `inherit` / parent model
is available.

**If a pinned override the user requested is rejected** (whitelist / schema):
fall back to session `inherit` / parent model and note it in `검증 결과`
(e.g. `requested composer-2.5 → fell back to inherit`). Never skip the whole
ensemble solely for model-id mismatch.

**Spawn checklist (every pass):**

1. Default: Cursor Task `model: "inherit"`; Pi = parent session model.
2. Do **not** skip for missing `composer-2.5`.
3. Only pass a non-`inherit` slug when the user named that model this turn.
4. Log actual models in `검증 결과` (e.g. `reviewer ×4 (inherit / <parent>)`).

**No model cascade on quota errors:** Do **not** configure or use
`fallbackModels` to hop providers on failure. On **429**, rate-limit, or quota
failure for a subagent spawn, **skip that pass** — do not retry the same pass
on another model. Continue synthesis from completed passes and note which axes
were skipped.

User-level overrides may live in `~/.pi/agent/settings.json` under
`subagents.agentOverrides`. Still prefer session/`inherit` on every spawn so
review passes match the model the user is already talking to.

Execution rules:

- Spawn separate subagents for the required review passes whenever the runtime
  supports subagents. Give each subagent the exact PR/range, target branch,
  repository path, the relevant instruction sources, and the **session model**
  (`inherit` / parent) from the table above.
- Every subagent must follow the repo `AGENTS.md` and global Codex instructions
  in addition to its review skill.
- Do not return the final review until every required pass has either completed,
  is explicitly skipped with a logged reason (429, not RN scope, etc.), or the
  user approved single-pass fallback per **Ensemble gate — MANDATORY** below.
- **PROCESS VIOLATION:** delivering a final review without spawning the full
  ensemble when subagent spawning is available (Pi `subagent`, Cursor `Task`,
  `cursor_worker`) and the user did not explicitly approve single-pass fallback.
- All review subagents must use Pi builtin agents (`reviewer`, `worker`,
  `delegate`) with session/`inherit` model. On Pi, if omitting `model` would
  default the builtin `worker` to Claude while the parent is not Claude, pass
  the parent model id explicitly.
- **Do not** route review passes through a different provider than the parent
  session unless the user explicitly requests that provider this turn.
- If a subagent fails with provider/model/quota errors (including **429**),
  **do not** retry on another model and **do not** use `fallbackModels`. Mark
  that pass as skipped, record the error briefly, and continue synthesis from
  completed passes — do not block the final review.

**Parallel spawn example (pi-subagents / `subagent` tool — parent session model):**

```json
{
  "tasks": [
    {
      "agent": "reviewer",
      "task": "Baseline full-diff review. Skill: code-review. Use parent session model. PR: ..."
    },
    {
      "agent": "reviewer",
      "task": "Regression and contract review. Skill: code-review-expert. Use parent session model. PR: ..."
    },
    {
      "agent": "worker",
      "task": "File coverage review. Skill: code-reviewer. Use parent session model. PR: ..."
    },
    {
      "agent": "worker",
      "task": "Quality gate review. Skill: code-review-and-quality. Use parent session model. PR: ..."
    },
    {
      "agent": "reviewer",
      "task": "Thermo-nuclear maintainability review. Skill: thermo-nuclear-code-quality-review. Use parent session model. PR: ..."
    },
    {
      "agent": "reviewer",
      "task": "Flow ownership & screen-role review. Read references/flow-ownership-review.md in zereight-review skill. Use parent session model. PR: ..."
    },
    {
      "agent": "reviewer",
      "task": "Ponytail simplicity review. Skill: ponytail-review. Use parent session model. PR: ..."
    },
    {
      "agent": "reviewer",
      "task": "Motion craft review. Skill: review-animations + STANDARDS.md (/Users/tao.exe/.claude/skills/review-animations/). Motion hunks only. Output Part 1 Before/After/Why table + Part 2 Block/Approve. Use parent session model. PR: ..."
    },
    {
      "agent": "reviewer",
      "task": "React/RN specialist review. Skill: zereight-react-native-optimizer. Include react-doctor JSON. Use parent session model. PR: ..."
    }
  ],
  "concurrency": 9
}
```

Then spawn orchestration separately:

```json
{
  "agent": "delegate",
  "task": "Orchestration review: verify all ensemble axes were covered. Use parent session model. ..."
}
```

(If the Pi tool requires an explicit `model`, set it to the **same id as the
parent session**, not a hard-coded Composer slug.)

**Parallel spawn example (Cursor `Task` tool — session inherit):**

```json
{
  "subagent_type": "generalPurpose",
  "model": "inherit",
  "description": "Baseline full-diff review",
  "prompt": "Skill: code-review. Use the parent session model (inherit). PR: ..."
}
```

Repeat for each ensemble pass (baseline, regression, file coverage, quality,
thermo-nuclear, **flow ownership**, **ponytail**, **motion craft**, React/RN)
with `model: "inherit"` on every `Task` call. Spawn orchestration `delegate`
after worker/reviewer passes. Never skip the ensemble because `composer-2.5`
is missing from the whitelist.

**Final synthesis must list models used**, e.g.
`reviewer ×7 (inherit / <parent>), worker ×2 (inherit / <parent>), delegate (inherit / <parent>)`.
If any pass ran on a different model than the session without a same-turn user
request, add `PROCESS VIOLATION: <pass> used <actual-model> (expected inherit/session)`.

## Ensemble gate — MANDATORY

Zereight-review **always** runs the full ensemble before synthesis. Treat
single-pass review as an exception, not the default.

**Required execution order (after PR Identity Gate succeeds):**

1. **PR Axis Gate** (A/B/C) — record in `검증 결과` before findings
2. react-doctor preflight (React/RN PRs — see below)
3. rnsec preflight (`rnsec` CLI for React Native security scope)
4. SonarLint preflight (`sonarlint-ls-cli` local scan, diff-scoped — no auth)
5. fuck-u-code preflight (`fuck-u-code` CLI + bounded `analyze`)
6. **Motion scope gate** — grep diff for motion triggers (see **Motion craft pass
   rule**). Record in `검증 결과` as `motion scope: yes — <triggers>` or
   `motion scope: no`. No CLI; scope only decides whether to spawn motion pass.
7. Spawn all ensemble passes in parallel (or sequential if runtime limits concurrency)
8. Spawn orchestration `delegate` pass after worker/reviewer passes complete
9. Coordinator synthesis + `검증 결과` (re-check Axis Gate before promoting any 🟠+)

**Subagent spawning counts as available** when any of these exist in the runtime:
Pi `subagent` tool, Cursor `Task` tool, `cursor_worker`, or equivalent multi-agent spawn.

**Single-pass fallback — DISALLOWED by default.** Use only when **all** of:

1. Subagent spawning is unavailable in the current runtime (none of the above).
2. User explicitly approved fallback in the **same** or immediately prior message:
   `single pass`, `fallback`, `앙상블 스킵`, `서브에이전트 없이`.
3. You record in `검증 결과`: `ensemble skipped (user-approved single-pass fallback)`.

When single-pass fallback is active, still:

- Load all reviewer instruction sources sequentially (including
  `thermo-nuclear-code-quality-review`, `references/flow-ownership-review.md`,
  `ponytail-review`, `review-animations` + `STANDARDS.md` when motion scope,
  and `zereight-react-native-optimizer` when React/RN scope).
- Cover every ensemble axis in one pass (including flow ownership, ponytail, and
  motion craft when in scope).
- Run react-doctor, rnsec, SonarLint, and fuck-u-code prefights when applicable.

**If subagent spawning IS available:** spawn every required pass. Partial
completion is allowed only per **Ensemble model policy** (429/quota → skip that
pass, note in synthesis). Completing the review from one coordinator pass alone
= **PROCESS VIOLATION**.

## Subagent Failure Budget — MANDATORY

Subagent claims are not primary evidence. A claim becomes a finding only
after current-turn primary evidence (diff, file contents, tests, CI logs,
rtk-grepped source, or reproducible output) confirms it.

Rules:

1. A subagent failure or stuck verification is not a blocker — it is a
   signal to move on.
2. If a verification path (e.g., live API call, official docs fetch) fails
   once, retry at most once **only when** the result is necessary for a
   P0/P1 decision.
3. If the same verification path fails 2 times total, stop pursuing it
   immediately. Do not try a third approach.
4. If 2+ subagent/verification attempts fail for the same claim, treat
   the claim as **unusable** for review purposes. Either discard it or
   note it as unverified residual risk — never as a blocker.
5. Never spend more than one bounded verification pass on any P2/🟡 Minor
   or lower concern.
6. When verification fails without logs, state "unverified; not used as
   blocker" and continue producing the final review.
7. Do not block the final review waiting for a subagent or verification
   to complete. Synthesize from what is already available, mark any gaps,
   and deliver.
8. **Exception:** **PR Identity Gate** hard stop overrides rules 1–7. When
   both mcporter and local API fail to fetch Bitbucket PR metadata, stop the
   entire review — do not synthesize findings from local git or subagents.
9. **Ensemble agreement ≠ evidence.** N subagents repeating the same claim
   only proves a shared premise. If that premise is “base branch is correct”
   on an axis-B PR, discard or demote until API/PRD/GIF/spec confirms it.
   Coordinator must re-check the PR Axis Gate before promoting any 🟠+.

- Keep raw diff output out of the conversation context when possible. Prefer
  context-mode indexing/search for large diffs, and use three-dot diff against
  the target branch.

## Tool transport — mcporter for MCP, CLI scanners (MANDATORY)

Use the right transport; do not route every tool through MCP.

| Need | Invocation |
| --- | --- |
| Bitbucket/Jira/Confluence/internal MCP tools | Shell `mcporter call <server>.<tool> ...` |
| MCP server inventory/schema | Shell `mcporter list` / `mcporter list <server> --schema` |
| fuck-u-code static analysis | Shell `fuck-u-code analyze ...` from global `eff-u-code` npm package |
| React Native security scan | Shell `rnsec scan ...` |
| SonarLint static analysis | Shell `sonarlint-ls-cli` (`scan.sh analyze --files <PR-changed-files>`) — local SLOOP backend, no server/auth/token; **not** SonarQube CLI (`sonar`) or `sonar-scanner`. Scope: `.ts/.tsx/.js/.jsx/.py/.java` only — Kotlin/Swift/Objective-C have no bundled analyzer (verified: silent zero findings, not an error) |

For MCP-backed tools, do **not** trust Cursor/Codex native MCP panel lists as
source of truth; use `mcporter` from shell.

For **fuck-u-code**, do **not** use MCP at all. Never call `mcp_call_tool`,
`mcporter list fuck-u-code`, or `mcporter call fuck-u-code.*`. The expected
binary after `npm install -g eff-u-code` is `fuck-u-code`; verify with:

```bash
command -v fuck-u-code
fuck-u-code --version
```

`Unknown MCP server 'fuck-u-code'` only means no MCP server is configured; it is
not a blocker. Use the CLI instead.

State **`fuck-u-code preflight run (CLI)`** in the final review when the CLI
analysis runs. State **`fuck-u-code preflight skipped (CLI unavailable — <reason>)`**
only when the `fuck-u-code` binary is missing or the CLI command fails.

For **rnsec**, use the CLI only. Verify with:

```bash
command -v rnsec
rnsec --version
```

State **`rnsec preflight run (CLI)`** when the scan runs. State
**`rnsec preflight skipped (CLI unavailable — <reason>)`** only when the binary
is missing or the CLI command fails.

For **SonarLint**, use **`sonarlint-ls-cli`** (local SLOOP backend via
`sonarlint-language-server`, no SonarQube/SonarCloud server, no token, no
project key). Verify prerequisites:

```bash
command -v curl
command -v python3
command -v git
```

State **`sonarlint preflight run (local CLI)`** when the diff-scoped scan runs.
State **`sonarlint preflight skipped (CLI unavailable — <reason>)`** when
`curl`/`python3`/`git` is missing or the scan fails after retry.

**Out of default preflight (do not use):**

- SonarQube CLI (`sonar`) / `sonar auth login` / SonarCloud project key — not
  needed; this preflight never leaves the machine.
- Legacy `sonar-scanner` — requires separate install + `sonar-project.properties`.
- Sonar MCP — Cursor/IDE integration only, not shell preflight.

Review preflight safeguards:

- Before broad file reading, use context-mode to reduce the diff to changed
  files/symbols and high-risk hunks. If CodeGraph MCP is available, run a
  bounded impact pass for changed symbols that need surrounding context:
  callers, usages, call chains, affected screens/hooks/navigation/API
  boundaries, and hotspot/coupling candidates. Treat CodeGraph output only as
  candidate discovery; every finding still needs current-turn primary evidence
  from the diff, file contents, tests, logs, or context-mode search.
- Do not use CodeGraph for Bitbucket/Jira/Confluence/internal connector reads;
  those remain mcporter-first with schema inspection. Do not use CodeGraph for
  large diff/log processing; those remain context-mode. Do not use CodeGraph as
  durable memory; agentmemory remains curated and verified only.
- If CodeGraph output is `_truncated`, stale, unresolved, or conflicts with file
  evidence, do not cite it as review evidence. Narrow the query once or fall
  back to context-mode plus file evidence.
- RTK command rewrites can fail silently for simple read commands such as
  `rtk rewrite "sed ..."`. If that happens, do not stall the review. Use the
  repo-approved RTK form when the hook provides one, prefer `rtk grep` /
  `rtk git` for searched or git commands, and keep direct file reads narrowly
  bounded when reading required instruction or skill files.
- If the nearest repo `AGENTS.md` is missing, do not treat that as permission to
  ignore repo instructions. Use any AGENTS instructions supplied in the current
  conversation as the repo instruction source, state that fallback, and continue.
- **MANDATORY: Run react-doctor for React/RN PRs BEFORE ensemble synthesis.**
  Detect React/RN scope: any changed `*.ts` / `*.tsx` outside `**/*.test.*`,
  `**/__snapshots__/**`, `**/locales/**` only.
  - If **not** React/RN scope (assets/locales/tests-only): state
    `react-doctor skipped (not a React/RN logic PR)` in `검증 결과` and continue.
  - If React/RN scope, run from repo root (network required):
    ```bash
    npx react-doctor@latest --json --no-score -y \
      --diff refs/remotes/origin/<destination>
    ```
    Use PR metadata destination branch. When git refs are unavailable, use
    `--diff origin/develop` or the PR's known target branch. As a last resort,
    scan bounded parent path(s) of changed files (same parent-path rule as
    fuck-u-code — **never** full-workspace scan).
  - Parse JSON output; cross-check diagnostics against PR diff hunks and changed
    files only. Feed the JSON summary into the React/RN ensemble pass prompt.
  - Retry once on network/npx/timeout failure. After two failures, state
    `react-doctor preflight skipped (<reason>)` with exact command + error excerpt.
  - **PROCESS VIOLATION** on React/RN logic PRs if you skip react-doctor without
    a `검증 결과` row (same discipline as fuck-u-code silence).
  - Never promote react-doctor diagnostics to 🟠 Major or higher without
    file-content evidence from the current turn.
- **MANDATORY: Run rnsec for React Native security scope BEFORE ensemble
  synthesis.** Detect scope: any changed `*.ts` / `*.tsx` outside tests/locales,
  or RN/native/config files such as `package*.json`, `app.json`, `app.config.*`,
  `android/**`, `ios/**`, `*.plist`, `*.gradle`, `Podfile`, or
  `AndroidManifest.xml`.
  - If not RN security scope: state `rnsec skipped (not React Native security scope)`
    in `검증 결과` and continue.
  - If in scope, run in the review worktree/root:
    ```bash
    rnsec scan --path "<review-worktree>" --json \
      --changed-files refs/remotes/origin/<destination>
    ```
    Use PR metadata destination branch. If git refs are unavailable, run once
    without `--changed-files` in the review worktree and filter results to PR
    changed files before reporting.
  - Parse JSON output; report only issues touching changed files or clearly
    introduced by changed config. Feed the summary into the security/quality
    review pass prompts.
  - Retry once on timeout/CLI failure. After two failures, state
    `rnsec preflight skipped (CLI — <reason>)` with exact command + error excerpt.
  - Never promote rnsec diagnostics to 🟠 Major or higher without current-turn
    file-content/diff evidence and a concrete exploit or user-data impact.
- **MANDATORY: Run SonarLint local preflight (`sonarlint-ls-cli`) BEFORE
  ensemble synthesis.** Run in the review worktree only; do not scan the
  primary workspace. This replaces the old SonarQube CLI (`sonar`) preflight —
  fully local, no auth, no SonarCloud project key, diff-scoped only.
  - **Availability gate** (all must pass to run; otherwise skip with reason):
    ```bash
    command -v curl && command -v python3 && command -v git
    ```
    If any is missing: state
    `sonarlint preflight skipped (CLI unavailable — <missing tool> not in PATH)`
    and continue.
  - **Diff-scoped file list** — PR changed files only, supported extensions
    (`.ts .tsx .js .jsx .py .java`), excluding `**/*.test.*`, `**/__snapshots__/**`,
    `**/locales/**`:
    ```bash
    mapfile -t SONARLINT_FILES < <(git diff --name-only --diff-filter=ACMR \
      "refs/remotes/origin/<destination>...HEAD" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.py' '*.java' \
      | grep -vE '\.test\.|__snapshots__|/locales/')
    ```
    Use PR metadata destination branch. If git refs are unavailable, fall back
    to `git diff --name-only <base>...HEAD` with the PR's known target branch.
    If `SONARLINT_FILES` is empty, state
    `sonarlint skipped (no PR-changed .ts/.tsx/.js/.jsx/.py/.java files)` and continue.
  - **Kotlin / Swift / Objective-C are NOT in scope for this preflight —
    verified empirically, do not attempt to add them.** The bundled
    `sonarlint-vscode` analyzer set (`~/.sonarlint-ls/analyzers/*.jar`) has no
    Kotlin analyzer at all, and `sonarcfamily.jar` (Swift/Objective-C/C/C++) is
    shipped as `.jar.asc` — license-locked, inert without a paid Connected
    Mode. Feeding these files through the scanner does not error, it silently
    returns **zero findings**, which reads as false-clean and is worse than
    skipping. If the PR touches `.kt/.kts/.swift/.m/.mm/.h`, review those files
    manually in the ensemble passes and state
    `sonarlint scope note (.kt/.swift/.m/.mm — no local analyzer, reviewed manually)`
    in `검증 결과`; do not claim SonarLint coverage for them.
  - **One-time upstream bugfix (idempotent, local cache only):** upstream
    `sonarlint-ls-cli`'s `scan.py` hardcodes `languageId: "python"` for every
    file, which makes non-Python files fail as `ParsingError`. Patch the
    cached copy once per machine before the first scan:
    ```bash
    SCAN_PY="$HOME/.sonarlint-ls/sonarlint-ls-cli/scan.py"
    if [ -f "$SCAN_PY" ] && ! grep -q LANGUAGE_ID_BY_SUFFIX "$SCAN_PY"; then
      python3 - "$SCAN_PY" <<'PYEOF'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
src = p.read_text()
src = src.replace(
    "ERRORS = False\n",
    "ERRORS = False\n\n"
    "LANGUAGE_ID_BY_SUFFIX = {\n"
    '    ".py": "python", ".js": "javascript", ".jsx": "javascript",\n'
    '    ".mjs": "javascript", ".cjs": "javascript", ".ts": "typescript",\n'
    '    ".tsx": "typescriptreact", ".java": "java",\n'
    "}\n\n"
    "def get_language_id(file):\n"
    '    return LANGUAGE_ID_BY_SUFFIX.get(pathlib.Path(file).suffix, "python")\n',
    1,
)
src = src.replace('"languageId": "python",', '"languageId": get_language_id(file),')
p.write_text(src)
PYEOF
    fi
    ```
    If `~/.sonarlint-ls/sonarlint-ls-cli/scan.py` does not exist yet, the first
    `scan.sh` invocation below bootstraps it (clone + venv); re-run this patch
    check once after bootstrap, before trusting non-Python results. Java
    analysis works standalone (bundled `sonarjava.jar`, verified with real
    findings e.g. `java:S2259` nullability) and logs a harmless
    `sonarlint/getJavaConfig Method Not Found` warning — ignore it, it does not
    block diagnostics.
  - **Run the scan** (noisy style-only rules disabled by default — this repo's
    prettier/eslint conventions already own semicolons/trailing commas):
    ```bash
    SONARLINT_DISABLE_RULES="${SONARLINT_DISABLE_RULES:-typescript:S1438,typescript:S1537,javascript:S1438,javascript:S1537}"
    curl -s https://raw.githubusercontent.com/vincentfenet/sonarlint-ls-cli/refs/heads/master/scan.sh \
      | bash -s -- analyze --disable-rules "$SONARLINT_DISABLE_RULES" --files "${SONARLINT_FILES[@]}"
    ```
  - Parse stdout lines (`<file>:<line>:<col> - <message> (<rule>)`). Filter to
    lines that fall inside PR diff hunks — lines outside changed hunks are
    ⚪ Info (pre-existing), not PR regressions.
  - Treat SonarLint output as **candidate discovery only**. Promote to
    🟠 Major or higher only with current-turn file/diff evidence (e.g. real
    `any` usage introducing type-safety risk, genuine high complexity in a
    changed function — not just the rule firing).
  - Retry once on timeout/bootstrap failure (first run downloads a ~200MB
    `sonarlint-vscode` VSIX and clones the CLI repo). After two failures, state
    `sonarlint preflight skipped (CLI — <reason>)` with exact command + error
    excerpt.
- **MANDATORY: Check fuck-u-code CLI availability BEFORE any preflight or
  ensemble step.** Run **`command -v fuck-u-code`** (binary installed by
  `npm install -g eff-u-code`). Do NOT use MCP for this gate. Do NOT call
  `mcporter list fuck-u-code`, `mcporter call fuck-u-code.*`, or `mcp_call_tool`.
  - If the CLI exists AND the PR has substantial logic changes (not just
    locales/styles/tests/assets-only), run the bounded static analysis below
    via **`fuck-u-code analyze`**.
  - If the CLI is missing or fails: state
    "`fuck-u-code preflight skipped (CLI unavailable — <reason>)`" and
    continue. Do NOT block the review.
  - If the CLI exists but you skip analysis without a PR-scoped reason:
    **PROCESS VIOLATION**. The preflight line must be either
    **`fuck-u-code preflight run (CLI)`** or **`skipped (reason)`**. Silence is
    not permitted.
  1. From the three-dot diff or PR metadata, extract the list of changed files.
     Filter to `*.ts`, `*.tsx` only; exclude `**/*.test.*`, `**/__snapshots__/**`,
     `**/locales/**`, `dist/`, `node_modules/`.
  2. Determine the common parent path(s) of the changed files (typically 1-2).
     Never scan the entire workspace — only the bounded paths. If changed
     files span multiple disjoint paths, run the analysis for each path.
  3. Invoke `analyze` through the CLI:
     ```bash
     fuck-u-code analyze "<common-parent-path>" \
       --format json \
       --top 15 \
       --exclude "**/*.test.*" "**/__snapshots__/**" "**/locales/**" "dist/**" "node_modules/**"
     ```
  4. From the JSON output, extract `files[].path`, `files[].score`, and
     `files[].metrics[]`. Keep only files that appear in both the PR diff AND
     the worst-scoring list.
  5. Read the full content of those files (not just the diff) to understand
     whether the PR is introducing new complexity/duplication or inheriting
     existing legacy. Check: does the new code worsen the metrics?
  6. If the PR inherits existing legacy (file was already bad before this PR),
     note it as ⚪ Info — do not block. If the PR introduces new hotspots
     (complexity/duplication without justification), report as 🟡 Minor.
  7. Never promote fuck-u-code scores to primary findings without file-content
     evidence. Never cite fuck-u-code score alone as 🟠 Major or higher.
  8. On CLI failure (timeout, unavailable, schema mismatch), skip preflight with
     "`fuck-u-code preflight skipped (CLI — <reason>)`" and continue. Do not
     retry more than once.
  9. The `ai-review` subcommand is excluded from the default pipeline — it sends
     code to external APIs and duplicates the zereight ensemble.
- When spawning review subagents, do not combine `fork_context=true` with an
  explicit `agent_type` if the runtime rejects that combination. Retry by
  spawning role-specific agents without `fork_context` and put the exact PR
  range, repository path, target branch, and required instruction sources in
  each agent prompt.
- Never use ambiguous branch names such as `origin/develop` for review diffs if
  local refs can shadow remote refs. Resolve and use full refs:
  `refs/remotes/origin/<target>...refs/remotes/origin/<source>`. If an
  ambiguous ref caused an unexpectedly large diff, discard that result and
  restart scoping from the full-ref three-dot diff.

Synthesis rules:

- Merge findings from all subagents into one final review (including
  thermo-nuclear structural/maintainability findings).
- Map thermo-nuclear **presumptive blockers** (1k-line explosion, spaghetti
  special-case growth, missed code-judo simplification, boundary leaks) into
  zereight severity when primary evidence confirms: structural regression with
  user-facing risk → 🟠 Major; maintainability-only → 🟡 Minor or 🛠️ refactor;
  decomposition opportunity with no behavior risk → 🔵 Trivial. Do not promote
  thermo tone alone without file/line evidence.
- De-duplicate overlapping findings and keep the strongest, most concrete file
  and line reference.
- If reviewers disagree, state the disagreement briefly and choose the outcome
  supported by code evidence.
- Preserve whole-diff coverage by listing changed files as `comment-worthy` or
  `no comment`.
- Lead with actionable findings ordered by severity. Keep summaries secondary.

## RED Team Mindset -- MANDATORY

You are an adversary, not a rubber stamp. Your job is to break the code, not confirm it works.

- **Think like an attacker**: For every change, ask "How can this fail? How can this be exploited? What input breaks this?"
- **Never trust the happy path**: Code that works for expected inputs is the baseline, not the goal. Hunt for the unexpected.
- **Simulate hostile inputs**: Empty strings, negative numbers, null, undefined, MAX_SAFE_INTEGER, special characters, concurrent calls, network timeouts.
- **Challenge assumptions**: If the author assumes X is always true, find the scenario where X is false.
- **Question removed code**: Deleted code had a reason to exist. Verify the reason is truly gone, not just hidden.
- **Trace error propagation end-to-end**: Follow every throw/reject/return-undefined through all callers. One unhandled path = one crash in production.
- **Don't approve because it "looks fine"**: If you can't construct a specific failure scenario, dig deeper -- absence of evidence is not evidence of absence.

## Verification Discipline — MANDATORY

Theoretical analysis is NOT enough. Every claim about library behavior, framework semantics, or runtime performance must be **empirically verified** before assigning severity.

### Rule 1: Theoretical claims require evidence

Before labeling any finding as 🟠 Major or higher based on framework/library behavior, verify with **at least one** of:

- **Source grep**: `node_modules` source of the relevant library
- **Official docs**: documented behavior from the library's docs
- **Actual usage sites**: grep the codebase for how the construct is used in practice
- **Reproduction test**: runnable test case demonstrating the bug

If you can only say "theoretically this could..." without one of the above, demote to 🔵 Trivial or 🟡 Minor until verified.

### Rule 2: Detection triggers — STOP and verify

When drafting a finding, if you write any of these phrases, STOP and verify:

- "이론적으로는 ~~" / "theoretically ~~"
- "~~ 일 수도 있다" / "this could ~~"
- "`useMemo` / `useEffect` / `SharedValue` / context 동작" (React/reanimated semantics)
- "라이브러리 X는 ~~한다" (library behavior assertion)
- "이 setState는 re-render를 일으켜 jank를 유발한다" (performance claim without measurement)
- "`readPixels` / `makeImageSnapshot` in rAF or effect loop" (Skia GPU readback — **do not demote**; apply **Skia / GPU readback checks** below)

### Rule 3: Verification patterns by claim type

| Claim type | How to verify |
|---|---|
| React hook semantics (`useMemo` deps, `useEffect` closure) | Grep actual usage sites; check React docs reference |
| Reanimated SharedValue / worklet | Grep `node_modules/react-native-reanimated/src/`; check Reanimated docs |
| `@gorhom/bottom-sheet` animatedIndex vs onChange | Grep `node_modules/@gorhom/bottom-sheet/src/`; inspect when callbacks fire |
| List virtualization (FlashList, FlatList) | Check item count and render path |
| Performance (re-render frequency, memo effectiveness) | Count actual trigger events in real usage, not hypothetical worst case |
| Skia GPU readback in loop | Grep diff for `readPixels`, `makeImageSnapshot`, `requestAnimationFrame`, `useCanvasRef`, `<Canvas ref`. Trace: on-screen GPU Canvas vs CPU `Skia.Surface.Make`. Follow callers: auto-save, ghost view, `makeImageFromView`, screen entry / navigation transition |

### Rule 4: Signal-Trigger Investigation — upstream root cause

Defensive code is a **symptom**, not a solution. When you see these signals, investigate the upstream cause:

**Signals**:
- Defensive JSDoc mentioning "stable id", "fallback for ...", "workaround for ...", "client-defined"
- Type assertions: `as unknown as T`, enum values cast from raw `int` (`1 as TermCategory`)
- Mock/stories comments: "duplicate rows", "non-enum ints", "dev server returns ...", "garbage data"
- `// FIXME`, `// TODO`, `// HACK` comments
- Array-index-based key synthesis (`groupIndex + periodIndex + value`)
- Over-complex null-handling for "should never happen" cases
- Skia paint-readiness polling: JSDoc mentioning "poll", "rasterize", "paint completion", "readPixels", "snapshot before capture"; `MAX_*_ATTEMPTS` + `requestAnimationFrame` loop on a `CanvasRef`

**Action**:
1. Read the JSDoc / comment in full
2. Check referenced mock data / stories for actual server response shape
3. Trace whether the root cause is fixable upstream (server API, schema, type contract)
4. Report upstream issue as a separate finding — don't just say "defensive coding is fine"

### Rule 5: Mock/Stories = API shape evidence

Mock files and `.stories.tsx` often contain real server response samples or dev-server captures. **Include them in review scope**:

- Read `*.stories.tsx` `args` / mock constants
- Check for comments like "sample from api-grpc-{env}", "dev server snapshot"
- Duplicate/malformed mock data = signal of real server data quality issue
- Do NOT dismiss stories as "test fixtures, not production concern"

### Rule 6: Contract-change diffs are not automatic regressions

When the PR axis is **B** (mock→API, server becomes source of truth):

- Diff that replaces client heuristics (`correctCount === 0`, local grading) with
  server fields (`result.result`, `retryable`) is **design**, not proof of a bug.
- Before 🟠 on title/CTA/icon branching: confirm the API contract allows the
  bad combo (spec, protobuf comments, PR GIF, related API PR, author note).
- Unconfirmed combo → ⚪ Ask. Confirmed contract + UI contradicts it → 🟠.
- Always prefer axis-B real issues: error handlers on every API touchpoint,
  loading/double-press on async CTAs, auth, empty payload guards.

Detection triggers (STOP — apply PR Axis Gate):

- "develop에서는 X였는데 PR에서 Y로 바뀌어서 회귀"
- "예전에 `allWrong` / client score로 분기했는데 지금은 서버 플래그라 버그"
- Promoting a finding only because several ensemble passes agreed, without
  independent contract evidence

### Failure cases — lessons (calibration)

Document your own missed findings here to build calibration:

- **PR #1790 M-3 (SharedValue useMemo staleness)**: Theoretical claim that `useMemo([sharedValue], …)` wouldn't re-run on `.value.length` change. Verification showed `buildFilterableSheetSnapPoints` always returns 2-element array → no actual staleness. Demoted Major → Trivial.
- **PR #1790 M-6 (onChange re-render jank)**: Theoretical claim that setState in bottom-sheet onChange causes jank during drag. Library docs confirm `onChange` fires only at snap settle, not during drag → no jank. Demoted Major → Trivial.
- **PR #1790 period row key**: JSDoc "same length can appear in multiple groups" + stories mock comment "duplicate `0` rows, non-enum `term` ints" were ignored as "defensive coding". Actually evidence of server API data quality issue requiring backend attention. Missed the upstream root cause entirely.
- **PR #3469 H1 (fraud awareness result title)**: Treated mock-era `allWrong = correctCount === 0` as the correctness baseline and filed 🟠 when PR switched title/CTA to server `passed` / `retryable`. PR description was explicitly mock→API (axis B). Ensemble ×7 repeated the same wrong premise. i18n key `allWrong.title` was confused with runtime variable `allWrong`. Correct stance: withdraw “regression”; ask whether API allows `passed=false` with `correctCount>0`; keep real findings (missing `handleUnknownError`, bridge double-tap). **Fix:** PR Axis Gate + Rule 6 before any 🟠 on branching changes.
- **PAYT-2927 / MP-2549 (e-slip Skia GPU readback poll)**: Added `canvas.makeImageSnapshot()` + `readPixels()` inside an rAF loop to gate auto-save until the receipt background painted. Axis A bugfix looked correct; JSDoc and `MAX_PAINT_CHECK_ATTEMPTS` made it seem thoughtful. Missed in review because preflight tools do not flag Skia/Metal patterns and verification discipline demoted “theoretical” native crashes. Production Datadog later showed Metal `SIGABRT` on `ESlipScreen` entry (~260ms after load) during navigation transition + auto-save. Fix merged as CPU offscreen bake (`Skia.Surface.Make`, 1× snapshot, no GPU readback loop). **Fix:** mandatory **Skia / GPU readback checks**; do not treat GPU canvas readback loops as “maybe slow” — pattern + capture/auto-save/screen-entry path is enough for 🟠 without Datadog.

## Full-Diff Inline Comment Mindset -- MANDATORY

Review every PR as if you are going to leave inline comments on the full diff, even when the final output is a summarized review.

- Do not stop after finding the first major issue. Continue through every changed file and every changed hunk.
- For each changed file, make an explicit internal decision: `comment-worthy` or `no comment`, instead of silently skipping it.
- Assume each diff hunk may need its own comment. Even if you later collapse findings in the final write-up, the review process must still inspect the full diff at inline-comment granularity.
- Distinguish clearly between:
  - actual findings that deserve comments
  - changed areas reviewed and intentionally passed with no comment
- When synthesizing the final review, preserve whole-diff coverage. The output should reflect that the PR was reviewed file-by-file, not just around the most obvious issue.
- If the user asks for a PR review without extra direction, default to this mindset automatically.
- **This mindset is review granularity only.** It does **not** grant permission to post comments on Bitbucket, GitHub, or GitLab. See **Platform posting (SSOT)** below.

## Platform posting (SSOT)

**Default: review-only in the current session.** Deliver the synthesized review in chat (or the surface the user asked for). **Do not post** review comments, inline comments, approvals, or request-changes on Bitbucket, GitHub, GitLab, or any other host **unless the user explicitly asks you to post.**

### Explicit consent required to post on the host

Post on the PR host only when the user clearly requests it, for example:

- Korean: `댓글 달아`, `PR에 코멘트 올려`, `Bitbucket에 리뷰 달아`, `인라인 코멘트 남겨`, `RC 달아`, `승인해`, `request changes`
- English: `post the review`, `leave PR comments`, `submit review on GitHub/Bitbucket`

These **do not** grant posting consent by themselves:

- `리뷰해줘`, `zereight-review`, `$zereight-review`, `재리뷰`, `PR 리뷰`, `코드 리뷰` → analyze and report in chat only
- Fetching existing PR threads (`bb_ls_pr_comments`, `gh` comment APIs, etc.) → context only; still do not post without consent

### Internal labels vs host comments

| Term | Meaning |
| --- | --- |
| `comment-worthy` | This file has findings worth including in the **written review** |
| `no comment` | This file was reviewed; **no findings** for it — **not** “do not post on the PR” |
| Full-diff inline mindset | Hunk-by-hunk review **granularity** — **not** permission to post on the host |

### When posting is allowed

1. User gave explicit posting consent (above).
2. Load and follow **`zereight-review-comments`** (`~/.agents/skills/zereight-review-comments/SKILL.md`).
3. Use the host’s normal tools (`gh pr review`, Bitbucket MCP comment APIs, etc.).
4. Read existing threads first; do not duplicate prior reviewer comments.
5. If consent is ambiguous, **ask once** instead of posting.

## Workflow -- always follow this sequence

### Workspace isolation — MANDATORY

Never change the primary workspace branch for review setup.

- Do **not** run `git checkout`, `git switch`, `git reset`, `git merge`,
  `git rebase`, or `git clean` in the user's main working tree just to inspect
  a PR/branch.
- If the review target is not already the current workspace/diff, create a
  disposable git worktree and run local reads, diffs, tests, and subagents there.
- Use one worktree per concurrent review/PR. Do not reuse a dirty worktree for a
  different review.
- Prefer detached worktrees at the PR source commit/ref to avoid local branch
  conflicts:
  ```bash
  git fetch origin
  git worktree add --detach ../review-pr-<id> <source-commit-or-ref>
  ```
- Record the worktree path in `검증 결과`. If a worktree cannot be created, stop
  and ask before touching the primary workspace.

### PR Identity Gate — MANDATORY

When the user provides a **Bitbucket PR URL**, PR metadata is the source of truth.
**Do not** spawn review subagents, run react-doctor/fuck-u-code preflight, or
start file-level findings until metadata fetch succeeds.

**Metadata fetch order (try both before giving up):**

1. **Primary — mcporter Bitbucket MCP** (CLI only; see **Tool transport**):
   `mcporter call bitbucket.bb_get_pr workspaceSlug=<ws> repoSlug=<repo> prId=<PR_ID> includeFullDiff=true`
   Extract: PR id, source/destination branch, source/destination commit, PR state,
   and full diff when included.
2. **Secondary — local Bitbucket REST API** (only if step 1 fails):
   `node skills/bitbucket-api-env/scripts/bitbucket-api.mjs pr <PR_ID>` (from this repo root)
   (use `diff` / `diffstat` / `comments` as needed). Requires `BITBUCKET_WORKSPACE`,
   `BITBUCKET_REPO_SLUG`, and auth env (`BITBUCKET_ACCESS_TOKEN` or
   `BITBUCKET_USERNAME` + `BITBUCKET_API_TOKEN`). Report exact HTTP status and body
   excerpt on failure.

**Hard stop — metadata unavailable**

If **both** mcporter and local API fail to return usable PR metadata (branches,
commits, PR state):

- **Stop the review immediately.** No ensemble, no preflight, no “best effort”
  pass over local files.
- Reply with a short **blocker** only: which path failed, error excerpts, missing
  env vars if any.
- Do **not** fall back to `git diff …HEAD`, current branch, or inferred PR scope.
- Ask the user to fix mcporter/auth/env or supply explicit branch names + diff.

**After metadata succeeds:**

3. Do **not** make the primary workspace match the PR source branch. If local
   file evidence or tests require source-branch checkout, create/use the review
   worktree from **Workspace isolation** and compare that worktree's `HEAD` to
   the PR source commit.
4. Review only the PR diff from metadata (`bb_get_pr` / API `diff`), or git
   three-dot using metadata branches:
   `refs/remotes/origin/<destination>...refs/remotes/origin/<source>`
5. Never use the primary workspace `HEAD` unless PR metadata confirms it is the
   PR source and the user asked to review the current workspace.

### PR Axis Gate — MANDATORY (before findings)

After identity succeeds and **before** spawning ensemble or writing findings,
classify the PR axis from description / commits / diff intent. Record it in
`검증 결과` as `PR axis: A|B|C — <one-line reason>`.

| Axis | Meaning | How to review |
| --- | --- | --- |
| **A** | Bugfix — preserve prior behavior | Treat base-branch logic as the correctness baseline. Diff inversions are regression candidates. |
| **B** | Contract change — mock→API, client scoring→server flags, new source of truth | Base branch is **reference only**, not the answer key. Prefer API/PRD/GIF/spec over develop. Branching that swaps client heuristics for server fields is **Ask / Info** until the contract is confirmed — do **not** open as 🟠 “regression”. |
| **C** | Refactor-only — same behavior, moved code | Prove behavioral equivalence (style ownership map, etc.). |

**Axis B rules (mock→API / server-driven UX):**

1. Do not call develop’s client-side branching “the correct logic” when the PR
   deliberately moves judgment to API fields (`result`, `retryable`, `passed`).
2. Variable names ≠ i18n keys ≠ contract. Example: develop may have
   `const allWrong = …` while PR uses `passed` and still references
   `allWrong.title` as a **copy key** — that is not “allWrong logic remaining”.
3. Label every before/after snippet with branch + SHA:
   `[BEFORE develop @ <sha>]` / `[AFTER PR @ <sha>]`. Never say only “최신/수정본”.
4. Prefer real defects on axis B: missing `handleUnknownError`, double-submit /
   async CTA without loading guard, auth, empty payload, crash paths.
5. Theoretical paths that need an unconfirmed API shape (e.g. “what if
   `passed=false` with `correctCount>0`?”) → ⚪ Ask / product-or-spec check,
   not 🟠 Major, until spec/GIF/tests confirm the path exists.

### Step 1: Fetch and diff against origin/develop (THREE-DOT DIFF)

**CRITICAL: Always use three-dot diff (`...`) not two-dot diff (`..`).**
Two-dot diff includes changes from the target branch that were merged after the PR branch was created, producing false positives. Three-dot diff shows only changes introduced on the PR branch (merge-base diff) -- this matches what Bitbucket/GitHub PR pages display.

### For Bitbucket repos with mcporter configured (preferred)
When git commands are blocked (e.g., read-only review mode), fetch via mcporter
after **PR Identity Gate** succeeds:

- PR metadata + diff: `mcporter call bitbucket.bb_get_pr workspaceSlug=<ws> repoSlug=<repo> prId=<PR_ID> includeFullDiff=true`
- Comments: `mcporter call bitbucket.bb_ls_pr_comments workspaceSlug=<ws> repoSlug=<repo> prId=<PR_ID>`
- Source files: `mcporter call bitbucket.bb_get_file workspaceSlug=<ws> repoSlug=<repo> filePath=<path>`
- If the user gave a PR URL and metadata gate failed, **do not** fall back to git here — stop per **Hard stop**.

### For direct git access (fallback)

Use only when the user did **not** supply a Bitbucket PR URL, or explicitly
requests git-only review without Bitbucket metadata.

Run these in the review worktree only, not the primary workspace:

```bash
git fetch origin
git diff refs/remotes/origin/<target>...HEAD --stat
git diff refs/remotes/origin/<target>...HEAD
```

Reference script: `references/three-dot-diff.sh` (supports custom target branch and output modes).

- Use `--stat` first to get the full list of changed files.
- Then read the full diff to understand every change.
- If the branch is behind the target branch, note it but still proceed with the diff.
- If the diff looks unexpectedly large, verify you are using `...` (three dots) not `..` (two dots).

### Step 2: Understand codebase context

Before evaluating any finding, understand the domain and conventions:

- Read `CLAUDE.md` or `LLM.md` at the repo root if present — these define project-wide conventions.
- Identify the feature domain (auth, transfer, account, etc.) and apply domain-appropriate risk weighting:
  - Payment/auth flows → higher severity bar
  - UI-only changes → lower severity bar
- Check what design system components, hook wrappers, and DI patterns are in use.
- Note any existing patterns in nearby unchanged files to distinguish "new smell" from "existing convention".

### Step 3: Review each changed file in detail

For every file in the diff:

1. Read the full file, not just the changed lines — understand the full component/module shape.
2. Identify the file's role (screen, hook, service, util, type, test).
3. Apply all mandatory logic checks to that file's specific logic.
4. Note findings scoped to that file before moving to the next.

Group findings by file in the output. Do not mix findings from different files in one paragraph.

### Step 4: Synthesize and output

After reviewing all files, write the final review following the output template.

---

## When to use

Use this skill when:

- Reviewing PRs, diffs, commits, or changed files
- Verifying bugfix safety and regression risk
- Checking logic with optional inputs, fallbacks, and async flows

## Review goals

1. Find defects that can affect users or data.
2. Detect edge cases hidden behind “usually works” paths.
3. Provide minimal, practical fixes with clear reproduction conditions.
4. Keep feedback short and high-signal.

## Priority order

1. Functional correctness
2. Security (OWASP Mobile/Web) & data integrity
3. State consistency & async timing
4. API contract/type safety
5. Performance hotspots
6. Module composition & data flow architecture
7. Clean code (naming, structure, component design)
8. Maintainability/readability

## Mandatory logic checks (always run)

1. **Invariant checks**
   - Identify paired/related values that must stay consistent.
   - Examples: `(count, maxCount)`, `(value, unit)`, `(start, end)`, `(id, status)`.

2. **Partial-input checks**
   - Test cases where only some optional fields/props are provided.
   - Verify behavior for missing counterpart values.

3. **Fallback-chain checks**
   - Trace `??`, `||`, ternary chains.
   - Confirm precedence and source-of-truth are not contradictory.

4. **State vs UI checks**
   - Ensure render conditions match computed data conditions.
   - Detect hidden invalid states (data exists but UI hides it, or vice versa).

5. **Boundary checks**
   - Validate `0`, negative, `undefined`, empty string, large values, max/min boundaries.
   - Require clamps/guards where needed.

6. **Async/race checks**
   - Check stale closure/state usage.
   - Verify open/close/reset/submit/error ordering.
   - Ensure loading flags recover in all paths.

7. **UI consistency checks**
   - Scan repeated UI patterns (section labels, headers, list items, cards) for style mismatches.
   - Verify fontSpec, themedColor, spacing, padding are identical across elements that serve the same visual role.
   - Flag when one sibling element uses a different token than the rest (e.g., FONT.B16 vs FONT.B18 for section labels in the same screen).
   - Check icon sizes, border radii, and gap values for consistency within a component group.

8. **State transition UX checks**
   - When React `key` changes cause remount, verify user input is either preserved, impossible before the transition, or explicitly discarded with clear UX (loading skeleton, disabled fields).
   - Detect "input loss on async load" pattern: form renders with placeholder defaults → async data arrives → key change remounts form → any user input typed before load is silently lost.
   - Verify loading→loaded transitions: are interactive fields disabled or hidden during loading? Does the transition cause layout shift or flash of empty content?
   - Check that `disabled` state covers all interactive elements (inputs, dropdowns, buttons) during loading, not just the submit CTA.

9. **Expensive-before-cheap checks**
   - Before any API call or I/O operation, check if there's a condition that could skip it.
   - Trace function calls into their internals — if a cheap check (e.g., `isSupported`, `isEnabled`, feature flag) lives inside a called function, verify it runs before any expensive operation in the caller.
   - Pattern to detect: API call on line N, condition check inside function called on line N+1.
   - Fix: Hoist the cheap check before the expensive operation.
   - Example: `GetChallenge()` called before `generateAttestation()` which checks `isSupported` internally → wasteful API call on unsupported devices.

10. **Refactor-only layout responsibility checks**
    - When a PR claims "only code location changes" or extracts a base component, build a before/after **style ownership map** before concluding equivalence. Map every style property to its owner in both versions.
      - interactive wrapper: Pressable / AnimatedPressable / Touchable
      - content layout row
      - child text/icon/image layout
      - feedback/ripple/overlay boundary
      - reusable base component boundary
    - Check these specific risks:

      **Style owner changed**
      - `flexDirection`, `gap`, `alignItems`, `padding`, `flex`, `alignSelf`, `justifyContent`
      - Moving a style from pressable container to inner view can silently change hit area, feedback area, measurement (flex-basis), or parent layout behavior.
      - Example: `paddingHorizontal` on `containerStyle` of `BankXAnimatedPressable` vs inner `BankXView` — padding moves out of the pressable feedback boundary.

      **Conditional style names hide behavior**
      - Names like `whenLogoStyle` must describe the actual effect, not the triggering condition.
      - If the style value is `alignItems: 'center'`, review it as row alignment, not "logo styling".
      - Flag names that make a layout invariant look like a visual detail.

      **Extracted base component leaks parent assumptions**
      - `flex: 1`, `alignSelf: 'stretch'`, absolute sizing, or margins inside a reusable base component are red flags.
      - Base components should expose layout props (via `style`) or keep parent-owned layout in the wrapper.
      - If `flex: 1` is added only for width fill, verify it won't cause height expansion when reused inside a column parent with bounded height.

      **Intent, not just same values**
      - If `MY_BANK` and logo-based accounts intentionally align differently, the reason should be obvious from naming or comments.
      - If not, ask for clarification or suggest explicit named styles.
    - Review output guidance:
      - If behavior likely still works but intent/reuse risk is unclear, report as 🔵 Trivial or 🟡 Minor.
      - Do not say "layout equivalent" until style ownership and reusable-boundary effects are verified.

11. **Skia / GPU readback checks** (run when PR touches `@shopify/react-native-skia`, `Canvas`, `useCanvasRef`, `makeImageFromView`, or image-capture hooks)

    **Scope trigger — grep the diff for any of:**
    `makeImageSnapshot`, `readPixels`, `makeImageFromView`, `useCanvasRef`, `CanvasRef`, `@shopify/react-native-skia`

    **Dangerous pattern (flag every occurrence):**
    `makeImageSnapshot()` and/or `readPixels()` inside a **repeat** path:
    `requestAnimationFrame`, `setInterval`, `useBankXEffect`, `useEffect`, or any poll loop (`attempts`, `MAX_*_ATTEMPTS`).

    **Backend matters:**

    | Surface | Backend | Readback loop risk |
    | --- | --- | --- |
    | On-screen `<Canvas ref={canvasRef}>` | GPU (Metal on iOS) | **High** — GPU→CPU readback each iteration |
    | CPU offscreen `Skia.Surface.Make(w, h)` | CPU raster | **Lower** for crash; note sync bake in `useMemo`/render as 🟡 perf |
    | `Skia.Surface.MakeOffscreen(w, h)` | GPU offscreen | **Medium** — 1× snapshot may be OK; loop still 🟠 |

    **Severity (do not require Datadog/repro to file):**

    | Condition | Severity |
    | --- | --- |
    | GPU canvas readback **loop** on screen entry, ghost view, auto-save, or `onImageReady` / capture-ready gating | 🟠 **Major** — known iOS Metal `SIGABRT` class (MP-2549) |
    | Same loop but clearly off hot path (dev-only, single manual tap) | 🟡 Minor |
    | **One-off** `readPixels` / snapshot (no loop), not during navigation transition | 🟡 Minor or ⚪ Info |
    | PR **removes** GPU readback loop in favor of CPU 1× bake | ✅ Good — note render-phase sync bake / missing tests as 🟡 follow-up, not blocker |

    **Trace callers when flagged:**
    1. Who calls `onImageReady` / capture? (auto-save, share, gallery)
    2. Does it run on **first mount** of a screen with **navigation transition** still running?
    3. Is there a ghost/offscreen duplicate instance (double bake / double poll)?

    **Safer alternatives to recommend (minimal fix):**
    - CPU offscreen bake once: `Skia.Surface.Make` → draw → `makeImageSnapshot` → display with `<Image image={…} />`
    - Signal readiness from **bake completion**, not pixel polling on a live GPU canvas
    - If still using `makeImageFromView`: defer until after transition (`InteractionManager.runAfterInteractions`, 2–3 rAF) — does **not** justify adding GPU readback loops

    **Axis A note:** A PR that adds readback polling to fix “capture before paint” is still a **new crash/perf risk** — validate the functional fix **and** flag the Skia pattern. Do not approve solely because empty-capture bug is solved.

    **Ensemble:** React/RN specialist pass must explicitly report `Skia readback: none | loop on GPU canvas | CPU bake` in its output.

## Architecture review checks (run when PR adds hooks, services, or screens)

When a PR introduces new modules, hooks, services, or screens (or significantly restructures existing ones), evaluate architecture quality. Skip for trivial single-file changes.

1. **Composition & responsibility**
   - Each hook/module should have a single, clear responsibility.
   - Detect God-hooks or God-screens that mix data fetching, business logic, UI state, and navigation.
   - Verify separation: data hooks vs UI hooks vs orchestration hooks.
   - Check if a hook does too many things that should be split.

2. **Data flow clarity**
   - Trace how data moves: props → hook → state → render. Identify implicit coupling.
   - Evaluate ref vs state choices: refs for values that don't trigger re-render, state for values the UI depends on.
   - Flag unnecessary indirection (getter callbacks wrapping refs, redundant wrappers).
   - Check prop drilling depth — suggest context or composition when drilling exceeds 3 levels.

3. **Error handling strategy**
   - Is error handling centralized (single error handler) or distributed (per-callsite try-catch)?
   - Verify failure code → UX mapping consistency: same error code should produce same user experience.
   - Detect missing error paths: what happens when an API call fails but no handler catches that specific failure code?
   - Check error handler completeness: does the switch/if-chain cover all known failure codes?

4. **Interface design**
   - Function/hook parameters: prefer named params (object destructuring) over positional args when >2 params.
   - Naming: domain-specific names over generic (`useCardlessWithdrawalSubmit` > `useSubmit`).
   - Return types: explicit and narrow, not `any` or overly broad unions.
   - API surface: does the module expose only what consumers need?

5. **Navigation patterns**
   - Push vs replace: replace for correction flows (edit → confirm), push for new destinations.
   - Screen lifecycle: does the screen clean up state on unmount? Does going back produce stale state?
   - Deep link readiness: can the screen be entered directly with params, or does it depend on prior screen state?
   - For multi-screen flows, run the dedicated **Flow ownership & screen-role** ensemble pass
     (`references/flow-ownership-review.md`) — do not rely on this checklist alone.

6. **Cross-cutting consistency**
   - i18n: detect hardcoded user-facing strings (English or any language) that should use translation keys.
   - DI patterns: services accessed via `dependencyContainer.get()` with proper TYPES, not direct imports of implementations.
   - Design system: raw RN primitives (`View`, `Text`) instead of design system components.
   - Consistent patterns: does the new code follow the same patterns as neighboring modules?

Architecture findings default to 🔵 Trivial or 🟡 Minor severity.
Exception: data flow bugs or missing error handling gaps that cause user-facing issues → 🟠 Major.

## Flow ownership & screen-role review (mandatory ensemble pass)

Spawn the **Flow ownership & screen-role reviewer** when scope triggers in
`references/flow-ownership-review.md`. The coordinator must surface this pass in
final synthesis under **`구조·역할 관점`** (see output order).

**Coordinator merge rules:**

- Flow ownership **pattern** findings (upstream prepare, nav-param growth,
  dual `initialX` paths) → default **🛠️ refactor** or **🟡 Minor** unless file
  evidence shows user-facing breakage (empty screen, stale navigation).
- **Ponytail pass** owns duplication line-count (`yagni`, `shrink`) — merge
  overlapping items; keep the stronger file:line from ponytail for deletions.
- **Thermo-nuclear pass** owns layer leaks and God-modules — do not duplicate.
- When recommending `navigation.preload`, state that it requires **target loading
  UI** — preload alone does not fix blank first frame.

**Single-pass fallback:** Coordinator reads `references/flow-ownership-review.md`
and applies the checklist when screen/flow scope triggers.

## Motion craft review (mandatory ensemble pass when in scope)

Spawn the **Motion craft reviewer** when **Motion craft pass rule** triggers.
The subagent must load `/Users/tao.exe/.claude/skills/review-animations/SKILL.md`
and `STANDARDS.md` in full and follow that skill's **Required Output Format**
(Part 1 Before/After/Why table, Part 2 tiered verdict, explicit Block/Approve).

**RN / Reanimated mapping (motion pass must apply):**

| review-animations concept | RN equivalent |
| --- | --- |
| GPU-only (`transform`/`opacity`) | `useAnimatedStyle` translate/opacity; avoid animating `padding`/`height`/`margin` via JS on hot paths |
| Interruptibility | springs / shared-value-driven styles; not keyframe restart loops |
| Sub-300ms UI | micro-interactions; modals/drawers/springs may use STANDARDS drawer 200–500ms |
| `prefers-reduced-motion` | `useReducedMotion()` from Reanimated — repo pattern: `bankx-toast-item.tsx` |
| Frequency table | bottom sheets/modals = occasional; keyboard/back = no extra motion |

**Coordinator merge rules:**

- Motion **Block** for feel-breaking regression (`ease-in` on UI, `scale(0)` entrance,
  animation on keyboard/high-frequency action, non-GPU layout animation with easy
  GPU fix) → map to 🟠 Major unless axis-B contract change demotes.
- Motion **Block** alone on polish (cohesion, stagger, reduced-motion missing) →
  default 🟡 Minor / 🛠️ refactor, not whole-PR block.
- Motion **Approve** with table findings → merge into `모션·애니메이션 관점`; dedupe
  with React/RN pass (keep RN for Skia readback + thread perf, motion for feel).
- Do not duplicate React/RN Skia readback findings — cross-reference only.

**Single-pass fallback:** Coordinator loads `review-animations` + `STANDARDS.md`
and applies the Ten Standards to motion hunks when scope triggers.

## Security checks — OWASP-based (always run)

Apply to every PR. Weight higher for payment, authentication, data storage, and API integration changes.

Based on OWASP Mobile Top 10 and OWASP Web Top 10:

0. **rnsec scanner correlation**
   - For RN security scope, compare rnsec findings against changed files/config.
   - Treat rnsec as candidate discovery only; confirm with diff/file evidence before severity.

1. **Insecure Data Storage (OWASP M2)**
   - Detect sensitive data (account numbers, tokens, PII, credentials) stored in plain-text local storage.
   - MMKV, AsyncStorage, UserDefaults, SharedPreferences without encryption → flag.
   - Sensitive data should use Keychain (iOS) / Keystore (Android) / SecureEnclave.
   - Check: is the stored data truly non-sensitive (locale, theme) or PII (account number, national ID)?

2. **Insecure Authentication & Session (OWASP M4)**
   - Token/session handling: verify expiration checks, refresh logic, secure storage.
   - Hardcoded credentials, API keys, or secrets in source code.
   - Re-authentication requirements for sensitive operations (e.g., changing withdrawal limits).

3. **Insufficient Input Validation (OWASP A03/M7)**
   - User input sanitization before API calls or local processing.
   - Amount/quantity boundary validation: negative values, overflow, zero, extreme values.
   - Format validation: regex-based inputs without ReDoS protection.

4. **Sensitive Data Exposure (OWASP A02)**
   - Logging sensitive data (account numbers, tokens, passwords) via `console.log` or error reporting.
   - Error messages exposing internal details (stack traces, server paths, SQL queries) to users.
   - Sensitive data in navigation params that may appear in navigation state dumps.

5. **Double Submission / Idempotency (Payment Flows)**
   - Payment, transfer, and withdrawal flows MUST have double-submission protection.
   - Check for: loading state during API call, CTA disable during submission, idempotency keys.
   - Missing protection in financial flows → 🔴 Critical.

6. **Broken Access Control (OWASP A01)**
   - Client-side-only authorization checks without server verification.
   - UI hiding features based on role but still allowing API calls.
   - Navigation guards that can be bypassed by deep links.

Security severity guide:
- 🔴 Critical: tokens/credentials in plain storage, hardcoded secrets, double submission in payment flows
- 🟠 Major: PII in plain local storage, missing input validation on financial amounts, sensitive data in logs
- 🟡 Minor: debug logging with non-critical data, client-side validation gaps backed by server validation

## Thermo-nuclear maintainability checks (always run via ensemble pass)

Load and apply `thermo-nuclear-code-quality-review` in the dedicated subagent
pass (or single-pass fallback). This is **stricter than** default clean-code
nits: hunt for code-judo simplifications, unjustified 1k+ line files, spaghetti
branching, leaky abstractions, and cast-heavy boundaries.

Coordinator must surface thermo findings in the final review when confirmed by
diff/file evidence. Skip duplicating thermo phrasing if the same structural
issue was already reported — keep the strongest reference.

## Clean code checks (run after security checks)

After security checks, scan for clean code issues. See `references/clean-code.md` for full detail.

Key areas:
- **Naming**: intention-revealing, consistent vocabulary, no misleading names
- **Functions**: single responsibility, no flag arguments, no side effects in getters
- **React/TS**: prop explosion, render-in-render, `any` usage, hook naming, effect scope
- **React Effect anti-patterns**: derived state via Effect, event logic in Effect, Effect chains, fetch without cleanup — see `references/react-effect-guidelines.md`
- **React Native**: StyleSheet outside component, inline styles in hot paths, raw primitives instead of design system components
- **React Doctor**: **mandatory** preflight for React/RN logic PRs — see preflight safeguards; findings feed the React/RN ensemble pass
- **React Native performance**: **mandatory** React/RN ensemble pass via `zereight-react-native-optimizer` (not optional alongside review)

Report clean code findings as 🔵 Trivial or 🟡 Minor only. Never block a merge for clean code alone.

## Case matrix requirement

For non-trivial logic, build a compact input matrix and verify outcomes.

Minimum matrix dimensions:

- optional A present/absent
- optional B present/absent
- fallback source (prop/state/default)
- boundary values (0/undefined)

If matrix reveals broken invariant, report as at least **Medium**.

## Review types

Label every finding with a type:

- ⚠️ **Potential issue** — bug, logic flaw, security vulnerability, invariant break
- 🛠️ **Refactor suggestion** — maintainability, performance, cleaner abstraction
- 🧹 **Nitpick** — minor style/naming (only in "thorough" mode, not default)

## Severity levels

Each finding gets a severity icon:

- 🔴 **Critical** — system failure, security breach, data loss, payment error
- 🟠 **Major** — significant functional breakage, wrong business decision, crash in normal flow
- 🟡 **Minor** — incorrect UI from valid input, silent error, invariant break in realistic edge case
- 🔵 **Trivial** — low-impact code quality (non-critical duplication, readability)
- ⚪ **Info** — context or observation, no action required

## Findings format (strict)

For each issue, include:

1. **Type + Severity + Title** e.g. `⚠️ 🟡 Partial override breaks pair invariant`
2. **Condition** (exact input/state combination that triggers this)
3. **Impact** (user/business/technical consequence)
4. **Evidence** `file:line` — short snippet
5. **Minimal fix** (smallest safe change, preferably a code snippet)

## Output Language and Style

Default final review output must be Korean unless the user explicitly asks for another language.

Write findings in plain Korean, not terse English review jargon. Keep technical terms only when needed, and explain them briefly.

Use this output order:
1. `전체 요약`
2. `좋은 점`
3. `리뷰 코멘트`
4. `구조·역할 관점` — **required** when flow ownership pass ran or screen/flow
   scope triggered (even if no findings: state data owner + blast radius in 3–5
   lines). Include: data owner, upstream prepare vs target-owned fetch, RN
   `preload` applicability, requirement-change blast radius.
5. `모션·애니메이션 관점` — **required** when motion craft pass ran (even if
   motion Approve: 3–5 lines + motion verdict `Block`/`Approve`). Summarize top
   Before→After fixes from the motion table; note feel-check gaps (slow motion /
   real device) when code-only review.
6. `파일별 리뷰 결과`
7. `검증 결과`

In `검증 결과`, include **all** of the following rows (silence = **PROCESS VIOLATION**):

- **PR axis** row — `PR axis: A|B|C — <one-line reason>` (from **PR Axis Gate**). Silence = PROCESS VIOLATION.
- **ensemble** row — list every pass by name with status:

| Pass | Status examples |
| --- | --- |
| Baseline full-diff reviewer | `completed` / `skipped (429)` |
| Regression and contract reviewer | `completed` / `skipped (429)` |
| File coverage reviewer | `completed` / `skipped (429)` |
| Quality gate reviewer | `completed` / `skipped (429)` |
| Thermo-nuclear maintainability reviewer | `completed` / `skipped (429)` |
| Flow ownership & screen-role reviewer | `completed` / `skipped (not a screen/flow PR)` / `skipped (429)` |
| Ponytail simplicity reviewer | `completed` / `skipped (not logic PR)` / `skipped (429)` |
| Motion craft reviewer | `completed` / `skipped (not a motion PR)` / `skipped (429)` |
| React/RN specialist reviewer | `completed` / `skipped (not React/RN logic PR)` / `skipped (429)` |
| Agent orchestration reviewer | `completed` / `skipped (429)` |
| Whole ensemble | `ensemble completed (N/M passes)` / `ensemble skipped (user-approved single-pass fallback)` / `ensemble blocked (runtime unavailable)` |

- **motion scope** row — `motion scope: yes — <triggers>` / `motion scope: no` (from step 6 Motion scope gate). Silence on motion PRs with animated hunks = **PROCESS VIOLATION**.
- **review-animations** row:

| Result | Wording |
| --- | --- |
| Ran | `review-animations pass completed` + motion verdict `Block` or `Approve` |
| Skipped — no scope | `review-animations skipped (not a motion PR)` |
| Skipped — failure | `review-animations pass skipped (429 — <reason>)` or covered in single-pass fallback |

- **thermo-nuclear** row: `thermo-nuclear pass completed` / `thermo-nuclear pass skipped (subagent blocked)` / `thermo-nuclear covered in single-pass fallback`
- **react-doctor** row:

| Result | Wording |
| --- | --- |
| Ran | `react-doctor preflight run` + `--diff` base or bounded path(s) |
| Skipped — no logic | `react-doctor skipped (not a React/RN logic PR)` |
| Skipped — failure | `react-doctor preflight skipped (<reason>)` + exact command + error excerpt |

- **rnsec** row using CLI status only:

| Result | Wording |
| --- | --- |
| Ran | `rnsec preflight run (CLI)` + `--changed-files` base or full-scan fallback |
| Skipped — no scope | `rnsec skipped (not React Native security scope)` |
| Skipped — unavailable/failure | `rnsec preflight skipped (CLI unavailable — <reason>)` or `rnsec preflight skipped (CLI — <reason>)` |

- **sonarlint** row using local CLI status only:

| Result | Wording |
| --- | --- |
| Ran | `sonarlint preflight run (local CLI)` — `sonarlint-ls-cli analyze` on PR-changed `.ts/.tsx/.js/.jsx/.py/.java` files |
| Skipped — no scope | `sonarlint skipped (no PR-changed .ts/.tsx/.js/.jsx/.py/.java files)` |
| Skipped — unavailable/failure | `sonarlint preflight skipped (CLI unavailable — <reason>)` or `sonarlint preflight skipped (CLI — <reason>)` |
| Scope note (info) | `sonarlint scope note (.kt/.swift/.m/.mm — no local analyzer, reviewed manually)` — add when PR also touches Kotlin/Swift/Objective-C, in addition to the Ran/Skipped row above |

- **fuck-u-code** row using CLI status only:

| Result | Wording |
| --- | --- |
| Ran | `fuck-u-code preflight run (CLI)` + bounded path(s) |
| Skipped — no logic | `fuck-u-code skipped (assets/locales/tests only)` |
| Skipped — unavailable | `fuck-u-code preflight skipped (CLI unavailable — <reason>)` |

Never report `skipped (unavailable)` because an MCP server named `fuck-u-code`
is missing. MCP is not used for this preflight; if `command -v fuck-u-code`
succeeds, run it or explicitly skip with a PR-scoped reason (e.g. assets-only).

Never omit the **PR axis**, **ensemble**, **motion scope**, **review-animations**
(when motion scope yes), **react-doctor**, **rnsec**, or **sonarlint** rows.
A final review without them is incomplete even when findings look thorough.

For each finding, use these sections:
- 위치
- 조건
- 문제
- 영향
- 최소 수정

Do not provide only an English-style table. The final synthesis must be understandable to Korean engineers who want practical review comments.

## Review behavior rules

- **Do not post PR/host comments by default** — see **Platform posting (SSOT)**. Chat (or requested surface) only unless the user explicitly asks to post.
- Do not flood with style-only comments.
- Do not suggest large refactors unless required for safety.
- Prefer minimal patches over architectural rewrites.
- If uncertain, state assumption explicitly.
- Every Medium/High issue must have a reproducible condition.

## Quick heuristics

- If two values are displayed as a pair, they must be computed as a pair.
- If override is partial, decide: reject, complete with default, or hide coherently.
- If fallback source changes by branch, verify all branches preserve invariants.
- If async sets loading true, verify all exits set it false.
- If Skia `readPixels` or `makeImageSnapshot` appears inside rAF/effect/poll loop on a GPU `<Canvas ref>`, treat as 🟠 until refactored to 1× CPU bake or proven 1× offscreen snapshot — do not wait for Datadog.

## Example finding (reference style)

- **[Medium] Partial override breaks pair invariant**
  - **Condition:** `mismatchedCountProp` provided, `maxAttemptCountProp` absent, local state count is 0.
  - **Impact:** error count UI may be suppressed or inconsistent with provided override intent.
  - **Evidence:** `bottom-sheet-pin.tsx` value derivation paths for `mismatchedCount` / `maxAttemptCount`.
  - **Minimal fix:** derive both values from a shared source rule (prop pair > state pair > undefined), or require pair-wise prop validation.
