---
name: bitbucket-api-env
description: Use this skill for Bitbucket Cloud work when the user wants REST/API access through injected environment variables and explicitly does not want Bitbucket MCP, mcporter Bitbucket, or connector-backed Bitbucket tools.
---

# Bitbucket API Env

Use Bitbucket Cloud REST directly. Do not use Bitbucket MCP, `mcporter list bitbucket`, `mcporter call bitbucket.*`, or connector-backed Bitbucket tools unless the user explicitly overrides this skill.

## Environment

Required repository target:

```bash
export BITBUCKET_WORKSPACE=bank-x
export BITBUCKET_REPO_SLUG=mobile-app-workspace
```

Use one auth mode.

Basic auth with Atlassian email and API token:

```bash
export BITBUCKET_USERNAME="$ATLASSIAN_USER_EMAIL"
export BITBUCKET_API_TOKEN="$ATLASSIAN_API_TOKEN"
```

Bearer auth with a Bitbucket access token:

```bash
export BITBUCKET_ACCESS_TOKEN="<token>"
```

Never paste token values into the conversation or hard-code them into files. Prefer already-exported environment variables. If variables are missing, say exactly which names are missing.

## Workflow

1. Parse Bitbucket URLs into `workspace`, `repo_slug`, and pull request id when possible. Otherwise use the environment target.
2. Use the bundled helper for common read paths:

```bash
node /Users/tao.exe/Documents/skill/skills/bitbucket-api-env/scripts/bitbucket-api.mjs pr 123
node /Users/tao.exe/Documents/skill/skills/bitbucket-api-env/scripts/bitbucket-api.mjs comments 123
node /Users/tao.exe/Documents/skill/skills/bitbucket-api-env/scripts/bitbucket-api.mjs activity 123
node /Users/tao.exe/Documents/skill/skills/bitbucket-api-env/scripts/bitbucket-api.mjs diffstat 123
node /Users/tao.exe/Documents/skill/skills/bitbucket-api-env/scripts/bitbucket-api.mjs diff 123 > /private/tmp/bitbucket-pr-123.diff
```

3. For custom endpoints, use `request`:

```bash
node /Users/tao.exe/Documents/skill/skills/bitbucket-api-env/scripts/bitbucket-api.mjs request GET "/repositories/$BITBUCKET_WORKSPACE/$BITBUCKET_REPO_SLUG/pullrequests?state=OPEN&pagelen=50"
```

4. Keep raw large outputs in `/private/tmp`; summarize with exact ids, statuses, branch names, file paths, or line references.
5. For Korean internal engineering requests, answer in Korean.

## Guardrails

- Default to read-only. Mutating methods require both an explicit user request and `BITBUCKET_API_ALLOW_WRITE=1`.
- Report the exact HTTP status and response body excerpt when an API call fails.
- Do not claim that a PR, comment, or file was checked unless the matching API call was actually run.
- Do not fall back to Bitbucket MCP because REST failed. Say the API failure directly, then ask whether to try another route.

## Common Endpoints

- Pull request: `GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}`
- Comments: `GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments`
- Activity: `GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/activity`
- Diff: `GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/diff`
- Diffstat: `GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/diffstat`
- Commits: `GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/commits`
