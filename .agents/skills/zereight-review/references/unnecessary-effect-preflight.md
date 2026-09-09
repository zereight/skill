# Unnecessary-Effect Preflight (lint-introduction gate)

Runs the `eslint-plugin-react-you-might-not-need-an-effect` check as a review
preflight **before** the lint is introduced, so mechanically fixable Effects are
removed first and only justified keeps remain when the lint lands.

## Scope trigger

Run when the diff adds or touches `useEffect` / `useBankXEffect` /
`useBackgroundEffect` (or the repo's equivalent Effect wrappers) in `*.ts` /
`*.tsx`, excluding `**/*.test.*`, `**/__snapshots__/**`, `**/locales/**`,
`**/*.stories.*`. Otherwise state
`ymnne preflight skipped (no Effect hunks)` in `검증 결과` and continue.

## Blind spot — read first

`eslint-plugin-react-you-might-not-need-an-effect` detects **only**
`useEffect` / `React.useEffect` calls. It has **no custom-hook option**
(verified against README + dist source). A repo that wraps Effects
(e.g. `useBankXEffect`) gets ~zero findings on a naive run — the lint is dead
unless the wrapper is mapped. Every pattern in
`references/react-effect-guidelines.md` applies to the wrappers equally.

## Procedure

1. **Scope grep** the diff for Effect-writer hunks:
   `useEffect|useBankXEffect|useBackgroundEffect` (adjust wrapper names per repo;
   check `.eslintrc` `react-hooks.additionalEffectHooks` for the local list).
2. **Run the mapped check.** Temporarily install the plugin
   (`npm install --no-save eslint-plugin-react-you-might-not-need-an-effect`),
   run it through a harness that rewrites wrapper calls to `useEffect`
   (Linter API + `@typescript-eslint/parser`), then uninstall and delete the
   harness. Never commit the harness or the temp dependency.
3. **Triage every hit** into exactly one bucket:
   - **fix** — pure derivation (`useMemo`), prop-change reset (render-adjust /
     `key` split), or removable mirror state (fully-controlled conversion).
     File as 🛠️ finding with the minimal fix.
   - **keep + justify** — ref/shared-value writes, transition state machines,
     parent-callback compatibility, IME-sensitive input buffers. Require a
     per-line `eslint-disable` + reason comment in the PR; no comment = **block**.
   - **block** — event logic in Effect, fetch without cleanup, effect chains
     causing user-visible bugs. Severity per `react-effect-guidelines.md`.
4. **Gate for lint introduction.** The lint may land only when every hit is
   **fix**ed or **keep + justify**d: `fixes=N keeps=M (all justified) blocks=0`.
   Any unjustified keep is a merge blocker for the lint-introduction PR.

## Keep-justification template

```tsx
// eslint-disable-next-line react-you-might-not-need-an-effect/<rule> -- <why Effect is required, which alternative was considered>
```

File-level disables are banned; scope is one line. The comment must name the
rejected alternative (e.g. "shared-value write cannot move to render phase").

## 검증 결과 row

| Result | Wording |
| --- | --- |
| Ran | `ymnne preflight run` + `fixes=N keeps=M blocks=K` |
| Skipped — no scope | `ymnne preflight skipped (no Effect hunks)` |
| Skipped — failure | `ymnne preflight skipped (<reason>)` + exact command + error excerpt |

Never promote plugin diagnostics to 🟠 Major or higher without current-turn
file-content evidence. Counts feed the React/RN ensemble pass prompt.
