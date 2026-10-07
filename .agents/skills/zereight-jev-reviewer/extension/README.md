# zereight-jev-reviewer extension

Registers the `jev_review` tool, which runs `../tool` (jev-review with an OpenRouter adapter) and returns unverified finding candidates.

- Params: `path` (default cwd), `base` (e.g. `origin/develop`; omit for working tree)
- Needs `OPENROUTER_API_KEY` and a one-time `npm install` in `../tool`
- Install: `ln -sfn <skill>/extension ~/.pi/agent/extensions/zereight-jev-reviewer`, then `/reload`
- Full JSON report is written to `$TMPDIR/jev-review/report-*.json`
