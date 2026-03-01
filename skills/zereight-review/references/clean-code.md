# Clean Code Checks

Run these checks after logic checks. Report as 🔵 Trivial or 🟡 Minor depending on impact.
Never report clean code issues alone as 🟠 Major or higher.

---

## Universal Principles (language-agnostic)

### Naming

- **Intention-revealing names**: can you understand purpose without reading the body?
  - Bad: `d`, `tmp`, `data`, `handleIt`, `doStuff`
  - Good: `elapsedDays`, `pinAttemptCount`, `handleSubmitAsync`
- **No misleading names**: a name that implies a collection should be a collection; a boolean should read as a predicate
  - Bad: `accountList` (is a single account), `isValid` (returns a transformed value)
- **Consistent vocabulary**: one word per concept across the codebase
  - Flag if the same concept uses `fetch`/`get`/`load`/`retrieve` interchangeably

### Functions

- **Do one thing**: if you need "and" to describe what a function does, it does too much
- **Small and focused**: flag functions over ~30 lines that mix multiple concerns
- **No side effects in getters**: functions named `get*` or `is*` should not mutate state
- **Argument count**: flag functions with 4+ positional parameters — suggest an options object
- **Avoid flag arguments**: `processPin(pin, true)` — the boolean switches behavior; split into two functions

### Comments

- **No redundant comments**: comments that restate what the code already clearly says
  ```ts
  // increment i by 1
  i++
  ```
- **Explain why, not what**: the code shows what; comments should explain non-obvious decisions
- **Dead code**: flag commented-out code blocks — delete, don't comment out

### Structure

- **DRY violations**: same logic copied 2+ times with no shared abstraction → flag if divergence risk is real
- **Deep nesting**: more than 3 levels of if/loop nesting → suggest early return or extraction
- **Magic values**: raw numbers/strings used in logic without a named constant

---

## React / TypeScript Specific

### Component design

- **Single responsibility**: a component that fetches, transforms, and renders is doing too much
  - Look for components that mix data fetching hooks with presentation logic and side effects
- **Prop explosion**: 7+ props on a component → suggest grouping or splitting
- **Implicit boolean props**: `<Button disabled />` is fine; `<Button mode="disabled" />` is worse than `<Button disabled />`
- **Render in render**: inline component definitions inside render bodies cause remount on every render
  ```tsx
  // Bad — ListItem recreated every render
  const ListItem = ({ item }) => <Text>{item.name}</Text>
  return <FlatList renderItem={({ item }) => <ListItem item={item} />} />
  ```

### Hooks

- **Custom hook extraction**: logic with 2+ `useState`/`useEffect` calls that belong together → suggest a custom hook
- **Hook naming**: custom hooks must start with `use`; non-hook helpers must not
- **Effect scope creep**: a single `useEffect` doing 3+ unrelated things → split by concern
- **Dependency array correctness**: missing deps that should be there (stale closure risk, overlaps with async check)

### TypeScript

- **`any` usage**: flag explicit `any` — suggest `unknown` + type guard, or a proper type
- **Non-null assertion abuse**: multiple `!` on the same value, or `!` where the value is genuinely nullable
- **Loose union types**: `string | undefined` returned but callers always assume `string` → tighten return type
- **Type vs interface**: flag inconsistency within a module (mixing `type` and `interface` for equivalent use cases)
- **Enum vs const object**: numeric enums are unsafe with `noUncheckedIndexedAccess`; prefer `as const` objects for string enums

### React Native specific

- **StyleSheet outside component**: styles defined inside a component body recreate on every render
- **Inline style objects**: `style={{ margin: 8 }}` creates a new object each render; extract to StyleSheet
- **Raw primitives instead of design system**: using `View`/`Text`/`TouchableOpacity` directly when a design system wrapper exists
- **Hard-coded color strings**: hex/rgb values instead of design token references

---

## Severity guidance for clean code findings

| Finding | Severity |
|---|---|
| Magic number in auth/payment logic | 🟡 Minor |
| 4+ arg function with no options object | 🔵 Trivial |
| Commented-out code block | 🔵 Trivial |
| `any` in a type-critical path (auth, API response) | 🟡 Minor |
| `any` in a utility helper | 🔵 Trivial |
| Inline style in hot render path (list item) | 🟡 Minor |
| Inline style in static screen | 🔵 Trivial |
| Render-in-render (always remounts) | 🟡 Minor |
| DRY violation with divergence risk | 🟡 Minor |
| DRY violation, identical code, no future risk | 🔵 Trivial |
| Component with 7+ props but clear purpose | 🔵 Trivial |
| Effect doing 3+ unrelated things | 🟡 Minor |

## Do not report

- Stylistic preferences with no behavioral or clarity impact (brace style, quote style if enforced by linter)
- Clean code issues already caught by the project's ESLint config
- Refactors that would increase complexity without improving correctness
