# zereight-jev-reviewer extension

Registers the `jev_review` tool, which runs `../tool` (jev-review with an OpenRouter adapter) and returns unverified finding candidates.

- Params: `path` (default cwd), `base` (e.g. `origin/develop`; omit for working tree)
- Judgment backend: `JEV_PROVIDER=jev` (default; `typesafe/jev-1.13` via OpenRouter, `OPENROUTER_API_KEY`) or `cursor` (Cursor key from `CURSOR_API_KEY` or Pi's `auth.json`)
- Needs a one-time `npm install` in `../tool`
- Install: `ln -sfn <skill>/extension ~/.pi/agent/extensions/zereight-jev-reviewer`, then `/reload`
- Full JSON report is written to `$TMPDIR/jev-review/report-*.json`
