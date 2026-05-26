#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";

const defaultProjectsDir = join(homedir(), ".cursor", "projects");
const absolutePathPattern = /\/(?:Users|home|var|tmp|opt|private)[^\s"'`<>|]+/gu;

const usage = `Usage:
  session-lessons.mjs list [--cwd <path>] [--project <slug>] [--all] [--include-subagents] [--limit <n>] [--projects-dir <dir>]
  session-lessons.mjs extract <transcript.jsonl> [--max-entries <n>] [--max-entry-chars <n>]

Examples:
  node scripts/session-lessons.mjs list --cwd "$PWD" --limit 10
  node scripts/session-lessons.mjs list --project Users-tao-exe-Documents-gitlab-mcp --limit 5
  node scripts/session-lessons.mjs list --all --limit 20
  node scripts/session-lessons.mjs extract ~/.cursor/projects/.../agent-transcripts/<id>/<id>.jsonl
`;

async function main() {
  const { command, options, positional } = parseArgs(process.argv.slice(2));

  if (!command || command === "help" || command === "--help" || command === "-h" || options.help) {
    console.log(usage.trim());
    return;
  }

  if (command === "list") {
    await listSessions(options);
    return;
  }

  if (command === "extract") {
    const [sessionFile] = positional;
    if (!sessionFile) {
      throw new Error("Expected a Cursor transcript JSONL path for `extract`.");
    }

    await extractSession(resolvePath(sessionFile), options);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function parseArgs(args) {
  const [command, ...rest] = args;
  const options = {
    all: false,
    cwd: process.cwd(),
    help: false,
    includeSubagents: false,
    limit: 10,
    maxEntries: 200,
    maxEntryChars: 1_200,
    project: "",
    projectsDir: defaultProjectsDir,
  };
  const positional = [];

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];

    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }

    if (token === "--all") {
      options.all = true;
      continue;
    }

    if (token === "--include-subagents") {
      options.includeSubagents = true;
      continue;
    }

    if (token === "--cwd") {
      options.cwd = readValue(rest, index, token);
      index += 1;
      continue;
    }

    if (token === "--project") {
      options.project = readValue(rest, index, token);
      index += 1;
      continue;
    }

    if (token === "--limit") {
      options.limit = readPositiveInteger(readValue(rest, index, token), token);
      index += 1;
      continue;
    }

    if (token === "--max-entries") {
      options.maxEntries = readNonNegativeInteger(readValue(rest, index, token), token);
      index += 1;
      continue;
    }

    if (token === "--max-entry-chars") {
      options.maxEntryChars = readPositiveInteger(readValue(rest, index, token), token);
      index += 1;
      continue;
    }

    if (token === "--projects-dir") {
      options.projectsDir = readValue(rest, index, token);
      index += 1;
      continue;
    }

    positional.push(token);
  }

  return { command, options, positional };
}

function readValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${flag}.`);
  }
  return value;
}

function readPositiveInteger(value, flag) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return parsed;
}

function readNonNegativeInteger(value, flag) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative integer.`);
  }
  return parsed;
}

function resolvePath(path) {
  if (path === "~") {
    return homedir();
  }

  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }

  return resolve(path);
}

async function listSessions(options) {
  const projectsDir = resolvePath(options.projectsDir);
  const targetCwd = resolvePath(options.cwd);
  const files = await findTranscriptFiles(projectsDir, options.includeSubagents);
  const sortedFiles = files.sort((left, right) => right.modifiedAt - left.modifiedAt);
  const summaries = [];

  for (const file of sortedFiles) {
    const summary = await summarizeSession(file.path, file);
    if (!summary) {
      continue;
    }

    if (options.project && summary.projectSlug !== options.project) {
      continue;
    }

    if (!options.all && !sessionMatchesScope(summary, targetCwd)) {
      continue;
    }

    summaries.push(summary);
    if (summaries.length >= options.limit) {
      break;
    }
  }

  if (summaries.length === 0) {
    const scope = options.project
      ? `project ${options.project}`
      : options.all
        ? projectsDir
        : `${targetCwd} (or inferred workspace roots) under ${projectsDir}`;
    console.log(`No Cursor transcripts found for ${scope}.`);
    return;
  }

  printSessionTable(summaries);
}

async function findTranscriptFiles(root, includeSubagents) {
  const files = [];

  async function walk(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) {
        continue;
      }

      if (!includeSubagents && path.includes("/subagents/")) {
        continue;
      }

      if (!includeSubagents && !isMainTranscript(path)) {
        continue;
      }

      const fileStat = await stat(path);
      files.push({ modifiedAt: fileStat.mtimeMs, path, size: fileStat.size });
    }
  }

  await walk(root);
  return files;
}

function isMainTranscript(filePath) {
  const sessionId = basename(filePath, ".jsonl");
  const parentDir = basename(dirname(filePath));
  return parentDir === sessionId;
}

