# RN layout review

## Scope triggers

Apply when a changed `*.tsx` hunk touches `numberOfLines`, `ellipsizeMode`, `adjustsFontSizeToFit`, fixed `width`/`height`/`minHeight`, `padding*`, `hitSlop`, `Pressable`, or tab, chip, and button components. Skip for logic-only or test-only hunks.

## Questions

1. **Large font and long text.** With the OS font at its largest and the longest supported locale string (Thai and English are longer than the base locale), does the label still fit? Is it cut by `numberOfLines`, a fixed height, or a parent with `overflow: hidden`? Check the importers: they decide the strings and the available width.
2. **Touch area.** Is the pressable still at least as large as the visible control, and at least 44 points on each side? A padding or size moved from the `Pressable` to an outer wrapper shrinks the tappable area.
3. **Duplicated layout constants.** Does another file repeat the same padding, width, or height (for example a sibling component or a container constant)? Changing one side only breaks alignment.

## Severity

Follow `severity-rubric.md`. These defects need a device or Figma check, so state the screen, language, and font size to verify and keep the rating at a low severity unless the cut-off text hides a required action or amount.
