#!/usr/bin/env -S node --experimental-strip-types
// claude-skill-cleaner — read-only audit of Claude Code skills & subagents.
// Port of steipete/agent-scripts skills/skill-cleaner (Codex/OpenClaw only).
// Approach: relative token comparison (approx ceil(utf8_bytes/4)); suggestions only, never deletes.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type Scope =
  | "personal" | "personal-link" | "plugin-cache" | "plugin-internal"
  | "upstream" | "marketplace" | "project";

type Skill = {
  name: string; baseName: string; description: string;
  path: string; realPath: string; root: string;
  scope: Scope; plugin: string | null; marketplace: string | null; version: string | null;
  active: boolean; descChars: number; lineBytes: number; tokenCost: number;
  bodyHash: string; bodyKey: string; descKey: string;
};
type Subagent = { name: string; description: string; path: string; descChars: number; tokenCost: number };
type Usage = { skillTool: number; command: number; fileRead: number; mention: number };

const home = os.homedir();
const rawArgs = process.argv.slice(2);
const argset = new Set(rawArgs);
const flag = (name: string): boolean => argset.has(name);
function argValue(name: string, fallback: string): string {
  const i = rawArgs.indexOf(name);
  return i >= 0 && rawArgs[i + 1] ? rawArgs[i + 1]! : fallback;
}
function argValues(name: string): string[] {
  const out: string[] = [];
  rawArgs.forEach((a, i) => { if (a === name && rawArgs[i + 1]) out.push(rawArgs[i + 1]!); });
  return out;
}
function expandHome(input: string): string { return input.replace(/^~(?=$|\/)/, home); }

if (flag("--help") || flag("-h")) {
  console.log(`claude-skill-cleaner — audit Claude Code skills & subagents (read-only)

Usage: node --experimental-strip-types scripts/skill-cleaner.ts [options]

  --months <n>          log scan window in months (default 3)
  --no-logs             skip unused-skill detection (faster)
  --json                machine-readable output
  --root <path>         extra root to scan (repeatable, e.g. a project)
  --top <n>             ranking length (default 20)
  --include-disabled    include non-active (duplicate/old) copies in sections
  --no-agents           skip subagent tally
  --show-budget         show a reference budget (approx, not authoritative)
  --context-tokens <n>  reference budget base (default 200000)
  --budget-percent <n>  reference budget percent (default 2)
  --max-log-mb <n>      cap total log bytes read (default 2000)`);
  process.exit(0);
}

const months = Number(argValue("--months", "3"));
const noLogs = flag("--no-logs");
const asJson = flag("--json");
const topN = Number(argValue("--top", "20"));
const includeDisabled = flag("--include-disabled");
const noAgents = flag("--no-agents");
const showBudget = flag("--show-budget");
const contextTokens = Number(argValue("--context-tokens", "200000"));
const budgetPercent = Number(argValue("--budget-percent", "2"));
const maxLogBytes = Number(argValue("--max-log-mb", "2000")) * 1024 * 1024;
const extraRoots = argValues("--root").map(expandHome);
const cutoffMs = Date.now() - Math.max(0, months) * 31 * 24 * 60 * 60 * 1000;

// ---------- fs helpers ----------
function exists(p: string): boolean { try { fs.accessSync(p); return true; } catch { return false; } }
function realpathSafe(p: string): string { try { return fs.realpathSync(p); } catch { return p; } }

function walkFiles(root: string, predicate: (f: string) => boolean, maxDepth = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;
    const real = realpathSafe(dir);
    if (seen.has(real)) return;
    seen.add(real);
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const f = path.join(dir, e.name);
      if (e.isDirectory() || e.isSymbolicLink()) {
        let st: fs.Stats; try { st = fs.statSync(f); } catch { continue; }
        if (st.isDirectory()) walk(f, depth + 1);
      } else if (e.isFile() && predicate(f)) out.push(f);
    }
  }
  if (exists(root)) walk(root, 0);
  return out;
}

