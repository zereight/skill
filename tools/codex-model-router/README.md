# Codex Model Router

Local OpenAI-compatible router for one Codex provider that can reach both OpenAI and the local Cursor Composer proxy.

## Start

```bash
export OPENAI_API_KEY="sk-..."
npm run codex:router
```

Defaults:

- Router: `http://127.0.0.1:8788/v1`
- Cursor proxy: `http://127.0.0.1:8787/v1`
- OpenAI API: `https://api.openai.com/v1`
- Cursor models: `composer-2.5,composer-2.5-fast`
- OpenAI models: `gpt-5.5`

Override models:

```bash
CODEX_ROUTER_OPENAI_MODELS="gpt-5.5,gpt-5.4" \
CODEX_ROUTER_CURSOR_MODELS="composer-2.5,composer-2.5-fast" \
npm run codex:router
```

## Codex profile

Use `router.config.toml` from `~/.codex`:

```bash
codex --profile router
```

Inside Codex, use `/model` and select one of:

- `gpt-5.5`
- `composer-2.5`
- `composer-2.5-fast`

OpenAI routing requires `OPENAI_API_KEY`. Cursor routing requires the Cursor Composer proxy already running on `127.0.0.1:8787`.
