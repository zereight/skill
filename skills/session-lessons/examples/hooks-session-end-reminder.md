# Optional: sessionEnd reminder hook

Use only if you want a **nudge** after agent sessions—not automatic lesson analysis.

## User hook layout

Create `~/.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "sessionEnd": [
      {
        "command": "./hooks/session-lessons-remind.sh"
      }
    ]
  }
}
```

Create `~/.cursor/hooks/session-lessons-remind.sh`:

```bash
#!/usr/bin/env bash
# Fail open: never block session end.
cat <<'EOF'
{"followup": "If this session had a repeated assistant mistake, run /session-lessons (or attach the session-lessons skill) before the next task."}
EOF
```

```bash
chmod +x ~/.cursor/hooks/session-lessons-remind.sh
```

## Notes

- Hooks run from `~/.cursor/` for user hooks; adjust paths accordingly.
- For **project** hooks, put the same under `.cursor/hooks/` and reference `.cursor/hooks/session-lessons-remind.sh` from the project root.
- This does **not** read transcripts; it only reminds you to invoke the skill.
