// Lens adapter: loads bug-pattern files from tool/lenses and matches them to a changed file.
// A lens only decides which extra Jev question a file gets; the rules for judging the finding
// live in the zereight-review reference named by `ref`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_LENSES_PER_FILE } from "../domain/config.ts";
import type { Lens } from "../domain/types.ts";

const LENS_DIR = join(import.meta.dirname, "..", "..", "lenses");

let cache: Lens[] | undefined;

export function loadLenses(directory = LENS_DIR): Lens[] {
  if (directory === LENS_DIR && cache) return cache;
  let names: string[] = [];
  try {
    names = readdirSync(directory).filter((name) => name.endsWith(".md")).sort();
  } catch {
    return [];
  }
  const lenses = names.map((name) => parseLens(readFileSync(join(directory, name), "utf8"), name));
  if (directory === LENS_DIR) cache = lenses;
  return lenses;
}

// Frontmatter lines are `key: value`; a value is JSON when it parses, otherwise raw text.
export function parseLens(text: string, source: string): Lens {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!match) throw new Error("lens " + source + ": missing frontmatter");
  const fields: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const index = line.indexOf(":");
    if (index < 0 || line.trimStart().startsWith("#")) continue;
    const raw = line.slice(index + 1).trim();
    let value: unknown = raw;
    try {
      value = JSON.parse(raw);
    } catch {
      // keep raw text
    }
    fields[line.slice(0, index).trim()] = value;
  }
  const text_ = (key: string): string => {
    const value = fields[key];
    if (typeof value !== "string" || !value) throw new Error("lens " + source + ": missing " + key);
    return value;
  };
  const files = Array.isArray(fields.files) ? fields.files.filter((item): item is string => typeof item === "string") : [];
  const hunkRegex = typeof fields.hunk_regex === "string" ? new RegExp(fields.hunk_regex, "i") : null;
  return {
    name: text_("name"),
    files,
    hunkRegex,
    description: text_("description"),
    trueWhen: text_("true"),
    falseWhen: text_("false"),
    ref: text_("ref"),
  };
}

// Added and removed lines of a unified diff, without file headers.
export function changedText(patch: string): string {
  return patch
    .split("\n")
    .filter((line) => (line.startsWith("+") || line.startsWith("-")) && !line.startsWith("+++") && !line.startsWith("---"))
    .join("\n");
}

export function matchLenses(path: string, patch: string, lenses = loadLenses()): Lens[] {
  const changed = changedText(patch);
  const matched = lenses.filter(
    (lens) =>
      (lens.files.length === 0 || lens.files.some((glob) => globToRegex(glob).test(path))) &&
      (lens.hunkRegex === null || lens.hunkRegex.test(changed)),
  );
  // A lens with a hunk pattern is more specific than a file-only lens.
  return matched
    .sort((a, b) => Number(b.hunkRegex !== null) - Number(a.hunkRegex !== null) || a.name.localeCompare(b.name))
    .slice(0, MAX_LENSES_PER_FILE);
}

export function globToRegex(glob: string): RegExp {
  let source = "";
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];
    if (char === "*") {
      if (glob[index + 1] === "*") {
        index++;
        if (glob[index + 1] === "/") {
          index++;
          source += "(?:.*/)?";
        } else source += ".*";
      } else source += "[^/]*";
    } else if (char === "?") source += "[^/]";
    else source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + source + "$");
}
