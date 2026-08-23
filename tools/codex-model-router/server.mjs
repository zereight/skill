#!/usr/bin/env node
import http from "node:http";
import { Readable } from "node:stream";

const port = Number(process.env.CODEX_ROUTER_PORT || 8788);
const openaiBaseUrl = stripTrailingSlash(
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
);
const cursorBaseUrl = stripTrailingSlash(
  process.env.CURSOR_PROXY_BASE_URL || "http://127.0.0.1:8787/v1",
);
const cursorToken = process.env.CURSOR_PROXY_TOKEN || "cursor-local";

const openaiModels = splitList(process.env.CODEX_ROUTER_OPENAI_MODELS || "gpt-5.5");
const cursorModels = splitList(
  process.env.CODEX_ROUTER_CURSOR_MODELS || "composer-2.5,composer-2.5-fast",
);

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      sendJson(res, 400, { error: "Missing URL" });
      return;
    }

    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true, cursorBaseUrl, openaiBaseUrl });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/models") {
      sendJson(res, 200, {
        object: "list",
        data: [...openaiModels, ...cursorModels].map((id) => ({
          id,
          object: "model",
          owned_by: isCursorModel(id) ? "cursor" : "openai",
        })),
      });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 404, { error: `Unsupported route: ${req.method} ${url.pathname}` });
      return;
    }

    const rawBody = await readBody(req);
    const body = parseJson(rawBody);
    const model = typeof body?.model === "string" ? body.model : "";
    const provider = isCursorModel(model) ? "cursor" : "openai";

    await proxyRequest({
      provider,
      path: url.pathname + url.search,
      method: req.method,
      rawBody,
      incomingHeaders: req.headers,
      res,
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`codex model router listening on http://127.0.0.1:${port}/v1`);
  console.log(`openai models: ${openaiModels.join(", ")}`);
  console.log(`cursor models: ${cursorModels.join(", ")}`);
});

function isCursorModel(model) {
  return cursorModels.includes(model) || model.startsWith("composer-");
}

async function proxyRequest({ provider, path, method, rawBody, incomingHeaders, res }) {
  const baseUrl = provider === "cursor" ? cursorBaseUrl : openaiBaseUrl;
  const headers = buildHeaders(provider, incomingHeaders);
  const upstream = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: rawBody,
  });

  res.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    if (!["content-encoding", "content-length", "transfer-encoding"].includes(key)) {
      res.setHeader(key, value);
    }
  });

  if (!upstream.body) {
    res.end();
    return;
  }

  Readable.fromWeb(upstream.body).pipe(res);
}

function buildHeaders(provider, incomingHeaders) {
  const headers = {
    "content-type": incomingHeaders["content-type"] || "application/json",
    accept: incomingHeaders.accept || "application/json",
  };

  if (provider === "cursor") {
    headers.authorization = `Bearer ${cursorToken}`;
    return headers;
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI model routing");
  }

  headers.authorization = `Bearer ${openaiApiKey}`;
  const organization = process.env.OPENAI_ORG_ID;
  if (organization) headers["openai-organization"] = organization;
  const project = process.env.OPENAI_PROJECT_ID;
  if (project) headers["openai-project"] = project;
  return headers;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseJson(buffer) {
  if (!buffer.length) return null;
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    return null;
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
