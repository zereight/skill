// Git adapter: discovers changed source files under a scope and returns each
// one with a unified diff. Untracked files are rendered as all-additions.
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
export function changedFiles(scope: string): ChangedFile[] {
  const realScope = realpathSync(scope);
  const repoRoot = git(realScope, ["rev-parse", "--show-toplevel"]).trim();
  const relativeScope = relative(repoRoot, realScope) || ".";
  const base = process.env.JEV_BASE;
  const range = base ? base + "...HEAD" : "HEAD";

  const tracked = lines(
    git(repoRoot, [
      "diff",
      range,
      "--name-only",
      "--diff-filter=ACMRTUXB",
      "--",
      relativeScope,
    ]),
  );
  const untracked = base
    ? []
    : lines(git(repoRoot, ["ls-files", "--others", "--exclude-standard", "--", relativeScope]));

  const untrackedSet = new Set(untracked);
  const paths = [...new Set([...tracked, ...untracked])].filter((path) =>
    SOURCE_FILE.test(path),
  );

  return paths.map((path) => ({
    path,
    patch: untrackedSet.has(path)
      ? patchForNewFile(readFileSync(resolve(repoRoot, path), "utf8"))
      : git(repoRoot, ["diff", range, "--unified=3", "--", path]),
  }));
}
