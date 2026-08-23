import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { startProxy, isProxyRunning } from "./proxy.js";
import { AGY_MODELS } from "./config.js";
import { isAuthenticated } from "./oauth.js";

export default async function (pi: ExtensionAPI) {
  // Register the provider
  pi.registerProvider("google-antigravity", {
    name: "Google Antigravity (Local)",
    baseUrl: "http://127.0.0.1:8317/v1",
    apiKey: "pi-agy-internal",
    api: "openai-completions",
    models: AGY_MODELS.map(m => ({
      id: m.id,
      name: m.name,
      reasoning: m.id.includes("thinking"),
      input: ["text", "image"],
      contextWindow: 200000,
      maxTokens: m.id.includes("thinking") ? 16384 : 8192,
      compat: { cacheControlFormat: "anthropic" }
    }))
  });

  // Auto-start the proxy if authenticated
  if (isAuthenticated()) {
    const running = await isProxyRunning();
    if (!running) {
      console.log("Starting Antigravity proxy...");
      const started = await startProxy({ silent: true });
      if (started) {
        console.log("Antigravity proxy started on http://127.0.0.1:8317");
      } else {
        console.error("Failed to start Antigravity proxy.");
      }
    } else {
      console.log("Antigravity proxy is already running.");
    }
  } else {
    console.warn("Antigravity extension is loaded, but not authenticated.");
    console.warn("Run: npx tsx .pi/agent/extensions/antigravity/login.ts to login.");
  }
}
