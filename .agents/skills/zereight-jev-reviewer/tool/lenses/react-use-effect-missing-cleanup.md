---
name: react-use-effect-missing-cleanup
files: ["**/*.tsx", "**/*.ts"]
hunk_regex: "(useBankXEffect|useEffect|useBankXFocusEffect)\\s*\\([\\s\\S]{0,500}?(addEventListener|addListener|subscribe\\(|setInterval|setTimeout|\\.on\\()"
description: An effect registers a listener, timer, or subscription without returning a cleanup
true: The effect adds a listener, interval, timeout, or subscription and does not return a function that removes it
false: The effect returns a cleanup that removes it, or the call is a one-shot with no component state involved
ref: references/react-effect-guidelines.md
---
Adapted from OpenQodex lens react-use-effect-missing-cleanup (Apache-2.0). Judging rules: see ref.
