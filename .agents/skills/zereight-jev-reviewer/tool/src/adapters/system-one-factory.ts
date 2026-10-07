// Picks the judgment backend. JEV_PROVIDER=jev (default) | cursor.
import { CursorSystemOneClient } from "./cursor-system-one.ts";
import { JevSystemOneClient } from "./jev-system-one.ts";
import type { SystemOneClient } from "./system-one.ts";

export function createSystemOneClient(): SystemOneClient {
  const provider = process.env.JEV_PROVIDER ?? "jev";
  if (provider === "jev") return new JevSystemOneClient();
  if (provider === "cursor") return new CursorSystemOneClient();
  throw new Error("Unknown JEV_PROVIDER: " + provider + " (use jev or cursor)");
}
