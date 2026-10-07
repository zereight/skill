---
name: async-click-double-fire-race
files: ["**/*.tsx"]
hunk_regex: "(onPressAsync|onPress|onSubmit)[\\s\\S]{0,300}?await"
description: An async press or submit handler can run twice before the first call finishes
true: The handler awaits a request that changes server state and nothing disables the control or guards re-entry
false: The control is disabled while pending, a re-entry guard exists, or the call is idempotent
ref: references/logic-checks.md
---
Adapted from OpenQodex lens async-click-double-fire-race (Apache-2.0). Judging rules: see ref.
