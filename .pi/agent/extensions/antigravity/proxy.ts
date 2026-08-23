/**
 * CLIProxyAPI Binary Manager
 *
 * Downloads and manages the CLIProxyAPI binary from GitHub releases.
 * Based on CCS binary-manager.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import * as crypto from "crypto";
import * as zlib from "zlib";
import { spawn, ChildProcess } from "child_process";
import { homedir } from "os";
import { getStorageDir, loadCredentials, saveCredentials } from "./oauth.js";

const GITHUB_RELEASES_URL = "https://github.com/router-for-me/CLIProxyAPI/releases/download";
const GITHUB_API_LATEST = "https://api.github.com/repos/router-for-me/CLIProxyAPI/releases/latest";
const CLIPROXY_PORT = 8317;
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // Refresh every 50 minutes (tokens last 60 min)

let proxyProcess: ChildProcess | null = null;
let tokenRefreshTimer: NodeJS.Timeout | null = null;

/**
 * Get directory for CLIProxyAPI binary and config
 */
export function getProxyDir(): string {
  return path.join(getStorageDir(), "proxy");
}

/**
 * Get path to CLIProxyAPI config file
 */
export function getConfigPath(): string {
  return path.join(getProxyDir(), "config.yaml");
}

/**
 * Get path to auth directory (where tokens are stored for CLIProxyAPI)
 */
export function getAuthDir(): string {
  return path.join(getProxyDir(), "auth");
}

/**
 * Detect platform and architecture
 */
function detectPlatform(): { os: string; arch: string; extension: string; binaryName: string } {
  const platform = process.platform;
  const arch = process.arch;

  let os: string;
  let extension: string;
  let binaryName: string;

  if (platform === "darwin") {
    os = "darwin";
    extension = "tar.gz";
    binaryName = "cli-proxy-api";
  } else if (platform === "win32") {
    os = "windows";
    extension = "zip";
    binaryName = "cli-proxy-api.exe";
  } else {
    os = "linux";
    extension = "tar.gz";
    binaryName = "cli-proxy-api";
  }

  let archName: string;
  if (arch === "arm64") {
    archName = "aarch64";
  } else {
    archName = "amd64";
  }

  return { os, arch: archName, extension, binaryName };
}

/**
 * Get the binary path
 */
export function getBinaryPath(): string {
  const platform = detectPlatform();
  return path.join(getProxyDir(), "bin", platform.binaryName);
}

/**
 * Check if binary is installed
 */
export function isBinaryInstalled(): boolean {
  return fs.existsSync(getBinaryPath());
}

/**
 * Fetch latest version from GitHub API
 */
async function fetchLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "pi-agy/1.0",
        Accept: "application/vnd.github.v3+json",
      },
    };

    https.get(GITHUB_API_LATEST, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          https.get(redirectUrl, options, handleResponse).on("error", reject);
        } else {
          reject(new Error("Redirect without location"));
        }
        return;
      }
      handleResponse(res);

      function handleResponse(response: http.IncomingMessage) {
        if (response.statusCode !== 200) {
          reject(new Error(`GitHub API error: ${response.statusCode}`));
          return;
        }

        let data = "";
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () => {
          try {
            const json = JSON.parse(data);
            const version = json.tag_name?.replace(/^v/, "") || "6.5.53";
            resolve(version);
          } catch {
            reject(new Error("Invalid JSON from GitHub API"));
          }
        });
        response.on("error", reject);
      }
    }).on("error", reject);
  });
}

/**
 * Download file from URL
 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleResponse = (res: http.IncomingMessage) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
        } else {
          reject(new Error("Redirect without location"));
        }
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });
      fileStream.on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };

    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, handleResponse).on("error", reject);
  });
}

/**
 * Extract tar.gz archive
 */
