---
name: mcporter-mcp-first
description: Use this skill when a task needs MCP tools, internal app connectors, or "use mcp" behavior. Search and inspect mcporter servers/tools first, then call the right MCP tool through mcporter before using browser, REST, raw CLI, or other fallback paths.
---

# Mcporter MCP First

## Overview

When a task needs MCP, treat `mcporter` as the first registry to inspect. It knows the locally configured MCP servers and can expose tools that are not already loaded in the Codex tool list.

## Trigger

Use this skill when the user asks to:

- use MCP, `mcporter`, or a named internal connector
- read internal systems where a local MCP server likely exists
- inspect PRs, issues, docs, browser targets, design files, or app data through MCP
- recover from missing direct MCP namespaces by searching local mcporter servers
- avoid REST/browser/raw git when a configured MCP server is the intended source

## Workflow

1. Discover mcporter tools first.
   - Use `tool_search` for `mcporter <domain keywords>` if `mcp__mcporter_bridge__` is not already loaded.
   - Prefer `mcp__mcporter_bridge__` tools when available:
     - `mcporter_list_servers`
     - `mcporter_help`
     - `mcporter_inspect_server`
     - `mcporter_call_tool`
   - If the bridge transport fails, use the local CLI:
     `/Users/tao.exe/.nvm/versions/node/v22.22.2/bin/mcporter`

2. Narrow to the relevant server before listing schemas.
   - Avoid broad `mcporter list` if possible; it can hang on unrelated servers.
   - Prefer `mcporter list <server> --schema --json`.
   - If the server name is unknown, use `mcporter_list_servers` with a timeout, then inspect the likely server only.

3. Inspect the tool parameter format before calling it.
   - Use `mcporter_help(server=<server>)` to list tools.
   - Use `mcporter_help(server=<server>, tool=<tool>)` or `mcporter_inspect_server` for schemas.
   - With `mcporter_call_tool`, pass `arguments` as a JSON object, not a string.

4. Call the MCP tool before fallback paths.
   - Prefer mcporter MCP output over direct REST, browser scraping, or raw git when the user requested MCP or the task targets an internal system.
   - If mcporter fails, record the exact failure and then use the narrowest fallback.

## Examples

### Bitbucket PR

Use server `bitbucket`.

- Metadata: `bb_get_pr`
- Comments: `bb_ls_pr_comments`
- Branch diff: `bb_diff_branches`
- BankX common identifiers:
  - `workspaceSlug=bank-x`
  - `repoSlug=mobile-app-workspace`

### Atlassian Docs

Use the configured Atlassian server if available. Inspect schema first; do not guess page parameters.

### Browser/DevTools MCP

If the user asks to inspect a local browser target through MCP, search mcporter for browser/devtools servers before shell or external browser fallback.

## Known Failure Modes

- `mcporter list` without a server can hang on unrelated MCP servers. Prefer server-specific list/inspect.
- Some MCP servers write logs/cache under home directories; sandboxed calls can fail with `EPERM`. If the MCP call is necessary, rerun the exact mcporter command with escalation.
- Bridge transport can close while CLI still works. Fall back to the mcporter CLI before abandoning MCP.
- Do not use unauthenticated REST before mcporter for internal resources.

## Output Expectations

State whether the answer came from mcporter MCP or a fallback. For Korean internal engineering requests, answer in Korean and include exact server/tool names used when useful.
