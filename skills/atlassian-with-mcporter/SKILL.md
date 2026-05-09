---
name: atlassian-with-mcporter
description: Read or verify Atlassian Jira and Confluence items through mcporter. Use for bankx.atlassian.net links, Jira issue keys, Confluence pages, Jira ticket validation, JQL/CQL searches, or when another Jira MCP wrapper fails.
---

# Atlassian With Mcporter

Use `mcporter` first for Atlassian work. Do not conclude that an issue/page is missing from a wrapper failure alone.

## Workflow

1. Inspect the server before fallback:
   ```bash
   /Users/tao.exe/.nvm/versions/node/v22.22.2/bin/mcporter list atlassian --schema --json
   ```

2. If it fails with `listen EPERM`, rerun outside the sandbox with approval. The Atlassian MCP proxy may need local port binding.

3. Get accessible resources:
   ```bash
   /Users/tao.exe/.nvm/versions/node/v22.22.2/bin/mcporter call atlassian.getAccessibleAtlassianResources
   ```

4. For Jira issues, use the Atlassian MCP JQL tool:
   ```bash
   /Users/tao.exe/.nvm/versions/node/v22.22.2/bin/mcporter call atlassian.searchJiraIssuesUsingJql \
     cloudId=bankx.atlassian.net \
     jql='key = ISSUE-123' \
     maxResults=10 \
     fields='["summary","description","status","issuetype","priority","created","updated","project","assignee","reporter"]' \
     responseContentFormat=markdown
   ```

5. If search returns an ARI or lightweight result, call `atlassian.fetch` for details.

## Guardrails

- Do not trust `mcp__Confluence_wiki__.execute_jql_search` alone; it may use obsolete Jira APIs.
- Do not say "issue not found" until Atlassian MCP JQL has been tried.
- If REST fallback is needed, prefer:
  `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...`
  over only:
  `https://site.atlassian.net/rest/api/3/...`
- Report failure causes separately: obsolete wrapper API, sandbox port failure, auth/permission failure, empty query result.
