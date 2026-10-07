---
name: async-floating-promise
files: ["**/*.tsx", "**/*.ts"]
hunk_regex: "^[+-]\\s*(?!return|await|void)[\\w.]*Async\\s*\\("
description: An async call is started without await, void, or error handling, so a rejection goes unnoticed
true: A promise-returning call is not awaited, returned, voided, or given a catch handler
false: The call is awaited or returned, is wrapped by the BankX hook error handler, or is deliberately voided
ref: references/logic-checks.md
---
Adapted from OpenQodex lens async-floating-promise (Apache-2.0). Judging rules: see ref.