function extractTarGz(archivePath: string, destDir: string, binaryName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const gunzip = zlib.createGunzip();
    const input = fs.createReadStream(archivePath);

    let headerBuffer = Buffer.alloc(0);
    let currentFile: { name: string; size: number } | null = null;
    let bytesRead = 0;
    let fileBuffer = Buffer.alloc(0);

    const processData = (data: Buffer) => {
      headerBuffer = Buffer.concat([headerBuffer, data]);

      while (headerBuffer.length >= 512) {
        if (!currentFile) {
          const header = headerBuffer.subarray(0, 512);
          headerBuffer = headerBuffer.subarray(512);

          if (header.every((b) => b === 0)) {
            return;
          }

          let name = "";
          for (let i = 0; i < 100 && header[i] !== 0; i++) {
            name += String.fromCharCode(header[i]);
          }

          let sizeStr = "";
          for (let i = 124; i < 136 && header[i] !== 0; i++) {
            sizeStr += String.fromCharCode(header[i]);
          }
          const size = parseInt(sizeStr.trim(), 8) || 0;

          if (name && size > 0) {
            const baseName = path.basename(name);
            if (baseName === binaryName || baseName === "cli-proxy-api") {
              currentFile = { name: baseName, size };
              fileBuffer = Buffer.alloc(0);
              bytesRead = 0;
            } else {
              const paddedSize = Math.ceil(size / 512) * 512;
              if (headerBuffer.length >= paddedSize) {
                headerBuffer = headerBuffer.subarray(paddedSize);
              } else {
                currentFile = { name: "", size: paddedSize };
                bytesRead = 0;
              }
            }
          }
        } else {
          const remaining = currentFile.size - bytesRead;
          const chunk = headerBuffer.subarray(0, Math.min(remaining, headerBuffer.length));
          headerBuffer = headerBuffer.subarray(chunk.length);

          if (currentFile.name) {
            fileBuffer = Buffer.concat([fileBuffer, chunk]);
          }
          bytesRead += chunk.length;

          if (bytesRead >= currentFile.size) {
            if (currentFile.name) {
              const destPath = path.join(destDir, binaryName);
              fs.writeFileSync(destPath, fileBuffer);
            }

            const paddedSize = Math.ceil(currentFile.size / 512) * 512;
            const padding = paddedSize - currentFile.size;
            if (headerBuffer.length >= padding) {
              headerBuffer = headerBuffer.subarray(padding);
            }

            currentFile = null;
            fileBuffer = Buffer.alloc(0);
          }
        }
      }
    };

    input.pipe(gunzip);
    gunzip.on("data", processData);
    gunzip.on("end", resolve);
    gunzip.on("error", reject);
    input.on("error", reject);
  });
}

/**
 * Download and install CLIProxyAPI binary
 */
export async function installBinary(): Promise<string> {
  const platform = detectPlatform();
  const binDir = path.join(getProxyDir(), "bin");

  fs.mkdirSync(binDir, { recursive: true });

  console.log("Fetching latest CLIProxyAPI version...");
  let version: string;
  try {
    version = await fetchLatestVersion();
  } catch {
    version = "6.5.53"; // Fallback version
  }
  console.log(`Installing CLIProxyAPI v${version}...`);

  const archiveName = `CLIProxyAPI_${version}_${platform.os}_${platform.arch}.${platform.extension}`;
  const downloadUrl = `${GITHUB_RELEASES_URL}/v${version}/${archiveName}`;
  const archivePath = path.join(binDir, archiveName);

  console.log(`Downloading from ${downloadUrl}...`);
  await downloadFile(downloadUrl, archivePath);

  console.log("Extracting...");
  if (platform.extension === "tar.gz") {
    await extractTarGz(archivePath, binDir, platform.binaryName);
  } else {
    // For zip files, we'd need a different extraction method
    throw new Error("ZIP extraction not implemented - use tar.gz platforms");
  }

  // Cleanup archive
  fs.unlinkSync(archivePath);

  // Make executable
  const binaryPath = getBinaryPath();
  if (platform.os !== "windows") {
    fs.chmodSync(binaryPath, 0o755);
  }

  // Save version
  fs.writeFileSync(path.join(binDir, ".version"), version);

  console.log(`CLIProxyAPI v${version} installed successfully`);
  return binaryPath;
}

/**
 * Ensure binary is installed
 */
export async function ensureBinary(): Promise<string> {
  if (isBinaryInstalled()) {
    return getBinaryPath();
  }
  return installBinary();
}

/**
 * Generate CLIProxyAPI config.yaml
 */
export function generateConfig(): string {
  const configPath = getConfigPath();
  const authDir = getAuthDir();

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.mkdirSync(authDir, { recursive: true, mode: 0o700 });

  const config = `# CLIProxyAPI config generated by pi-agy
port: ${CLIPROXY_PORT}
debug: false

# Logging disabled by default
logging-to-file: false
request-log: false

# API keys
api-keys:
  - "pi-agy-internal"

# OAuth tokens directory
auth-dir: "${authDir.split(path.sep).join("/")}"

# Auto-switch accounts on rate limit
quota-exceeded:
  switch-project: true
  switch-preview-model: true
`;

  fs.writeFileSync(configPath, config, { mode: 0o600 });
  return configPath;
}

/**
 * Copy OAuth credentials to CLIProxyAPI auth directory
 */
