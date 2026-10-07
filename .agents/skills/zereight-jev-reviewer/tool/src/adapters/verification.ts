// Verification adapter: line checks through the `zer` CLI (zereight-review helpers) and plain file checks.
// `zer` reports failures in its JSON, not its exit code, so results are read from the output.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export type LineVerdict = { id: string; verdict: string; reason?: string };
export type ManifestInfo = { scopes: Record<string, boolean> };

const ZER_TIMEOUT_MS = 60_000;

function zer(args: string[]): string {
  return execFileSync("zer", args, { encoding: "utf8", timeout: ZER_TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 });
}

export function zerAvailable(): boolean {
  try {
    zer(["--help"]);
    return true;
  } catch {
    return false;
  }
}

// Builds the manifest at \`out\` and returns which review scopes the diff puts in play.
export function buildManifest(repoRoot: string, base: string, out: string): ManifestInfo {
  zer(["manifest", "--repo", repoRoot, "--base", base, "--out", out]);
  const manifest = JSON.parse(readFileSync(out, "utf8")) as { scopes?: Record<string, { in_scope?: boolean }> };
  return {
    scopes: Object.fromEntries(Object.entries(manifest.scopes ?? {}).map(([name, scope]) => [name, scope.in_scope === true])),
  };
}

// Checks each citation against the diff hunks of repoRoot...HEAD. Throws when zer cannot run.
export function verifyLines(repoRoot: string, base: string, items: Array<{ id: string; file: string; line: number }>): LineVerdict[] {
  const directory = mkdtempSync(join(tmpdir(), "jev-zer-"));
  try {
    const manifest = join(directory, "manifest.json");
    const findings = join(directory, "findings.json");
    buildManifest(repoRoot, base, manifest);
    writeFileSync(findings, JSON.stringify(items));
    const parsed = JSON.parse(zer(["verify", "--manifest", manifest, "--findings", findings])) as { results: LineVerdict[] };
    return parsed.results;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// Line count of a repo file, or null when it is missing or not a regular text file.
export function lineCount(repoRoot: string, path: string): number | null {
  const full = resolve(repoRoot, path);
  if (!full.startsWith(resolve(repoRoot)) || !existsSync(full)) return null;
  try {
    return readFileSync(full, "utf8").split("\n").length;
  } catch {
    return null;
  }
}
