// Git adapter: discovers changed files under a scope and returns each source file with a
// unified diff. Untracked files are rendered as all-additions.
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { relative, resolve } from "node:path";
import { SOURCE_FILE } from "../domain/config.ts";
import { patchForNewFile } from "../domain/patch.ts";
import type { ChangedFile } from "../domain/types.ts";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function lines(output: string): string[] {
  return output.split("\n").filter(Boolean);
}

// JEV_BASE=origin/develop reviews the branch as a PR (three-dot diff against
// the merge base, untracked files ignored). Unset reviews the working tree.
function changedPaths(scope: string) {
  const realScope = realpathSync(scope);
  const repoRoot = git(realScope, ["rev-parse", "--show-toplevel"]).trim();
  const relativeScope = relative(repoRoot, realScope) || ".";
  const base = process.env.JEV_BASE;
  const range = base ? base + "...HEAD" : "HEAD";

  const tracked = lines(
    git(repoRoot, ["diff", range, "--name-only", "--diff-filter=ACMRTUXB", "--", relativeScope]),
  );
  const untracked = base
    ? []
    : lines(git(repoRoot, ["ls-files", "--others", "--exclude-standard", "--", relativeScope]));
  return { repoRoot, range, untracked: new Set(untracked), paths: [...new Set([...tracked, ...untracked])] };
}

export function changedFiles(scope: string): ChangedFile[] {
  const { repoRoot, range, untracked, paths } = changedPaths(scope);
  return paths
    .filter((path) => SOURCE_FILE.test(path))
    .map((path) => ({
      path,
      patch: untracked.has(path)
        ? patchForNewFile(readFileSync(resolve(repoRoot, path), "utf8"))
        : git(repoRoot, ["diff", range, "--unified=3", "--", path]),
    }));
}

// Changed files Jev does not screen, so the report can say they were not looked at.
export function nonSourcePaths(scope: string): string[] {
  return changedPaths(scope).paths.filter((path) => !SOURCE_FILE.test(path));
}
