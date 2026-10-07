---
name: rn-text-truncation-large-font
files: ["**/*.tsx"]
hunk_regex: "(numberOfLines|ellipsizeMode|adjustsFontSizeToFit|minHeight|maxHeight|height:\\s*\\d|width:\\s*\\d|padding(Vertical|Horizontal)?:\\s*\\d)"
description: A label can be cut or clipped when the OS font size is large or the translated text is long
true: Text sits in a fixed width or height, or in numberOfLines, with no room for a larger font or a longer translation
false: The container grows with its content, the text is a short fixed symbol, or font scaling is handled
ref: references/rn-layout-review.md
---
Own lens for layout defects the five Jev dimensions do not cover.
