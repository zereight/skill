---
name: pii-in-url-or-log
files: ["**/*.tsx", "**/*.ts"]
hunk_regex: "(console\\.(log|warn|error|info)|logger\\.|analytics\\.|track(Event)?\\()[\\s\\S]{0,200}?(token|pin|password|account|phone|email|idNumber|passport|otp)"
description: Personal or credential data is written to a log, analytics event, or URL
true: A log or event call includes a token, PIN, account number, phone, email, or ID value
false: The value is masked or hashed, or the field is a non-sensitive identifier with a similar name
ref: SKILL.md
---
Adapted from OpenQodex lens pii-in-url-or-log (Apache-2.0). Judging rules: see the OWASP section of ref.
