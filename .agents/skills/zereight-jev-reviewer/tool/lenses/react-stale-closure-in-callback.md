---
name: react-stale-closure-in-callback
files: ["**/*.tsx", "**/*.ts"]
hunk_regex: "(useAppCallback|useCallback|useMemo)\\s*\\([\\s\\S]{0,600}?\\[\\s*\\]"
description: A memoized callback reads state or props but its dependency list is empty or incomplete
true: The callback body reads a changing value that is missing from the dependency array
false: The values read are refs, setters, or constants, or the stale value is intended
ref: references/react-effect-guidelines.md
---
Adapted from OpenQodex lens react-stale-closure-in-callback (Apache-2.0). Judging rules: see ref.
