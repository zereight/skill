# RNTL Anti-Patterns — Full Reference

## Wrong query variant

Use `getBy*` when elements should exist, `queryBy*` for non-existence checks, and `findBy*` for async elements. Avoid combining `waitFor` with `getBy*` when `findBy*` works — e.g., "findBy* for async elements" is the recommended approach.

## Not using *ByRole

Prefer `getByRole('button', { name: 'Submit' })` over `getByTestId` or `getByText`. Querying by role is more semantic and tests accessibility compared to less semantic alternatives like text queries or test IDs.

## Wrong assertions

Avoid asserting directly on props like `button.props['aria-disabled']`. Instead, use built-in RNTL matchers such as `toBeDisabled()` and `toHaveStyle()`. Also, skip redundant null checks after `getBy*` since it already throws if the element is missing — use `toBeOnTheScreen()` instead.

## waitFor misuse

Never put side-effects (like `fireEvent.press`) inside `waitFor` because they run on every retry. Place actions outside and only assertions inside. Prefer `findBy*` over `waitFor` + `getBy*`. Also avoid multiple assertions in a single `waitFor` — put one assertion inside and the rest after.

## Unnecessary act()

Don't wrap `render`, `fireEvent`, or `userEvent` calls in `act()`. Each of these handles act internally, so wrapping them is redundant.

## fireEvent instead of userEvent

`fireEvent.press` only fires onPress, no pressIn/pressOut while `userEvent.press` provides the full press lifecycle. Similarly, `user.type` fires events char-by-char with full event sequence unlike `fireEvent.changeText`.

## Destructuring render

Avoid destructuring queries from `render()`. Instead, call `render(<Component />)` then use the `screen` object for all queries.

## Using UNSAFE_root

Don't traverse the component tree manually via `UNSAFE_root`. Use proper queries like `screen.getByTestId('foo')` instead.

## Manual cleanup

RNTL auto-cleans after each test, so calling `cleanup()` manually in `afterEach` is unnecessary.

## Legacy accessibility props

Replace legacy props like `accessibilityRole` and `accessibilityState` with ARIA-compatible equivalents: `role`, `aria-label`, `aria-disabled`, `aria-checked`, etc.

## Forgetting to await (v14)

In v14, `render`, `fireEvent`, `rerender`, `unmount`, `renderHook`, and `act` are all async. Forgetting `await` causes subtle bugs where tests pass but assertions run before operations complete.

## Using removed APIs (v14)

Several APIs were removed in v14:

- **`renderAsync`** — removed because render is already async
- **`fireEventAsync`** — removed because fireEvent is already async
- **`UNSAFE_root`** — replaced by `screen.container` or `screen.root`
- **`concurrentRoot` option** — removed since it's always on
- **`update()`** — replaced by `rerender`
