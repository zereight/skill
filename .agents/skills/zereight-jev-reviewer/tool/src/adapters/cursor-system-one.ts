// Cursor SDK stand-in for TypeSafe's `systemOne` endpoint (JEV_PROVIDER=cursor, default).
// Each request is one tool-less local agent run on the user's Cursor subscription.
// Cursor returns no logprobs, so yes/no probabilities are the model's stated `p_yes`.
import { readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Questions, SystemOneRequest, SystemOneResult } from "@typesafe-ai/sdk";
import {
  answersSchema,
  parseAnswers,
  recordRoutedModel,
  SYSTEM_PROMPT,
  sleep,
  toAnswers,
  type SystemOneClient,
} from "./system-one.ts";

const DEFAULT_MODEL = "glm-5p3-flash";
const MAX_ATTEMPTS = 3;
const RUN_TIMEOUT_MS = 180_000;
const PI_AUTH_FILE = join(homedir(), ".pi", "agent", "auth.json");
const PI_SDK_ENTRY = join(homedir(), ".pi", "agent", "npm", "node_modules", "@cursor", "sdk", "dist", "esm", "index.js");

const CALIBRATION = [
  "Respond with ONE JSON object only: no prose, no code fences, no tool use.",
  "The object must satisfy the JSON Schema below.",
  "p_yes must be calibrated: use the full 0 to 1 range, and keep values above 0.9 for cases where the patch states the defect outright.",
].join(" ");

type CursorRun = {
  status: string;
  result?: string;
  model?: { id: string };
  usage?: { inputTokens?: number; outputTokens?: number };
};
type CursorSdk = {
  Agent: { prompt(message: string, options: Record<string, unknown>): Promise<CursorRun> };
};

let sdkPromise: Promise<CursorSdk> | undefined;

// Prefer a project-installed @cursor/sdk, else reuse the copy Pi's pi-cursor-sdk ships.
function loadSdkAsync(): Promise<CursorSdk> {
  sdkPromise ??= (async () => {
    const specifier: string = "@cursor/sdk";
    try {
      return (await import(specifier)) as CursorSdk;
    } catch {
      const entry = process.env.JEV_CURSOR_SDK ?? PI_SDK_ENTRY;
      return (await import(pathToFileURL(entry).href)) as CursorSdk;
    }
  })();
  return sdkPromise;
}

function resolveApiKey(): string {
  const fromEnv = process.env.CURSOR_API_KEY;
  if (fromEnv) return fromEnv;
  try {
    const key = JSON.parse(readFileSync(PI_AUTH_FILE, "utf8"))?.cursor?.key;
    if (typeof key === "string" && key) return key;
  } catch {
    // fall through to the error below
  }
  throw new Error("No Cursor API key: set CURSOR_API_KEY or log in to the cursor provider in Pi");
}

// "reasoning_effort=low,fast=false" -> [{ id, value }]; parameter ids differ per model.
function parseModelParams(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((pair) => pair.split("=").map((part) => part.trim()))
    .filter(([id, value]) => id && value)
    .map(([id, value]) => ({ id, value }));
}

export class CursorSystemOneClient implements SystemOneClient {
  readonly model = (process.env.JEV_MODEL ?? DEFAULT_MODEL).replace(/^cursor\//, "");
  readonly #params = parseModelParams(process.env.JEV_MODEL_PARAMS);

  async systemOne<Q extends Questions>(request: SystemOneRequest<Q>): Promise<SystemOneResult<Q>> {
    const apiKey = resolveApiKey();
    const sdk = await loadSdkAsync();
    const model = (request.model ?? this.model).replace(/^cursor\//, "");
    const prompt = [
      SYSTEM_PROMPT,
      CALIBRATION,
      "JSON Schema:",
      JSON.stringify(answersSchema(request.questions)),
      "Input:",
      JSON.stringify({ state: request.state, questions: request.questions }),
    ].join("\n\n");

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const run = await withTimeout(
          sdk.Agent.prompt(prompt, {
            apiKey,
            model: { id: model, ...(this.#params.length ? { params: this.#params } : {}) },
            mode: "agent",
            tools: [],
            local: { cwd: tmpdir(), settingSources: [] },
          }),
          RUN_TIMEOUT_MS,
        );
        if (run.status !== "finished" || !run.result) throw new Error("Cursor run " + run.status + " without a result");
        const resolved = run.model?.id ?? model;
        recordRoutedModel(resolved);
        return {
          model: resolved,
          answers: toAnswers(request.questions, parseAnswers(run.result)),
          usage: { input_tokens: run.usage?.inputTokens ?? 0, output_tokens: run.usage?.outputTokens ?? 0 },
        };
      } catch (error) {
        lastError = error;
        await sleep(500 * 2 ** (attempt - 1));
      }
    }
    throw lastError;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Cursor run timed out after " + ms + "ms")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
