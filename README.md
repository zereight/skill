# zereight-review

Code review plugins focused on **logic correctness and edge cases**. Available as plugins for Factory Droid and Claude Code, with optional platform MCP integration.

## Plugins

| Plugin | Description |
|--------|-------------|
| `zereight-review` | Core skill, platform-agnostic |
| `zereight-review-github` | Core skill + GitHub PR MCP |
| `zereight-review-gitlab` | Core skill + GitLab MR MCP |
| `zereight-review-bitbucket` | Core skill + Bitbucket PR MCP |

## Install

### Factory Droid

```bash
# Add marketplace
droid plugin marketplace add https://github.com/your/repo

# Install a plugin (pick one)
droid plugin install zereight-review@zereight-review-marketplace
droid plugin install zereight-review-github@zereight-review-marketplace
droid plugin install zereight-review-gitlab@zereight-review-marketplace
droid plugin install zereight-review-bitbucket@zereight-review-marketplace
```

### Claude Code

```bash
# Add marketplace
claude plugin marketplace add https://github.com/your/repo

# Install a plugin (pick one)
claude plugin install zereight-review@zereight-review-marketplace
claude plugin install zereight-review-github@zereight-review-marketplace
```

### Legacy (npx skills)

```bash
npx skills add /path/to/this/repo -g --skill zereight-review -y
```

## Update

```bash
# Pull latest changes
git -C /path/to/this/repo pull

# Update plugin
droid plugin update zereight-review-github@zereight-review-marketplace
```

## MCP Setup

Platform plugins require environment variables:

**GitHub** — `GITHUB_PERSONAL_ACCESS_TOKEN`

**GitLab** — `GITLAB_PERSONAL_ACCESS_TOKEN`, `GITLAB_API_URL`

**Bitbucket** — `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD`

## Skill: `zereight-review`

Comprehensive code review focused on **logic correctness and edge cases**, not style.

Prioritizes:
- Invariant breaks (paired values that must stay consistent)
- Partial-input cases (only some optional fields provided)
- Fallback-chain risks (`??`, `||`, ternary precedence)
- State vs UI display mismatch
- Boundary values (`0`, negative, undefined, overflow)
- Async timing / race / stale closure

Output format: CodeRabbit-style (Summary / Good / Findings / Verdict)
