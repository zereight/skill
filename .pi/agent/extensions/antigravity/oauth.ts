/**
 * OAuth Handler for Antigravity
 *
 * Implements Google OAuth Authorization Code Flow with local callback server.
 * Based on CLIProxyAPI sdk/auth/antigravity.go
 */

import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { homedir } from "os";
import { AGY_CONFIG } from "./config.js";
import { getAntigravityCredentials } from "./credentials.js";

export interface OAuthCredentials {
  type: "antigravity";
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expired?: string;
  timestamp?: number;
  email?: string;
  project_id?: string;
}

/**
 * Get the storage directory for pi-agy credentials
 */
export function getStorageDir(): string {
  return path.join(homedir(), ".pi-agy");
}

/**
 * Get path to credentials file
 */
export function getCredentialsPath(): string {
  return path.join(getStorageDir(), "credentials.json");
}

/**
 * Check if we have valid credentials
 */
export function isAuthenticated(): boolean {
  const credsPath = getCredentialsPath();
  if (!fs.existsSync(credsPath)) {
    return false;
  }

  try {
    const creds: OAuthCredentials = JSON.parse(
      fs.readFileSync(credsPath, "utf-8")
    );
    if (!creds.access_token) return false;
    // Check expiry if we have timestamp and expires_in
    if (creds.timestamp && creds.expires_in) {
      const expiresAt = creds.timestamp + creds.expires_in * 1000;
      if (Date.now() > expiresAt) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Load stored credentials
 */
export function loadCredentials(): OAuthCredentials | null {
  const credsPath = getCredentialsPath();
  if (!fs.existsSync(credsPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(credsPath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Save credentials to disk
 */
export function saveCredentials(creds: OAuthCredentials): void {
  const dir = getStorageDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(getCredentialsPath(), JSON.stringify(creds, null, 2), {
    mode: 0o600,
  });
}

/**
 * Clear stored credentials
 */
export function clearCredentials(): void {
  const credsPath = getCredentialsPath();
  if (fs.existsSync(credsPath)) {
    fs.unlinkSync(credsPath);
  }
}

/**
 * Generate a random state parameter for OAuth
 */
function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Build the Google OAuth authorization URL
 */
function buildAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getAntigravityCredentials();
  const params = new URLSearchParams({
    access_type: "offline",
    client_id: clientId,
    prompt: "consent",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: AGY_CONFIG.scopes.join(" "),
    state: state,
  });
  return `${AGY_CONFIG.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<OAuthCredentials> {
  const { clientId, clientSecret } = getAntigravityCredentials();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(AGY_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const now = Date.now();

  return {
    type: "antigravity",
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    timestamp: now,
    expired: new Date(now + data.expires_in * 1000).toISOString(),
  };
}

/**
 * Fetch user info to get email
 */
async function fetchUserInfo(
  accessToken: string
): Promise<{ email?: string }> {
  try {
    const response = await fetch(AGY_CONFIG.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    return { email: data.email };
  } catch {
    return {};
  }
}

/**
 * Fetch project ID via loadCodeAssist API
 * Based on CLIProxyAPI's fetchAntigravityProjectID
 */
async function fetchProjectId(accessToken: string): Promise<string | null> {
  try {
    const endpoint = `${AGY_CONFIG.apiEndpoint}/${AGY_CONFIG.apiVersion}:loadCodeAssist`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "google-api-nodejs-client/9.15.1",
        "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
        "Client-Metadata": JSON.stringify({
          ideType: "IDE_UNSPECIFIED",
          platform: "PLATFORM_UNSPECIFIED",
          pluginType: "GEMINI",
        }),
      },
      body: JSON.stringify({
        metadata: {
          ideType: "IDE_UNSPECIFIED",
          platform: "PLATFORM_UNSPECIFIED",
          pluginType: "GEMINI",
        },
      }),
    });

    if (!response.ok) {
      console.warn(`Failed to fetch project ID: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Extract projectID from response
    if (typeof data.cloudaicompanionProject === "string") {
      return data.cloudaicompanionProject;
    }
    if (data.cloudaicompanionProject?.id) {
      return data.cloudaicompanionProject.id;
    }

    return null;
  } catch (err) {
    console.warn(`Failed to fetch project ID: ${err}`);
    return null;
  }
}

interface CallbackResult {
  code?: string;
  error?: string;
  state?: string;
}

/**
 * Start OAuth flow for Antigravity
 *
 * 1. Start local callback server on port 51121
 * 2. Open browser to Google OAuth
 * 3. Wait for callback with auth code
 * 4. Exchange code for tokens
 * 5. Fetch user info and project ID
 * 6. Save credentials
 */
export async function startOAuthFlow(): Promise<OAuthCredentials | null> {
  const state = generateState();
  const port = AGY_CONFIG.callbackPort;
  const redirectUri = `http://localhost:${port}${AGY_CONFIG.callbackPath}`;

  return new Promise((resolve) => {
    let resolved = false;

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);

      if (url.pathname === AGY_CONFIG.callbackPath) {
        const result: CallbackResult = {
          code: url.searchParams.get("code") || undefined,
          error: url.searchParams.get("error") || undefined,
          state: url.searchParams.get("state") || undefined,
        };

        if (result.error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>Authentication Failed</h1>
              <p>Error: ${result.error}</p>
              <p>You can close this window.</p>
            </body></html>
          `);
          server.close();
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
          return;
        }

        if (!result.code || result.state !== state) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>Invalid Callback</h1>
              <p>Missing or invalid parameters.</p>
            </body></html>
          `);
          server.close();
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
          return;
        }

        // Exchange code for tokens
        try {
          console.log("Exchanging authorization code for tokens...");
          const creds = await exchangeCode(result.code, redirectUri);

          // Fetch user info
          console.log("Fetching user info...");
          const userInfo = await fetchUserInfo(creds.access_token);
          if (userInfo.email) {
            creds.email = userInfo.email;
          }

          // Fetch project ID
          console.log("Fetching project ID...");
          const projectId = await fetchProjectId(creds.access_token);
          if (projectId) {
            creds.project_id = projectId;
            console.log(`Using GCP project: ${projectId}`);
          }

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>Authentication Successful!</h1>
              <p>You can close this window and return to the terminal.</p>
            </body></html>
          `);

          saveCredentials(creds);
          server.close();
          if (!resolved) {
            resolved = true;
            resolve(creds);
          }
        } catch (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(`
            <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>Token Exchange Failed</h1>
              <p>${err instanceof Error ? err.message : "Unknown error"}</p>
            </body></html>
          `);
          server.close();
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        }
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(port, "127.0.0.1", async () => {
      console.log(`Callback server listening on port ${port}`);

      const authUrl = buildAuthUrl(redirectUri, state);
      console.log(`\nOpening browser for Google OAuth...\n`);

      // Open browser
      try {
        const open = (await import("open")).default;
        await open(authUrl);
      } catch {
        console.log("Could not open browser automatically.");
        console.log(`Please open this URL manually:\n${authUrl}\n`);
      }

      console.log("Waiting for authentication callback...");
    });

    server.on("error", (err) => {
      console.error(`Failed to start callback server: ${err.message}`);
      if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use.`);
        console.error(`Try: lsof -ti:${port} | xargs kill`);
      }
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!resolved) {
        console.error("\nAuthentication timed out after 5 minutes.");
        server.close();
        resolved = true;
        resolve(null);
      }
    }, 5 * 60 * 1000);
  });
}