async function summarizeSession(sessionFile, file) {
  const projectSlug = extractProjectSlug(sessionFile);
  const counts = {
    assistant: 0,
    inferredPaths: new Set(),
    toolUses: 0,
    user: 0,
  };
  let firstUserQuery = "";
  let lineNumber = 0;

  for await (const entry of readJsonl(sessionFile)) {
    lineNumber += 1;
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const role = entry.role;
    if (role === "user") {
      counts.user += 1;
      if (!firstUserQuery) {
        firstUserQuery = extractUserQuery(entry);
      }
    } else if (role === "assistant") {
      counts.assistant += 1;
    }

    collectPathsFromEntry(entry, counts.inferredPaths);

    const content = entry.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === "tool_use") {
          counts.toolUses += 1;
        }
      }
    }
  }

  if (counts.user === 0 && counts.assistant === 0) {
    return undefined;
  }

  const inferredPaths = [...counts.inferredPaths].sort();
  const decodedWorkspace = decodeProjectSlug(projectSlug);

  return {
    counts: {
      assistant: counts.assistant,
      toolUses: counts.toolUses,
      user: counts.user,
    },
    decodedWorkspace,
    firstUserQuery,
    id: basename(sessionFile, ".jsonl"),
    inferredPaths,
    isSubagent: sessionFile.includes("/subagents/"),
    modifiedAt: file.modifiedAt,
    path: sessionFile,
    projectSlug,
    size: file.size,
  };
}

function extractProjectSlug(sessionFile) {
  const marker = `${join("projects", "")}`;
  const projectsIndex = sessionFile.indexOf("/projects/");
  if (projectsIndex === -1) {
    return "unknown";
  }

  const afterProjects = sessionFile.slice(projectsIndex + "/projects/".length);
  const slashIndex = afterProjects.indexOf("/");
  return slashIndex === -1 ? afterProjects : afterProjects.slice(0, slashIndex);
}

function decodeProjectSlug(slug) {
  if (!slug || slug === "empty-window" || slug === "unknown") {
    return "";
  }

  if (!slug.startsWith("Users-")) {
    return "";
  }

  const parts = slug.slice("Users-".length).split("-");
  let index = 0;
  let path = "/Users";

  if (parts[index] === "tao" && parts[index + 1] === "exe") {
    path += "/tao.exe";
    index += 2;
  } else if (parts[index]) {
    path += `/${parts[index]}`;
    index += 1;
  } else {
    return "";
  }

  while (index < parts.length) {
    path += `/${parts[index]}`;
    index += 1;
  }

  return path;
}

function sessionMatchesScope(summary, targetCwd) {
  const cwd = resolvePath(targetCwd);

  if (summary.decodedWorkspace) {
    const workspace = resolvePath(summary.decodedWorkspace);
    if (cwd === workspace || cwd.startsWith(`${workspace}/`) || workspace.startsWith(`${cwd}/`)) {
      return true;
    }
  }

  const meaningfulPaths = summary.inferredPaths.filter(isMeaningfulWorkspacePath);
  return meaningfulPaths.some((pathValue) => {
    const path = resolvePath(pathValue);
    return cwd === path || cwd.startsWith(`${path}/`) || path.startsWith(`${cwd}/`);
  });
}

function isMeaningfulWorkspacePath(pathValue) {
  const path = resolvePath(pathValue);
  const segments = path.split("/").filter(Boolean);
  // Ignore bare home dirs like /Users/tao.exe — too broad for --cwd filtering.
  return segments.length >= 4;
}

async function extractSession(sessionFile, options) {
  const entries = [];
  let emittedEntries = 0;
  let totalEntries = 0;
  const projectSlug = extractProjectSlug(sessionFile);
  const decodedWorkspace = decodeProjectSlug(projectSlug);

  for await (const entry of readJsonl(sessionFile)) {
    totalEntries += 1;
    if (options.maxEntries > 0 && emittedEntries >= options.maxEntries) {
      continue;
    }

    const rendered = renderEntry(entry, options.maxEntryChars);
    if (rendered) {
      entries.push(rendered);
      emittedEntries += 1;
    }
  }

  console.log("# Cursor Transcript Extract");
  console.log("");
  console.log(`- File: \`${sessionFile}\``);
  console.log(`- Session ID: \`${basename(sessionFile, ".jsonl")}\``);
  console.log(`- Project slug: \`${projectSlug}\``);
  if (decodedWorkspace) {
    console.log(`- Inferred workspace: \`${decodedWorkspace}\``);
  }
  console.log(
    `- Entries shown: ${entries.length}${options.maxEntries > 0 ? ` of ${totalEntries}` : ""}`,
  );
  console.log(
    "- Note: secrets redacted; attached-skill blobs and long system context trimmed.",
  );
  console.log("");

  for (const entry of entries) {
    console.log(entry);
    console.log("");
  }

  if (options.maxEntries > 0 && totalEntries > emittedEntries) {
    console.log(
      `_Omitted ${totalEntries - emittedEntries} entries. Re-run with --max-entries 0 to include all._`,
    );
  }
}

async function* readJsonl(file) {
  const stream = createReadStream(file, { encoding: "utf8" });
  const lines = createInterface({ crlfDelay: Infinity, input: stream });

  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      yield JSON.parse(trimmed);
    } catch (error) {
      yield {
        error: error instanceof Error ? error.message : "Invalid JSON",
        raw: trimmed,
        type: "parse_error",
      };
    }
  }
}