// ---------- frontmatter ----------
function sanitize(v: string): string { return v.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim(); }
function unquote(raw: string): string {
  const v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}
function parseFrontmatter(file: string): { name?: string; description?: string; body: string } | null {
  let text: string; try { text = fs.readFileSync(file, "utf8"); } catch { return null; }
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const fm: string[] = []; let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") { end = i; break; }
    fm.push(lines[i] ?? "");
  }
  if (end < 0) return null;
  let name: string | undefined, description: string | undefined;
  for (let i = 0; i < fm.length; i++) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(fm[i] ?? "");
    if (!m) continue;
    const key = m[1], raw = m[2] ?? "";
    if (key === "name") name = sanitize(unquote(raw));
    if (key === "description") {
      if (raw.trim() === "|" || raw.trim() === ">") {
        const block: string[] = [];
        for (let j = i + 1; j < fm.length; j++) {
          if (/^[A-Za-z0-9_-]+:\s*/.test(fm[j] ?? "")) break;
          block.push((fm[j] ?? "").replace(/^\s{2}/, ""));
        }
        description = sanitize(block.join(" "));
      } else description = sanitize(unquote(raw));
    }
  }
  return { name, description, body: lines.slice(end + 1).join("\n") };
}

// ---------- text utils ----------
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}
function normalizeWords(s: string): string {
  return s.toLowerCase().replace(/[`"'’().,;:!?/\\[\]{}_-]+/g, " ").replace(/\s+/g, " ").trim();
}
function wordSet(s: string): Set<string> { return new Set(normalizeWords(s).split(" ").filter((w) => w.length >= 2)); }
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
function tokenCost(text: string): number { return Math.ceil(Buffer.byteLength(text, "utf8") / 4); }
function fmtNum(n: number): string { return Math.round(n).toLocaleString("en-US"); }
function fmtPct(n: number): string { return `${Math.round(n * 100)}%`; }
const EMPTY_HASH = fnv1a("");

// ---------- classification ----------
function classify(file: string, realPath: string): Scope {
  const p = file.split(path.sep).join("/");
  const rp = realPath.split(path.sep).join("/");
  if (/\/upstream\/SKILL\.md$/.test(p)) return "upstream";
  if (p.includes("/plugins/cache/")) {
    if (p.includes("/.claude/skills/")) return "plugin-internal";
    return "plugin-cache";
  }
  if (p.includes("/plugins/marketplaces/")) return "marketplace";
  const personalRoots = [
    path.join(home, ".claude/skills"),
    path.join(home, ".cursor/skills"),
    path.join(home, ".pi/agent/skills"),
  ].map((r) => r.split(path.sep).join("/"));
  for (const personalRoot of personalRoots) {
    if (p.startsWith(personalRoot + "/")) {
      return rp.includes("/.agents/skills/") ? "personal-link" : "personal";
    }
  }
  if (rp.includes("/.agents/skills/")) return "personal-link";
  return "project";
}
function pluginMeta(file: string): { plugin: string | null; marketplace: string | null; version: string | null } {
  const parts = file.split(path.sep);
  const ci = parts.indexOf("cache");
  if (ci >= 0 && parts[ci + 1] && parts[ci + 2] && parts[ci + 3]) {
    return { marketplace: parts[ci + 1]!, plugin: parts[ci + 2]!, version: parts[ci + 3]! };
  }
  const mi = parts.indexOf("marketplaces");
  if (mi >= 0) {
    const mp = parts[mi + 1] ?? null;
    let plugin: string | null = null;
    const nxt = parts[mi + 2];
    if ((nxt === "plugins" || nxt === "external_plugins") && parts[mi + 3]) plugin = parts[mi + 3]!;
    return { marketplace: mp, plugin, version: null };
  }
  return { plugin: null, marketplace: null, version: null };
}

function loadClaudeActivePaths(): string[] {
  const file = path.join(home, ".claude/plugins/installed_plugins.json");
  if (!exists(file)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as { plugins?: Record<string, unknown> };
    const out: string[] = [];
    for (const installs of Object.values(data.plugins ?? {})) {
      if (!Array.isArray(installs)) continue;
      for (const inst of installs) {
        const ip = (inst as { installPath?: unknown }).installPath;
        if (typeof ip === "string") out.push(realpathSafe(ip));
      }
    }
    return out;
  } catch { return []; }
}

function loadCursorActiveCachePaths(): string[] {
  const cacheRoot = path.join(home, ".cursor/plugins/cache");
  if (!exists(cacheRoot)) return [];
  const latestByKey = new Map<string, { path: string; mtime: number }>();
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(cacheRoot, { withFileTypes: true }); } catch { return []; }
  for (const marketplace of entries) {
    if (!marketplace.isDirectory()) continue;
    const marketplaceDir = path.join(cacheRoot, marketplace.name);
    let plugins: fs.Dirent[];
    try { plugins = fs.readdirSync(marketplaceDir, { withFileTypes: true }); } catch { continue; }
    for (const plugin of plugins) {
      if (!plugin.isDirectory()) continue;
      const pluginDir = path.join(marketplaceDir, plugin.name);
      let versions: fs.Dirent[];
      try { versions = fs.readdirSync(pluginDir, { withFileTypes: true }); } catch { continue; }
      for (const version of versions) {
        if (!version.isDirectory()) continue;
        const versionDir = path.join(pluginDir, version.name);
        const key = `${marketplace.name}/${plugin.name}`;
        let mtime = 0;
        try { mtime = fs.statSync(versionDir).mtimeMs; } catch { continue; }
        const cur = latestByKey.get(key);
        if (!cur || mtime >= cur.mtime) latestByKey.set(key, { path: realpathSafe(versionDir), mtime });
      }
    }
  }
  return [...latestByKey.values()].map((x) => x.path);
}

function loadActivePaths(): string[] {
  const out = new Set<string>([...loadClaudeActivePaths(), ...loadCursorActiveCachePaths()]);
  return [...out];
}

function computeActive(skill: Skill, activePaths: string[]): boolean {
  switch (skill.scope) {
    case "upstream": case "plugin-internal": case "marketplace": return false;
    case "personal": case "personal-link": case "project": return true;
    case "plugin-cache":
      return activePaths.some((ip) => skill.realPath === ip || skill.realPath.startsWith(ip + path.sep));
  }
  return false;
}

// ---------- discovery ----------
function discoverRoots(): string[] {
  const candidates = [
    path.join(home, ".agents/skills"),
    path.join(home, ".cursor/skills"),
    path.join(home, ".pi/agent/skills"),
    path.join(home, ".cursor/plugins/cache"),
    path.join(home, ".claude/skills"),
    path.join(home, ".claude/.agents/skills"),
    path.join(home, ".claude/plugins/cache"),
    path.join(home, ".claude/plugins/marketplaces"),
    ...extraRoots,
  ];
  const byReal = new Map<string, string>();
  for (const r of candidates) {
    if (!exists(r)) continue;
    const real = realpathSafe(r);
    const cur = byReal.get(real);
    if (!cur || r.length < cur.length) byReal.set(real, r);
  }
  return [...byReal.values()];
}

function scopeRank(s: Scope): number {
  return { personal: 0, project: 0, "personal-link": 1, "plugin-cache": 2, marketplace: 3, "plugin-internal": 4, upstream: 5 }[s];
}
function preferDisplay(a: Skill, b: Skill): Skill {
  if (a.active !== b.active) return a.active ? a : b;
  const r = scopeRank(a.scope) - scopeRank(b.scope);
  if (r !== 0) return r < 0 ? a : b;
  return a.path.length <= b.path.length ? a : b;
}

function discoverSkills(activePaths: string[]): Skill[] {
  const byReal = new Map<string, Skill>();
  for (const root of discoverRoots()) {
    for (const file of walkFiles(root, (f) => path.basename(f) === "SKILL.md")) {
      const parsed = parseFrontmatter(file);
      if (!parsed) continue;
      const realPath = realpathSafe(file);
      const baseName = parsed.name || path.basename(path.dirname(file));
      const { plugin, marketplace, version } = pluginMeta(file);
      const name = plugin ? `${plugin}:${baseName}` : baseName;
      const description = parsed.description ?? "";
      const rendered = description ? `- ${name}: ${description}` : `- ${name}:`;
      const bodyKey = normalizeWords(parsed.body);
      const skill: Skill = {
        name, baseName, description, path: file, realPath, root,
        scope: classify(file, realPath), plugin, marketplace, version, active: false,
        descChars: [...description].length,
        lineBytes: Buffer.byteLength(`${rendered}\n`, "utf8"),
        tokenCost: tokenCost(`${rendered}\n`),
        bodyHash: fnv1a(bodyKey), bodyKey, descKey: normalizeWords(description),
      };
      skill.active = computeActive(skill, activePaths);
      const existing = byReal.get(realPath);
      byReal.set(realPath, existing ? preferDisplay(existing, skill) : skill);
    }
  }
  return [...byReal.values()];
}

function discoverSubagents(): Subagent[] {
  if (noAgents) return [];
  const root = path.join(home, ".claude/agents");
  const out: Subagent[] = [];
  const seen = new Set<string>();
  for (const file of walkFiles(root, (f) => f.endsWith(".md") && path.basename(f) !== "README.md")) {
    const parsed = parseFrontmatter(file);
    if (!parsed || (!parsed.name && !parsed.description)) continue;
    const name = parsed.name || path.basename(file, ".md");
    if (seen.has(name)) continue;
    seen.add(name);
    const description = parsed.description ?? "";
    const rendered = `- ${name}: ${description}`;
    out.push({ name, description, path: file, descChars: [...description].length, tokenCost: tokenCost(`${rendered}\n`) });
  }
  return out;
}

// ---------- usage ----------
function recentLogFiles(): string[] {
  if (noLogs) return [];
  const root = path.join(home, ".claude/projects");
  const files: string[] = [];
  for (const f of walkFiles(root, (x) => x.endsWith(".jsonl"))) {
    try { if (fs.statSync(f).mtimeMs >= cutoffMs) files.push(f); } catch {}
  }
  return files;
}

function countTokens(values: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

function scanUsage(skills: Skill[], logFiles: string[]): Map<string, Usage> {
  const aliases = new Map<string, string[]>();
  for (const s of skills) {
    const set = new Set([s.name, s.baseName, s.name.split(":").at(-1) ?? s.name].map((x) => x.toLowerCase()));
    aliases.set(s.name, [...set]);
  }
  const usage = new Map<string, Usage>();
  for (const s of skills) usage.set(s.name, { skillTool: 0, command: 0, fileRead: 0, mention: 0 });
  let consumed = 0;
  for (const file of logFiles) {
    let text = "";
    try {
      const st = fs.statSync(file);
      if (st.size > 150 * 1024 * 1024) continue;
      if (consumed + st.size > maxLogBytes) break;
      consumed += st.size;
      text = fs.readFileSync(file, "utf8");
    } catch { continue; }
    // Skill tool_use: {"name":"Skill", ... "skill":"<name>"} (handles raw and escaped JSON)
    const skillTool = countTokens(
      [...text.matchAll(/"name"\s*:\s*\\?"Skill\\?"[\s\S]{0,200}?\\?"(?:skill|command|name)\\?"\s*:\s*\\?"([^"\\]+)\\?"/g)]
        .map((m) => (m[1] ?? "").toLowerCase())
    );
    // Slash/skill command markers
    const command = countTokens(
      [...text.matchAll(/<command-name>\/?([A-Za-z0-9_:-]+)<\/command-name>/g)].map((m) => (m[1] ?? "").toLowerCase())
    );
    // SKILL.md reads
    const fileRead = countTokens(
      [...text.matchAll(/skills\/([A-Za-z0-9_-]+)\/SKILL\.md/g)].map((m) => (m[1] ?? "").toLowerCase())
    );
    // Weak mention signal
    const mention = countTokens(
      [...text.matchAll(/\b(?:use|using|invoke|run|load|read)\s+`?\/?\$?([A-Za-z][A-Za-z0-9_:-]{2,60})`?/gi)]
        .map((m) => (m[1] ?? "").toLowerCase())
    );
    for (const [name, names] of aliases) {
      const u = usage.get(name)!;
      for (const c of names) {
        u.skillTool += skillTool.get(c) ?? 0;
        u.command += command.get(c) ?? 0;
        u.fileRead += fileRead.get(c) ?? 0;
        u.mention += mention.get(c) ?? 0;
      }
    }
  }
  return usage;
}
// Count only explicit invocations as "usage". mention/fileRead are noisy (a session's own
// skill list in system-reminders pollutes them), so they never decide unused status — they
// are reported as weak reference signals only.
function invocationCount(u: Usage | undefined): number { return u ? u.skillTool + u.command : 0; }
function weakRefs(u: Usage | undefined): number { return u ? u.fileRead + u.mention : 0; }

// ---------- description suggestion ----------
// For long descriptions, the usual fix is to keep the first sentence and drop trigger-word
// enumerations. Rule-based paraphrasing risks misrepresenting the skill, so we just propose
// keeping the factual first sentence.
function suggestDescription(skill: Skill): string {
  // sentence terminators incl. full-width CJK punctuation for non-English descriptions
  const m = skill.description.match(/^.*?[.!?\u3002\uff01\uff1f](?=\s|$)/);
  const first = (m ? m[0] : skill.description).trim();
  if (first.length > 0 && first.length < skill.description.length) return first;
  return skill.description.slice(0, 100).trim() + "…";
}

// ---------- grouping ----------
function groupBy<T>(items: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) { const k = key(it); m.set(k, [...(m.get(k) ?? []), it]); }
  return m;
}

// ---------- render ----------
function render(all: Skill[], usage: Map<string, Usage>, subagents: Subagent[], logFiles: string[]): string {
  const active = all.filter((s) => s.active);
  const considered = includeDisabled ? all : active;
  const totalTok = active.reduce((s, x) => s + x.tokenCost, 0);
  const subTok = subagents.reduce((s, x) => s + x.tokenCost, 0);
  const out: string[] = [];
  const push = (...l: string[]) => out.push(...l);

  push("# Skill Cleaner Report", "");
  push(`generated: ${new Date().toISOString()}`);
  push(`months: ${months}`);
  push(`skills: ${all.length} discovered, ${active.length} active (loaded)`);
  push(`subagents: ${subagents.length}`);
  push(`active_skill_tokens (approx): ${fmtNum(totalTok)}  [rule: ceil(utf8_bytes/4) of "- name: description"]`);
  if (subagents.length) push(`subagent_tokens (approx): ${fmtNum(subTok)}`);
  push(`log_files_scanned: ${logFiles.length}`, "");

  if (showBudget) {
    const budget = Math.floor(contextTokens * (budgetPercent / 100));
    push("## Reference Budget (approx, NOT authoritative)", "");
    push(`context_tokens: ${fmtNum(contextTokens)}  (override with --context-tokens)`);
    push(`${budgetPercent}%_budget: ${fmtNum(budget)}`);
    push(`active_skill_tokens / budget: ${fmtPct(totalTok / Math.max(1, budget))}`, "");
  }

  push(`## Token Cost Ranking (top ${topN}, active skills)`, "");
  const ranked = [...active].sort((a, b) => b.tokenCost - a.tokenCost).slice(0, topN);
  for (const s of ranked) push(`- ~${String(s.tokenCost).padStart(4)} tok  ${s.name}  (desc ${s.descChars} chars, ${s.scope})`);
  if (ranked.length === 0) push("- none");
  push("");

  push("## Description Candidates (long descriptions)", "");
  const longDesc = considered.filter((s) => s.descChars >= 110).sort((a, b) => b.descChars - a.descChars).slice(0, 30);
  for (const s of longDesc) {
    push(`- ${s.name}  (${s.descChars} chars, ~${s.tokenCost} tok)`);
    push(`  path: ${s.path}`);
    push(`  current: ${s.description}`);
    push(`  shorten → keep 1st sentence: ${suggestDescription(s)}`);
  }
  if (longDesc.length === 0) push("- none");
  push("");

  push("## Outdated Plugin Versions (active version exists elsewhere)", "");
  const versioned = all.filter((s) => s.scope === "plugin-cache" && s.plugin);
  const byPlugSkill = [...groupBy(versioned, (s) => `${s.marketplace}/${s.plugin}/${s.baseName}`).entries()]
    .filter(([, list]) => list.some((x) => x.active) && list.some((x) => !x.active));
  for (const [key, list] of byPlugSkill.slice(0, 60)) {
    const keep = list.find((x) => x.active)!;
    push(`- ${key}`);
    push(`  keep:   v${keep.version}  ${keep.path}`);
    for (const s of list.filter((x) => !x.active)) push(`  delete: v${s.version}  ${s.path}`);
  }
  if (byPlugSkill.length === 0) push("- none");
  push("");

  push("## Duplicate Names (across roots)", "");
  const byName = [...groupBy(considered, (s) => s.baseName.toLowerCase()).entries()].filter(([, l]) => l.length > 1);
  for (const [base, list] of byName.slice(0, 40)) {
    push(`- ${base}`);
    for (const s of list) push(`  - ${s.active ? "[active]" : "[      ]"} ${s.scope}: ${s.path}`);
  }
  if (byName.length === 0) push("- none");
  push("");

  push("## Duplicate Bodies (near-identical content)", "");
  const byBody = [...groupBy(considered, (s) => s.bodyHash).entries()].filter(([h, l]) => h !== EMPTY_HASH && l.length > 1);
  for (const [, list] of byBody.slice(0, 30)) {
    push(`- ${[...new Set(list.map((s) => s.name))].join(", ")}`);
    for (const s of list) push(`  - ${s.active ? "[active]" : "[      ]"} ${s.scope}: ${s.path}`);
  }
  if (byBody.length === 0) push("- none");
  push("");

  if (!noLogs) {
    push(`## Unused Candidates (no explicit invocation in last ${months} months)`, "");
    push("(no Skill-tool call / slash-command; refs = weak signals, may still auto-trigger)", "");
    const unused = active.filter((s) => invocationCount(usage.get(s.name)) === 0)
      .sort((a, b) => a.scope.localeCompare(b.scope) || a.name.localeCompare(b.name)).slice(0, 80);
    for (const s of unused) push(`- ${s.name}  (${s.scope})  [refs ${weakRefs(usage.get(s.name))}]  ${s.path}`);
    if (unused.length === 0) push("- none");
    push("");
  }

  if (subagents.length) {
    push(`## Subagents (reference, ~${fmtNum(subTok)} tok)`, "");
    for (const a of [...subagents].sort((x, y) => y.tokenCost - x.tokenCost).slice(0, topN))
      push(`- ~${String(a.tokenCost).padStart(4)} tok  ${a.name}  (desc ${a.descChars} chars)`);
    push("");
  }

  push("## Root Summary", "");
  for (const [root, list] of [...groupBy(all, (s) => s.root).entries()].sort((a, b) => b[1].length - a[1].length)) {
    const act = list.filter((s) => s.active).length;
    push(`- ${root}: ${list.length} skills (${act} active)`);
  }
  return out.join("\n");
}

// ---------- main ----------
const activePaths = loadActivePaths();
const skills = discoverSkills(activePaths);
const subagents = discoverSubagents();
const logFiles = recentLogFiles();
const usage = scanUsage(skills, logFiles);
const output = asJson
  ? JSON.stringify({ skills, subagents, usage: Object.fromEntries(usage), logFiles, activePaths }, null, 2)
  : render(skills, usage, subagents, logFiles);
console.log(output);
