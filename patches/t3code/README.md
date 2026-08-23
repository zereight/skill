# T3 Code: Cursor provider local skill discovery (upstream patch)

T3 Code Cursor provider leaves `skills[]` and `slashCommands[]` empty on probe.
This patch adds filesystem discovery (same roots as `sync-t3-cursor-skills.py`) during
`checkCursorProviderStatus`.

## Apply (t3code repo)

```bash
git clone https://github.com/pingdotgg/t3code.git
cd t3code
patch -p1 < /path/to/skill/patches/t3code/0001-cursor-local-skill-discovery.patch
npm run typecheck
npm run test -- apps/server/src/provider/discoverLocalAgentSkills.test.ts
```

## Until merged

Use the cache backfill workaround from the skill repo:

```bash
bash scripts/sync-t3-cursor-skills.sh
# restart T3 Code
```

Re-run after T3 refreshes provider status (overwrites cache) or when adding new skills.

## Related

- pingdotgg/t3code#2637 — Codex/Cursor slash commands not in `/` menu
- pingdotgg/t3code#2650 — show provider skills in `/` menu (when `skills[]` populated)