function printSessionTable(summaries) {
  console.log("| # | Updated | ID | Project | Counts | Preview | Path |");
  console.log("|---:|---|---|---|---|---|---|");

  summaries.forEach((summary, index) => {
    const counts = [
      `${summary.counts.user} user`,
      `${summary.counts.assistant} assistant`,
      `${summary.counts.toolUses} tools`,
    ].join(", ");
    const preview = escapeCell(truncatePlain(summary.firstUserQuery, 80));
    console.log(
      `| ${index + 1} | ${formatDate(summary.modifiedAt)} | ${escapeCell(summary.id)} | ${escapeCell(summary.projectSlug)} | ${escapeCell(counts)} | ${preview} | \`${escapeCell(summary.path)}\` |`,
    );
  });
}

function renderEntry(entry, maxEntryChars) {
  if (entry.type === "parse_error") {
    return `## parse_error\n\n${truncate(redact(entry.raw), maxEntryChars)}\n\n_Error: ${entry.error}_`;
  }

  if (entry.role === "user") {
    return `## user\n\n${truncate(redact(extractUserQuery(entry)), maxEntryChars)}`;
  }

  if (entry.role === "assistant") {
    return `## assistant\n\n${assistantContentToText(entry.message?.content, maxEntryChars)}`;
  }

  return undefined;
}

function extractUserQuery(entry) {
  const text = contentToText(entry.message?.content, Number.POSITIVE_INFINITY);
  return normalizeUserText(text);
}

function normalizeUserText(text) {
  return String(text)
    .replace(/<manually_attached_skills>[\s\S]*?<\/manually_attached_skills>/gu, "[attached skills omitted]")
    .replace(/<user_query>\s*/gu, "")
    .replace(/\s*<\/user_query>/gu, "")
    .replace(/<open_and_recently_viewed_files>[\s\S]*?<\/open_and_recently_viewed_files>/gu, "[open files omitted]")
    .replace(/<git_status>[\s\S]*?<\/git_status>/gu, "[git status omitted]")
    .replace(/<agent_skills>[\s\S]*?<\/agent_skills>/gu, "[agent skills omitted]")
    .trim();
}

function assistantContentToText(content, maxEntryChars) {
  if (!Array.isArray(content)) {
    return truncate(redact(contentToText(content, maxEntryChars)), maxEntryChars);
  }

  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }

    if (block.type === "text") {
      parts.push(String(block.text ?? ""));
      continue;
    }

    if (block.type === "tool_use") {
      const args = truncate(redact(JSON.stringify(block.input ?? {})), maxEntryChars);
      parts.push(`[tool: ${block.name ?? "unknown"} ${args}]`);
    }
  }

  return truncate(redact(parts.filter(Boolean).join("\n\n")), maxEntryChars);
}

function contentToText(content, maxEntryChars) {
  if (typeof content === "string") {
    return truncate(redact(content), maxEntryChars);
  }

  if (!Array.isArray(content)) {
    return truncate(redact(JSON.stringify(content ?? "")), maxEntryChars);
  }

  const text = content
    .map((block) => {
      if (!block || typeof block !== "object") {
        return "";
      }

      if (block.type === "text") {
        return String(block.text ?? "");
      }

      if (block.type === "tool_use") {
        return `[tool: ${block.name ?? "unknown"}]`;
      }

      return JSON.stringify(block);
    })
    .filter(Boolean)
    .join("\n\n");

  return truncate(redact(text), maxEntryChars);
}

function collectPathsFromEntry(entry, paths) {
  const serialized = redact(JSON.stringify(entry ?? {}));
  for (const match of serialized.matchAll(absolutePathPattern)) {
    const cleaned = cleanPath(match[0]);
    if (cleaned) {
      paths.add(cleaned);
    }
  }
}

function cleanPath(pathValue) {
  const cleaned = String(pathValue)
    .replace(/[),.;:]+$/u, "")
    .replace(/\\$/u, "");

  return isMeaningfulWorkspacePath(cleaned) ? cleaned : "";
}

function redact(text) {
  return String(text)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gu, "Bearer [REDACTED]")
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gu, "[REDACTED_GITHUB_TOKEN]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/gu, "[REDACTED_AWS_KEY]")
    .replace(/\bsk-[A-Za-z0-9]{20,}\b/gu, "[REDACTED_API_KEY]")
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gu,
      "[REDACTED_JWT]",
    )
    .replace(
      /\b(api[_-]?key|token|secret|password|authorization)\b\s*[:=]\s*["']?[^\s"']{8,}/giu,
      "$1=[REDACTED]",
    );
}

function truncate(text, maxChars) {
  const value = String(text);
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}\n...[truncated ${value.length - maxChars} chars]`;
}

function truncatePlain(text, maxChars) {
  const flattened = String(text).replace(/\s+/gu, " ").trim();
  if (flattened.length <= maxChars) {
    return flattened;
  }

  return `${flattened.slice(0, maxChars)}...`;
}

function formatDate(value) {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return "unknown";
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
