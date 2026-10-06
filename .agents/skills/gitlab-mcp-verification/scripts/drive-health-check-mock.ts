/**
 * Mock GitLab + stdio health_check drive for gitlab-mcp-verification.
 *
 * Global skill: the target clone is resolved from GITLAB_MCP_REPO_ROOT, else the
 * git toplevel of the current directory. Run via drive-health-check-mock.sh.
 */

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MOCK_TOKEN = "glpat-mock-token-12345";
const REPO_ROOT = resolveRepoRoot();
const RUN_ID = process.env.GITLAB_MCP_VERIFY_RUN_ID ?? String(Date.now());
const ARTIFACTS =
  process.env.GITLAB_MCP_VERIFY_ARTIFACTS ??
  path.join(
    process.env.HOME ?? ".",
    ".agents/verify-artifacts/gitlab-mcp-verification",
    RUN_ID,
  );
const PID_FILE = path.join(ARTIFACTS, "mock-gitlab.pid");

interface MockGitLabModule {
  MockGitLabServer: new (config: { port: number; validTokens: string[] }) => {
    start(): Promise<void>;
    stop(): Promise<void>;
    getUrl(): string;
  };
  findMockServerPort(): Promise<number>;
}

function resolveRepoRoot(): string {
  const fromEnv = process.env.GITLAB_MCP_REPO_ROOT;
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
  } catch {
    return process.cwd();
  }
}

function readRepoPackageVersion(): string {
  const packagePath = path.join(REPO_ROOT, "package.json");
  if (!fs.existsSync(packagePath)) {
    throw new Error(
      `no package.json in ${REPO_ROOT} — cd into a zereight/gitlab-mcp clone or set GITLAB_MCP_REPO_ROOT`,
    );
  }
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
    name?: string;
    version: string;
  };
  if (packageJson.name !== "@zereight/mcp-gitlab") {
    throw new Error(
      `package.json name is '${packageJson.name}' in ${REPO_ROOT}, expected @zereight/mcp-gitlab`,
    );
  }
  return packageJson.version;
}

function writeMeta(packageVersion: string): void {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  let sha = "unknown";
  try {
    sha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    sha = "unknown";
  }
  fs.writeFileSync(
    path.join(ARTIFACTS, "health-check.meta.json"),
    `${JSON.stringify({ runId: RUN_ID, gitHead: sha, packageVersion }, null, 2)}\n`,
  );
}

async function callHealthCheckAsync(
  env: NodeJS.ProcessEnv,
): Promise<Record<string, unknown>> {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const proc = spawn("node", [path.join(REPO_ROOT, "build/index.js")], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        ...env,
        USE_PIPELINE: "true",
      },
      cwd: REPO_ROOT,
    });

    let output = "";
    let errorOutput = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
        return;
      }

      const line = output.split("\n").find((entry) => entry.startsWith("{"));
      if (!line) {
        reject(new Error(`No JSON output found. stderr: ${errorOutput}`));
        return;
      }

      try {
        const response = JSON.parse(line) as {
          error?: unknown;
          result?: { content?: Array<{ text?: string }> };
        };
        if (response.error) {
          reject(response.error);
          return;
        }

        const content = response.result?.content?.[0]?.text;
        if (!content) {
          reject(new Error("No tool result content"));
          return;
        }

        resolve(JSON.parse(content) as Record<string, unknown>);
      } catch (error) {
        reject(error);
      }
    });

    proc.stdin?.end(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "health_check", arguments: {} },
      })}\n`,
    );
  });
}

async function mainAsync(): Promise<void> {
  const packageVersion = readRepoPackageVersion();
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  writeMeta(packageVersion);

  const mockModule = (await import(
    pathToFileURL(path.join(REPO_ROOT, "test/utils/mock-gitlab-server.js")).href
  )) as MockGitLabModule;

  const mockPort = await mockModule.findMockServerPort();
  const mockGitLab = new mockModule.MockGitLabServer({
    port: mockPort,
    validTokens: [MOCK_TOKEN],
  });
  await mockGitLab.start();
  fs.writeFileSync(PID_FILE, `${process.pid}\nmock-port=${mockPort}\n`);

  const baseEnv: NodeJS.ProcessEnv = {
    GITLAB_API_URL: `${mockGitLab.getUrl()}/api/v4`,
    GITLAB_PERSONAL_ACCESS_TOKEN: MOCK_TOKEN,
    GITLAB_TOOLSETS: "projects",
  };

  try {
    const result = await callHealthCheckAsync(baseEnv);

    if (result.status !== "ok") {
      throw new Error(`health_check status not ok: ${JSON.stringify(result)}`);
    }
    if (result.authenticated !== true) {
      throw new Error(`expected authenticated true: ${JSON.stringify(result)}`);
    }
    if (result.mcp_server_version !== packageVersion) {
      throw new Error(
        `version mismatch: got ${result.mcp_server_version}, expected ${packageVersion}`,
      );
    }

    fs.writeFileSync(
      path.join(ARTIFACTS, "health-check.json"),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    console.log(
      `drive-health-check-mock: OK — wrote ${path.join(ARTIFACTS, "health-check.json")}`,
    );
  } finally {
    await mockGitLab.stop();
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  }
}

mainAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`drive-health-check-mock: FAIL — ${message}`);
  process.exit(1);
});
