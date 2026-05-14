# Chorus Patch Plan For Review-Only xhigh

## Goal

Guarantee that Chorus reviews can use Codex `model_reasoning_effort = xhigh` without changing the user's normal Codex low-reasoning configuration.

## Template API

Extend template candidates with:

```yaml
reviewer:
  require: 2
  crossLineage: true
  candidates:
    - lineage: openai
      models: ["gpt-5.5"]
      codex:
        reasoningEffort: xhigh
    - lineage: google
      models: ["gemini-3.1-pro-preview"]
    - lineage: anthropic
      models: ["claude-opus-4-7"]
      skipWhenUnhealthy: true
```

Fields:

- `codex.reasoningEffort`: `low | medium | high | xhigh`
- `codex.profile`: optional string for a Codex config profile
- `skipWhenUnhealthy`: optional boolean

Validation:

- Allow `codex.*` only on `lineage: openai`.
- Reject unknown reasoning effort values.
- Allow `skipWhenUnhealthy` on CLI lineages.

## Code Changes

Update:

- `src/lib/template-schema.ts`
  - Add `codex.reasoningEffort`.
  - Add `codex.profile`.
  - Add `skipWhenUnhealthy`.
- `src/daemon/agents/types.ts`
  - Add `codex?: { reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh'; profile?: string }` to spawn options.
- `src/daemon/agents/codex.ts`
  - Add explicit Codex config overrides:
    - `-c model_reasoning_effort="xhigh"`
    - optional `--profile <profile>`
  - Preserve `--ignore-user-config`.
- `src/daemon/runner/reviewer.ts`
  - Pass candidate Codex options to the shim.
- `src/daemon/runner/doer.ts`
  - Pass doer Codex options to the shim.
- `src/daemon/runner/reviewer-driver.ts`
  - Respect `skipWhenUnhealthy` during precheck.
- `src/daemon/runner/doer-driver.ts`
  - Respect `skipWhenUnhealthy` when applicable.
- `src/daemon/agents/parsers/claude.ts`
  - Surface `rate_limit_event` to CLI health.
- `src/lib/cli-precheck.ts`
  - Treat `rate_limited` like `quota_exhausted` while reset is in the future.
- `templates/cost-aware-review.yaml`
  - Add Codex xhigh + Gemini + Claude optional review-only template.

## Tests

Add or update:

- `tests/template-schema.test.ts`
  - Accept Codex xhigh on openai candidates.
  - Reject `codex` options on non-openai candidates.
  - Accept `skipWhenUnhealthy`.
- `tests/codex-headless-args.test.ts`
  - Assert `-c model_reasoning_effort="xhigh"` is present.
  - Assert `--ignore-user-config` remains.
- `tests/runner-reviewer.test.ts`
  - Assert candidate options reach agent spawn.
- `tests/cli-precheck.test.ts`
  - Assert future `rate_limited.resetAt` skips spawn.
- `tests/parse-claude-rate-limit.test.ts`
  - Assert Claude `rate_limit_event` updates health.
- `tests/template-validation.test.ts`
  - Assert `cost-aware-review.yaml` is valid.

## Acceptance

- Normal Codex remains low outside Chorus review.
- Chorus review can explicitly request Codex xhigh.
- Claude is skipped when health says rate limited or quota exhausted.
- Gemini remains a required reviewer.
- Claude absence does not block Codex + Gemini review.
