---
name: react-fetch-in-effect-without-abort
files: ["**/*.tsx", "**/*.ts"]
hunk_regex: "useEffect\\s*\\([\\s\\S]{0,400}?\\b(fetch|axios|ky)\\b"
description: A useEffect starts a request and its cleanup does not abort it or ignore the stale response
true: The effect starts a request, then sets state from the result without an AbortController or an ignore flag
false: The code uses react-query or swr, guards with an ignore flag, or never sets state from the result
ref: references/async-effect-cancellation.md
---
Adapted from OpenQodex lens react-fetch-in-effect-without-abort (Apache-2.0). Judging rules: see ref.