/**
 * Check if token is expired or will expire soon
 * @param buffer - Time buffer in seconds before expiry (default: 5 minutes)
 */
export function isTokenExpired(
  creds: OAuthCredentials,
  buffer: number = 300
): boolean {
  if (!creds.timestamp || !creds.expires_in) {
    // No timestamp info, assume expired
    return true;
  }

  const expiresAt = creds.timestamp + creds.expires_in * 1000;
  const now = Date.now();
  const bufferMs = buffer * 1000;

  // Return true if token expires within buffer time
  return now + bufferMs >= expiresAt;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<OAuthCredentials | null> {
  try {
    const { clientId, clientSecret } = getAntigravityCredentials();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(AGY_CONFIG.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Token refresh failed: ${response.status} ${text}`);
      return null;
    }

    const data = await response.json();
    const now = Date.now();

    // Load existing credentials to preserve email/project_id
    const existing = loadCredentials();

    const refreshedCreds: OAuthCredentials = {
      type: "antigravity",
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Use new refresh token if provided
      expires_in: data.expires_in,
      timestamp: now,
      expired: new Date(now + data.expires_in * 1000).toISOString(),
      email: existing?.email,
      project_id: existing?.project_id,
    };

    // Save refreshed credentials
    saveCredentials(refreshedCreds);
    console.log("Token refreshed successfully");

    return refreshedCreds;
  } catch (err) {
    console.error(`Token refresh error: ${err}`);
    return null;
  }
}

/**
 * Refresh tokens with retry logic
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 */
export async function refreshAccessTokenWithRetry(
  refreshToken: string,
  maxRetries: number = 3
): Promise<OAuthCredentials | null> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await refreshAccessToken(refreshToken);
      if (result) {
        return result;
      }
    } catch (err) {
      lastError = err as Error;
      console.warn(`Token refresh attempt ${attempt}/${maxRetries} failed: ${err}`);
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  console.error(`Token refresh failed after ${maxRetries} attempts`, lastError);
  return null;
}

/**
 * Ensure token is valid, refreshing if necessary
 * @param buffer - Time buffer in seconds before expiry (default: 5 minutes)
 * @returns Valid credentials or null if refresh failed
 */
export async function ensureValidToken(
  buffer: number = 300
): Promise<OAuthCredentials | null> {
  const creds = loadCredentials();
  
  if (!creds) {
    console.error("No credentials found");
    return null;
  }

  // Check if token needs refresh
  if (isTokenExpired(creds, buffer)) {
    if (!creds.refresh_token) {
      console.error("Token expired and no refresh token available");
      return null;
    }

    console.log("Token expired or expiring soon, refreshing...");
    return await refreshAccessTokenWithRetry(creds.refresh_token);
  }

  return creds;
}
