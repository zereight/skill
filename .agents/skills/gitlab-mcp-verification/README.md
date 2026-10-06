# gitlab-mcp-verification

Global verification skill for [zereight/gitlab-mcp](https://github.com/zereight/gitlab-mcp).

Naming follows [modern-react-guidance](https://github.com/adhhamdev/modern-react-guidance) (`<topic>-<purpose>/`, `SKILL.md` + `references/`).

## Install

Canonical copy lives in the `zereight/skill` repo and is reached through the SSOT:

```
~/Documents/skill/.agents/skills/gitlab-mcp-verification   # real dir (git)
~/.agents/skills/gitlab-mcp-verification                   # SSOT symlink
~/.cursor/skills | ~/.codex/skills | ~/.claude/skills | ~/.pi/skills   # relative symlinks
```

Fanned out with the `zereight-skill-ssot-sync` skill:

```bash
bash ~/.agents/skills/zereight-skill-ssot-sync/scripts/sync.sh --sync
```

The skill is **not** vendored into any project — no repo needs a `.gitignore` entry
for it.

## Quick start

Run from a clone of `zereight/gitlab-mcp` (any path):

```bash
SKILL="$HOME/.agents/skills/gitlab-mcp-verification"
ART="$HOME/.agents/verify-artifacts/gitlab-mcp-verification/local"

npm run build
bash "$SKILL/scripts/doctor.sh"
GITLAB_MCP_VERIFY_RUN_ID=local GITLAB_MCP_VERIFY_ARTIFACTS="$ART" bash "$SKILL/scripts/drive-health-check-mock.sh"
GITLAB_MCP_VERIFY_ARTIFACTS="$ART" bash "$SKILL/scripts/cleanup-run.sh"
test -f "$ART/health-check.json" && echo ok
```

Repo resolution: `GITLAB_MCP_REPO_ROOT` → `git rev-parse --show-toplevel` of CWD → CWD.

## Structure

```
gitlab-mcp-verification/
├── SKILL.md
├── references/          # verification map (feature recipes)
└── scripts/             # doctor, drive, cleanup
```

## Maintenance

Update `references/` when tool paths or env vars change. Re-run doctor +
`drive-health-check-mock.sh` before merging skill-only changes.
