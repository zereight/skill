// Neighbor adapter: finds the code around a changed file that its patch does
// not show. Importers (two hops; barrels are free), local imports, and sibling
// files feed the generative review step; nothing here calls a model.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, normalize, relative, resolve } from "node:path";
import {
  MAX_BARREL_DEPTH,
  MAX_IMPORTERS,
  MAX_SIBLINGS,
  SOURCE_FILE,
  TEST_FILE,
} from "../domain/config.ts";
import type { Neighbors } from "../domain/types.ts";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"];
const IMPORT_SPEC = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|^\s*import\s+)["']([^"']+)["']/gm;
const BARREL = /(?:^|\/)index\.[cm]?[jt]sx?$/;

// Workspace package name -> directory, so "@repo/x/a" resolves to the file.
type Packages = Map<string, string>;

export function repoRootOf(scope: string): string {
  return git(scope, ["rev-parse", "--show-toplevel"]).trim();
}

export function neighborCollector(repoRoot: string): (path: string) => Neighbors {
  const packages = workspacePackages(repoRoot);
  return (path) => collectNeighbors(repoRoot, packages, path);
}

function collectNeighbors(repoRoot: string, packages: Packages, path: string): Neighbors {
  const direct = importersThroughBarrels(repoRoot, packages, path);
  const seen = new Set([path, ...direct]);
  const transitive: string[] = [];
  for (const importer of direct) {
    for (const next of importersThroughBarrels(repoRoot, packages, importer)) {
      if (seen.has(next)) continue;
      seen.add(next);
      transitive.push(next);
    }
  }
  return {
    importers: rank(direct).slice(0, MAX_IMPORTERS),
    transitiveImporters: rank(transitive).slice(0, MAX_IMPORTERS),
    imports: localImportsOf(repoRoot, packages, path),
    siblings: siblingsOf(repoRoot, path),
  };
}

// Barrels only re-export, so the files behind them count as the same hop.
function importersThroughBarrels(repoRoot: string, packages: Packages, path: string): string[] {
  const found = new Set<string>();
  let frontier = [path];
  for (let depth = 0; depth <= MAX_BARREL_DEPTH && frontier.length > 0; depth++) {
    const barrels: string[] = [];
    for (const target of frontier) {
      for (const importer of importersOf(repoRoot, packages, target)) {
        if (importer === path || found.has(importer) || barrels.includes(importer)) continue;
        if (BARREL.test(importer)) barrels.push(importer);
        else found.add(importer);
      }
    }
    frontier = barrels;
  }
  return [...found];
}

function importersOf(repoRoot: string, packages: Packages, path: string): string[] {
  const last = basename(moduleKey(path));
  if (!last || last === ".") return [];
  const pattern = "[\"'][^\"']*" + escapeRegex(last) + "[\"']";
  let output = "";
  try {
    output = git(repoRoot, ["grep", "-l", "-I", "-E", "-e", pattern, "--", "*.ts", "*.tsx", "*.js", "*.jsx"]);
  } catch {
    // git grep exits 1 when nothing matches.
    return [];
  }
  return output
    .split("\n")
    .filter((candidate) => candidate && candidate !== path && SOURCE_FILE.test(candidate))
    .filter((candidate) =>
      importSpecs(repoRoot, candidate).some(
        (spec) => resolveSpec(repoRoot, packages, candidate, spec) === path,
      ),
    );
}

function localImportsOf(repoRoot: string, packages: Packages, path: string): string[] {
  const found = new Set<string>();
  for (const spec of importSpecs(repoRoot, path)) {
    const hit = resolveSpec(repoRoot, packages, path, spec);
    if (hit) found.add(hit);
  }
  return [...found].sort();
}

// Resolves relative and workspace-package specifiers to a repo file. External
// packages and unknown aliases resolve to null.
function resolveSpec(repoRoot: string, packages: Packages, importer: string, spec: string): string | null {
  if (spec.startsWith(".")) return firstExisting(repoRoot, normalize(join(dirname(importer), spec)));
  for (const [name, directory] of packages) {
    if (spec !== name && !spec.startsWith(name + "/")) continue;
    const rest = spec.slice(name.length + 1);
    return (
      firstExisting(repoRoot, join(directory, "src", rest)) ??
      firstExisting(repoRoot, join(directory, rest))
    );
  }
  return null;
}

function firstExisting(repoRoot: string, base: string): string | null {
  const candidates = [
    ...EXTENSIONS.map((extension) => base + extension),
    ...EXTENSIONS.map((extension) => join(base, "index" + extension)),
  ];
  return candidates.find((candidate) => existsSync(resolve(repoRoot, candidate))) ?? null;
}

function workspacePackages(repoRoot: string): Packages {
  const packages: Packages = new Map();
  const manifests = git(repoRoot, ["ls-files", "--", "*package.json"])
    .split("\n")
    .filter((path) => path.endsWith("package.json") && !path.includes("node_modules/"));
  for (const manifest of manifests) {
    try {
      const { name } = JSON.parse(readFileSync(resolve(repoRoot, manifest), "utf8")) as { name?: unknown };
      if (typeof name === "string" && name) packages.set(name, dirname(manifest));
    } catch {}
  }
  // Longest name first so "@repo/a-b" wins over "@repo/a".
  return new Map([...packages].sort((a, b) => b[0].length - a[0].length));
}

// The last path segment an import specifier ends with: the file name, or the
// directory for index files and the package for src/index.
function moduleKey(path: string): string {
  let key = path.replace(/\.[cm]?[jt]sx?$/, "");
  if (basename(key) === "index") key = dirname(key);
  if (basename(key) === "src") key = dirname(key);
  return key;
}

function importSpecs(repoRoot: string, path: string): string[] {
  try {
    const source = readFileSync(resolve(repoRoot, path), "utf8");
    return [...source.matchAll(IMPORT_SPEC)].map((match) => match[1]);
  } catch {
    return [];
  }
}

function siblingsOf(repoRoot: string, path: string): string[] {
  const directory = dirname(path);
  let entries: string[] = [];
  try {
    entries = readdirSync(resolve(repoRoot, directory));
  } catch {
    return [];
  }
  return entries
    .map((entry) => relative(repoRoot, resolve(repoRoot, directory, entry)))
    .filter((candidate) => candidate !== path && SOURCE_FILE.test(candidate))
    .sort()
    .slice(0, MAX_SIBLINGS);
}

// Production code first, then tests and stories.
function rank(paths: string[]): string[] {
  const weight = (path: string) => (TEST_FILE.test(path) || path.includes(".stories.") ? 1 : 0);
  return [...paths].sort((a, b) => weight(a) - weight(b) || a.localeCompare(b));
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}
