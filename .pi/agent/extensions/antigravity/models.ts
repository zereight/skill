/**
 * Pi models.json Configuration
 *
 * Since Antigravity uses a custom Gemini-like API format (cloudcode-pa.googleapis.com),
 * we need CLIProxyAPI to translate between Anthropic/OpenAI format and Antigravity.
 *
 * This module configures Pi to connect to the local CLIProxyAPI server.
 */

import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";
import { AGY_MODELS, DEFAULT_MODEL } from "./config.js";
import { loadCredentials } from "./oauth.js";

// CLIProxyAPI runs on this port
const CLIPROXY_PORT = 8317;
const CLIPROXY_API_KEY = "pi-agy-internal";

/**
 * Pi models.json schema
 */
interface PiModelDefinition {
  id: string;
  name: string;
  reasoning: boolean;
  input: ("text" | "image")[];
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  contextWindow: number;
  maxTokens: number;
}

interface PiProviderConfig {
  baseUrl: string;
  apiKey: string;
  api?: "openai-completions" | "openai-responses" | "anthropic-messages" | "google-generative-ai";
  headers?: Record<string, string>;
  authHeader?: boolean;
  models: PiModelDefinition[];
}

interface PiModelsConfig {
  providers: Record<string, PiProviderConfig>;
}

/**
 * Get Pi's models.json path
 */
export function getPiModelsPath(): string {
  const envDir = process.env.PI_CODING_AGENT_DIR;
  if (envDir) {
    return path.join(envDir, "models.json");
  }
  return path.join(homedir(), ".pi", "agent", "models.json");
}

/**
 * Load existing Pi models.json or create empty config
 */
export function loadPiModelsConfig(): PiModelsConfig {
  const modelsPath = getPiModelsPath();

  if (fs.existsSync(modelsPath)) {
    try {
      return JSON.parse(fs.readFileSync(modelsPath, "utf-8"));
    } catch {
      console.warn(`Warning: Could not parse ${modelsPath}, starting fresh`);
    }
  }

  return { providers: {} };
}

/**
 * Save Pi models.json
 */
export function savePiModelsConfig(config: PiModelsConfig): void {
  const modelsPath = getPiModelsPath();
  const dir = path.dirname(modelsPath);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(modelsPath, JSON.stringify(config, null, 2) + "\n");
  console.log(`Wrote ${modelsPath}`);
}

/**
 * Generate Antigravity provider config for Pi
 *
 * Pi connects to local CLIProxyAPI server which handles:
 * 1. Token refresh
 * 2. API translation (Anthropic -> Antigravity format)
 * 3. Actual API calls to cloudcode-pa.googleapis.com
 */
export function generateAntigravityProvider(): PiProviderConfig | null {
  const creds = loadCredentials();

  if (!creds || !creds.access_token) {
    console.error("No Antigravity credentials found. Run 'pi-agy login' first.");
    return null;
  }

  // Build model definitions for Pi
  const models: PiModelDefinition[] = AGY_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    reasoning: m.id.includes("thinking"),
    input: ["text", "image"] as ("text" | "image")[],
    cost: {
      // Antigravity is subscription-based
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    },
    contextWindow: 200000,
    maxTokens: 64000,
  }));

  // Pi connects to local CLIProxyAPI which proxies to Antigravity
  // CLIProxyAPI exposes Anthropic-compatible API on /api/provider/agy
  return {
    baseUrl: `http://127.0.0.1:${CLIPROXY_PORT}/api/provider/agy`,
    apiKey: CLIPROXY_API_KEY,
    api: "anthropic-messages",
    authHeader: true,
    models,
  };
}

/**
 * Add or update Antigravity provider in Pi's models.json
 */
export function configureAntigravityForPi(): boolean {
  const provider = generateAntigravityProvider();
  if (!provider) {
    return false;
  }

  const config = loadPiModelsConfig();
  config.providers["antigravity"] = provider;
  savePiModelsConfig(config);

  console.log(`\nConfigured ${AGY_MODELS.length} Antigravity models for Pi:`);
  for (const m of AGY_MODELS) {
    const isDefault = m.id === DEFAULT_MODEL ? " (default)" : "";
    console.log(`  - ${m.name}${isDefault}`);
  }

  console.log(`\nPi will connect to CLIProxyAPI at http://127.0.0.1:${CLIPROXY_PORT}`);
  console.log("Make sure CLIProxyAPI is running (pi-agy proxy start)");

  return true;
}

/**
 * Remove Antigravity provider from Pi's models.json
 */
export function removeAntigravityFromPi(): boolean {
  const config = loadPiModelsConfig();

  if (!config.providers["antigravity"]) {
    console.log("Antigravity is not configured in Pi.");
    return false;
  }

  delete config.providers["antigravity"];
  savePiModelsConfig(config);

  console.log("Removed Antigravity from Pi models.json");
  return true;
}
