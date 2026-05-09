#!/usr/bin/env node

const API_BASE = process.env.BITBUCKET_API_BASE || 'https://api.bitbucket.org/2.0';
const MAX_PAGES = Number(process.env.BITBUCKET_MAX_PAGES || 10);

function firstEnv(names) {
  for (const name of names) {
    if (process.env[name]) {
      return process.env[name];
    }
  }
  return undefined;
}

function usage() {
  return `Usage:
  bitbucket-api.mjs me
  bitbucket-api.mjs pullrequests [STATE]
  bitbucket-api.mjs pr <pull_request_id>
  bitbucket-api.mjs comments <pull_request_id>
  bitbucket-api.mjs activity <pull_request_id>
  bitbucket-api.mjs diffstat <pull_request_id>
  bitbucket-api.mjs diff <pull_request_id>
  bitbucket-api.mjs commits <pull_request_id>
  bitbucket-api.mjs request <METHOD> <PATH_OR_URL> [JSON_BODY]

Required for repository commands:
  BITBUCKET_WORKSPACE
  BITBUCKET_REPO_SLUG

Auth, choose one:
  BITBUCKET_ACCESS_TOKEN
  BITBUCKET_USERNAME + BITBUCKET_API_TOKEN
  ATLASSIAN_USER_EMAIL + ATLASSIAN_API_TOKEN

Mutating request methods also require:
  BITBUCKET_API_ALLOW_WRITE=1`;
}

function authHeader() {
  const bearer = firstEnv(['BITBUCKET_ACCESS_TOKEN', 'BB_ACCESS_TOKEN']);
  if (bearer) {
    return `Bearer ${bearer}`;
  }

  const username = firstEnv(['BITBUCKET_USERNAME', 'BITBUCKET_USER', 'ATLASSIAN_USER_EMAIL']);
  const token = firstEnv([
    'BITBUCKET_API_TOKEN',
    'BITBUCKET_APP_PASSWORD',
    'BB_API_TOKEN',
    'ATLASSIAN_API_TOKEN',
  ]);

  if (username && token) {
    return `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
  }

  throw new Error(
    'Missing auth env. Set BITBUCKET_ACCESS_TOKEN, or BITBUCKET_USERNAME/BITBUCKET_API_TOKEN, or ATLASSIAN_USER_EMAIL/ATLASSIAN_API_TOKEN.',
  );
}

function repoPath(suffix) {
  const workspace = firstEnv(['BITBUCKET_WORKSPACE', 'BB_WORKSPACE']);
  const repo = firstEnv(['BITBUCKET_REPO_SLUG', 'BITBUCKET_REPO', 'BB_REPO_SLUG']);

  if (!workspace || !repo) {
    const missing = [
      !workspace ? 'BITBUCKET_WORKSPACE' : undefined,
      !repo ? 'BITBUCKET_REPO_SLUG' : undefined,
    ].filter(Boolean);
    throw new Error(`Missing repository env: ${missing.join(', ')}`);
  }

  return `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}${suffix}`;
}

function toUrl(pathOrUrl) {
  if (/^https?:\/\//.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalized = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_BASE}${normalized}`;
}

async function requestApi(method, pathOrUrl, body) {
  const upperMethod = method.toUpperCase();
  if (!['GET', 'HEAD'].includes(upperMethod) && process.env.BITBUCKET_API_ALLOW_WRITE !== '1') {
    throw new Error(`Refusing ${upperMethod}. Set BITBUCKET_API_ALLOW_WRITE=1 after explicit user approval.`);
  }

  const headers = {
    Accept: 'application/json',
    Authorization: authHeader(),
  };

  const options = {
    method: upperMethod,
    headers,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(toUrl(pathOrUrl), options);
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!response.ok) {
    const excerpt = text.length > 1200 ? `${text.slice(0, 1200)}...` : text;
    throw new Error(`Bitbucket API ${response.status} ${response.statusText}: ${excerpt}`);
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(text || '{}');
  }

  return text;
}

async function readAllPages(pathOrUrl) {
  let pageUrl = toUrl(pathOrUrl);
  let pageCount = 0;
  let merged;

  while (pageUrl && pageCount < MAX_PAGES) {
    const page = await requestApi('GET', pageUrl);
    pageCount += 1;

    if (!page || !Array.isArray(page.values)) {
      return page;
    }

    if (!merged) {
      merged = { ...page, values: [] };
    }

    merged.values.push(...page.values);
    pageUrl = page.next;
  }

  if (merged && pageUrl) {
    merged._truncated = true;
    merged._next = pageUrl;
    merged._maxPages = MAX_PAGES;
  }

  return merged;
}

function print(value) {
  if (typeof value === 'string') {
    process.stdout.write(value);
    return;
  }
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === '-h' || command === '--help') {
    console.log(usage());
    return;
  }

  if (command === 'me') {
    print(await requestApi('GET', '/user'));
    return;
  }

  if (command === 'pullrequests') {
    const state = args[0] || 'OPEN';
    print(await readAllPages(repoPath(`/pullrequests?state=${encodeURIComponent(state)}&pagelen=50`)));
    return;
  }

  if (command === 'request') {
    const [method, pathOrUrl, rawBody] = args;
    if (!method || !pathOrUrl) {
      throw new Error('request requires METHOD and PATH_OR_URL');
    }
    const body = rawBody === undefined ? undefined : JSON.parse(rawBody);
    const result = method.toUpperCase() === 'GET'
      ? await readAllPages(pathOrUrl)
      : await requestApi(method, pathOrUrl, body);
    print(result);
    return;
  }

  const prId = args[0];
  if (!prId || !/^\d+$/.test(prId)) {
    throw new Error(`${command} requires a numeric pull_request_id`);
  }

  const prBase = `/pullrequests/${encodeURIComponent(prId)}`;
  const commands = {
    pr: () => requestApi('GET', repoPath(prBase)),
    comments: () => readAllPages(repoPath(`${prBase}/comments?pagelen=100`)),
    activity: () => readAllPages(repoPath(`${prBase}/activity?pagelen=100`)),
    diffstat: () => readAllPages(repoPath(`${prBase}/diffstat?pagelen=100`)),
    diff: () => requestApi('GET', repoPath(`${prBase}/diff`)),
    commits: () => readAllPages(repoPath(`${prBase}/commits?pagelen=100`)),
  };

  if (!commands[command]) {
    throw new Error(`Unknown command: ${command}\n${usage()}`);
  }

  print(await commands[command]());
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
