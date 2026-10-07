---
name: rn-touch-target-shrink
files: ["**/*.tsx"]
hunk_regex: "(hitSlop|Pressable|onPress|padding(Vertical|Horizontal)?:|minHeight:|minWidth:|height:\\s*\\d)"
description: A tappable area becomes smaller than its visible shape or the 44 point minimum
true: Padding or size moves from the pressable to an outer wrapper, or the pressable is smaller than the visible control
false: The pressable still covers the whole visible control, or hitSlop restores the area
ref: references/rn-layout-review.md
---
Own lens for layout defects the five Jev dimensions do not cover.