export async function syncCredentials(): Promise<boolean> {
  const { ensureValidToken } = await import("./oauth.js");
  
  // Ensure token is valid, refreshing if needed
  const creds = await ensureValidToken();
  if (!creds) {
    console.error("No valid credentials found. Run 'pi-agy login' first.");
    return false;
  }

  const authDir = getAuthDir();
  fs.mkdirSync(authDir, { recursive: true, mode: 0o700 });

  // Write in CLIProxyAPI format
  const tokenFile = path.join(authDir, `antigravity-${creds.email?.replace(/[@.]/g, "_") || "user"}.json`);
  const tokenData = {
    type: "antigravity",
    access_token: creds.access_token,
    refresh_token: creds.refresh_token,
    expires_in: creds.expires_in,
    timestamp: creds.timestamp,
    expired: creds.expired,
    email: creds.email,
    project_id: creds.project_id,
    last_refresh: new Date().toISOString(),
  };

  fs.writeFileSync(tokenFile, JSON.stringify(tokenData, null, 2), { mode: 0o600 });
  console.log(`Synced credentials to ${tokenFile}`);
  return true;
}

/**
 * Periodically refresh tokens to keep them valid
 * This runs in the background while the proxy is active
 */
async function startTokenRefreshTimer(): Promise<void> {
  const { ensureValidToken } = await import("./oauth.js");

  // Initial refresh check
  const refreshTokens = async () => {
    try {
      const creds = await ensureValidToken();
      if (creds) {
        // Re-sync credentials after refresh
        await syncCredentials();
      } else {
        console.error("Token refresh failed. Please re-authenticate with 'pi-agy login'");
      }
    } catch (err) {
      console.error(`Token refresh error: ${err}`);
    }
  };

  // Start periodic refresh
  tokenRefreshTimer = setInterval(refreshTokens, TOKEN_REFRESH_INTERVAL);
  
  // Unref so it doesn't keep process alive
  tokenRefreshTimer.unref();
}

/**
 * Stop token refresh timer
 */
function stopTokenRefreshTimer(): void {
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
}

/**
 * Start CLIProxyAPI server
 */
export async function startProxy(options: { silent?: boolean } = {}): Promise<boolean> {
  if (proxyProcess) {
    if (!options.silent) console.log("Proxy is already running.");
    return true;
  }

  // Ensure binary is installed
  const binaryPath = await ensureBinary();

  // Generate config
  const configPath = generateConfig();

  // Sync credentials (this will auto-refresh if needed)
  const synced = await syncCredentials();
  if (!synced) {
    return false;
  }

  if (!options.silent) {
    console.log(`Starting CLIProxyAPI on port ${CLIPROXY_PORT}...`);
  }

  proxyProcess = spawn(binaryPath, ["--config", configPath], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  if (!options.silent) {
    proxyProcess.stdout?.on("data", (data) => {
      const line = data.toString().trim();
      if (line) console.log(`[proxy] ${line}`);
    });

    proxyProcess.stderr?.on("data", (data) => {
      const line = data.toString().trim();
      if (line) console.error(`[proxy] ${line}`);
    });
  } else {
    // Silently discard output
    proxyProcess.stdout?.on("data", () => {});
    proxyProcess.stderr?.on("data", () => {});
  }

  proxyProcess.on("error", (err) => {
    if (!options.silent) {
      console.error(`Failed to start proxy: ${err.message}`);
    }
    proxyProcess = null;
    stopTokenRefreshTimer();
  });

  proxyProcess.on("exit", (code) => {
    if (!options.silent) {
      console.log(`Proxy exited with code ${code}`);
    }
    proxyProcess = null;
    stopTokenRefreshTimer();
  });

  // Give it a moment to start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Start automatic token refresh
  await startTokenRefreshTimer();

  if (!options.silent) {
    console.log(`CLIProxyAPI is running on http://127.0.0.1:${CLIPROXY_PORT}`);
    console.log("Tokens will be automatically refreshed every 50 minutes.");
    console.log("Press Ctrl+C to stop.");
  }

  return true;
}

/**
 * Stop CLIProxyAPI server
 */
export function stopProxy(): void {
  stopTokenRefreshTimer();
  
  if (proxyProcess) {
    proxyProcess.kill();
    proxyProcess = null;
    console.log("Proxy stopped.");
  } else {
    console.log("Proxy is not running.");
  }
}

/**
 * Check if proxy is running
 */
export async function isProxyRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: CLIPROXY_PORT,
        path: "/health",
        method: "GET",
        timeout: 1000,
      },
      (res) => {
        resolve(res.statusCode === 200);
      }
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}
