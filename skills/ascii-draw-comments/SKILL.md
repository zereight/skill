---
name: ascii-draw-comments
description: Create clean ASCII diagrams for code comments and documentation. Use when the user wants box-and-arrow diagrams, flow charts, tables, trees, or other ASCII art that can be pasted into source-code comments, README files, design notes, or issue/PR explanations.
---

# ASCII Draw Comments

Use this skill to make ASCII diagrams that survive copy/paste into code comments and plain-text docs.

## Workflow

1. Clarify the target comment style only when needed:
   - `/* ... */` for JavaScript, TypeScript, C, Java, Kotlin, Swift block comments.
   - `# ...` for shell, Ruby, Python line comments.
   - Plain fenced text for Markdown docs.
2. Convert the user's idea into a simple ASCII layout before adding polish.
3. Keep diagrams monospace-safe:
   - Use ASCII characters only unless the user asks for Unicode box drawing.
   - Prefer `+---+`, `|`, `-`, `>`, `v`, and spaces.
   - Avoid tabs. Use spaces.
   - Keep line widths consistent.
4. Make labels short. Long labels break comment readability.
5. If the user wants to use the GUI app, point them to `ascii-draw` as a manual drawing tool:
   - Draw the diagram in ASCII Draw.
   - Copy the resulting text.
   - Paste it inside the target comment block.
6. If the user wants the diagram directly in chat or a file, generate the final comment-ready ASCII yourself.

## Comment Templates

JavaScript/TypeScript/C-style:

```text
/*
+----------+      +----------+
| Request  | ---> | Handler  |
+----------+      +----------+
                      |
                      v
                 +----------+
                 | Storage  |
                 +----------+
*/
```

Python/shell-style:

```text
# +----------+      +----------+
# | Request  | ---> | Handler  |
# +----------+      +----------+
#                       |
#                       v
#                  +----------+
#                  | Storage  |
#                  +----------+
```

Markdown:

```text
+----------+      +----------+
| Request  | ---> | Handler  |
+----------+      +----------+
                      |
                      v
                 +----------+
                 | Storage  |
                 +----------+
```

## Review Checklist

- Diagram explains flow or structure faster than prose.
- Every arrow has a clear direction.
- Box labels fit inside the box.
- Comment prefix does not distort alignment.
- Result uses plain ASCII unless Unicode was requested.
