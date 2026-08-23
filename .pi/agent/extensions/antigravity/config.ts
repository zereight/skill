/**
 * Antigravity OAuth Configuration
 *
 * Antigravity uses Google OAuth with a specific client ID that grants access
 * to Google's cloudcode/Gemini APIs via the cloudcode-pa.googleapis.com endpoint.
 *
 * Based on CLIProxyAPI sdk/auth/antigravity.go
 */

export const AGY_CONFIG = {
  displayName: "Antigravity",

  // Standard Google OAuth endpoints
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userInfoUrl: "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",

  // Callback server config
  callbackPort: 51121,
  callbackPath: "/oauth-callback",

  // Scopes required for Antigravity/Gemini access
  scopes: [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/cclog",
    "https://www.googleapis.com/auth/experimentsandconfigs",
  ],

  // API endpoint for Gemini/cloudcode access
  apiEndpoint: "https://cloudcode-pa.googleapis.com",
  apiVersion: "v1internal",
};

/**
 * Available models from Antigravity
 * Based on CCS model-catalog.ts
 */
export const AGY_MODELS = [
  {
    id: "gemini-claude-opus-4-5-thinking",
    name: "Claude Opus 4.5 Thinking",
    description: "Most capable, extended thinking",
  },
  {
    id: "gemini-claude-sonnet-4-5-thinking",
    name: "Claude Sonnet 4.5 Thinking",
    description: "Balanced with extended thinking",
  },
  {
    id: "gemini-claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    description: "Fast and capable",
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    description: "Google latest model via Antigravity",
  },
];

export const DEFAULT_MODEL = "gemini-claude-opus-4-5-thinking";
