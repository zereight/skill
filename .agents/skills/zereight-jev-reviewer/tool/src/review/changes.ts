import { changedFiles, nonSourcePaths } from "../adapters/git.ts";
import { neighborCollector, repoRootOf } from "../adapters/neighbors.ts";
import { buildManifest, zerAvailable } from "../adapters/verification.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MAX_PATCH_CHARS, TEST_FILE } from "../domain/config.ts";
import type { ReviewReport, Skipped } from "../domain/types.ts";
import { locateSignal, profileFile, screenFile } from "./judgments.ts";
import { type Log, runReview } from "./workflow.ts";

export async function runChangeReview(scope: string, log: Log): Promise<ReviewReport> {
  const repoRoot = repoRootOf(scope);
  const neighbors = neighborCollector(repoRoot);
  const report = await runReview(scope, log, {
    mode: "changes",
    subject: "changed source",
    context: "changed test",
    discover: (target) => {
      const changed = changedFiles(target);
      const contextFiles = changed.filter((file) => TEST_FILE.test(file.path));
      const candidates = changed.filter((file) => !TEST_FILE.test(file.path));
      const skipped: Skipped[] = [
        ...candidates
          .filter((file) => file.patch.length > MAX_PATCH_CHARS)
          .map((file) => ({ file: file.path, reason: "patch exceeds Jev 32k-token context (" + file.patch.length + " chars)" })),
        ...nonSourcePaths(target).map((path) => ({ file: path, reason: "not JS/TS, Jev does not screen it" })),
      ];
      return {
        files: candidates.filter((file) => file.patch.length <= MAX_PATCH_CHARS),
        contextFiles,
        skipped,
      };
    },
    screen: screenFile,
    profile: profileFile,
    locate: locateSignal,
    neighbors: (file) => neighbors(file.path),
  });

  const base = process.env.JEV_BASE ?? null;
  const notes: string[] = [];
  let scopes: Record<string, boolean> | undefined;
  if (!base) notes.push("no JEV_BASE: line checks use file existence only, scopes unavailable");
  else if (!zerAvailable()) notes.push("zer CLI not found: line checks use file existence only, scopes unavailable");
  else {
    try {
      scopes = buildManifest(repoRoot, base, join(mkdtempSync(join(tmpdir(), "jev-scope-")), "manifest.json")).scopes;
    } catch (error) {
      notes.push("zer manifest failed: " + (error instanceof Error ? error.message : String(error)).slice(0, 160));
    }
  }
  return { ...report, base, repoRoot, scopes, notes };
}
