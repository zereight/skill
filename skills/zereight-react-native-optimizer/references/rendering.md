# Rendering Performance Checks

Reference: `react-native-best-practices`, `vercel-react-native-skills`

---

## 1. FlatList → FlashList for Large Lists

**Problem:** FlatList degrades scroll performance with 50+ items (window calculation runs on the JS thread)

```tsx
// 🔴 Bad
<FlatList
  data={transactions}  // could be 500+ items
  renderItem={({ item }) => <TransactionItem item={item} />}
/>

// ✅ Good
import { FlashList } from '@shopify/flash-list'
<FlashList
  data={transactions}
  renderItem={({ item }) => <TransactionItem item={item} />}
  estimatedItemSize={72}
/>
```

**Principle:** Use FlashList when item count is dynamic or could exceed 50.
**Severity:** 🛠️ 🟠 Major

---

## 2. keyExtractor returning index

**Problem:** Index-based keys cause a full re-render when item order changes.

```tsx
// 🔴 Bad
keyExtractor={(item, index) => index.toString()}

// ✅ Good
keyExtractor={(item) => item.id}
```

**Principle:** Use a stable unique ID as the key. If no ID exists, construct a composite key (`${item.type}-${item.createdAt}`).
**Severity:** ⚠️ 🟡 Minor

---

## 3. Inline function/object as prop to memoized child

**Problem:** A new reference is created on every render, invalidating `React.memo`.

```tsx
// 🔴 Bad — new function reference on every render
<TransactionItem
  onPress={() => handlePress(item.id)}
  style={{ marginBottom: 8 }}
/>

// ✅ Good
const handleItemPress = useCallback((id: string) => {
  handlePress(id)
}, [handlePress])

const itemStyle = useMemo(() => ({ marginBottom: 8 }), [])

<TransactionItem onPress={handleItemPress} style={itemStyle} />
```

**Principle:** Stabilize functions/objects passed to memoized components with `useCallback`/`useMemo`.
**Severity:** 🛠️ 🟡 Minor

---

## 4. React.memo on component receiving unstable props

**Problem:** Even with `React.memo`, if the parent passes a new object/function on every render, the child always re-renders.

```tsx
// 🔴 Bad — memo is useless here
const Item = React.memo(({ style, onPress }) => ...)

// parent
<Item style={{ padding: 16 }} onPress={() => navigate(item.id)} />
//           ^^^^ new object   ^^^^ new function — memo never skips

// ✅ Good — stabilize at call site (see pattern 3)
```

**Principle:** After applying `React.memo`, also review prop stability at the call site. Adding memo without fixing the call site has no effect.
**Severity:** ⚠️ 🟡 Minor

---

## 5. Context provider scope too wide

**Problem:** A Context with a frequently changing value near the app root causes the entire subtree to re-render.

```tsx
// 🔴 Bad — ThemeContext changes on every user interaction
<ThemeContext.Provider value={{ theme, setTheme }}>
  <App />  // entire app re-renders on theme change
</ThemeContext.Provider>

// ✅ Good — split stable and unstable values
<ThemeContext.Provider value={theme}>           // stable object ref
  <ThemeDispatchContext.Provider value={setTheme}>  // stable function ref
    <App />
  </ThemeDispatchContext.Provider>
</ThemeContext.Provider>
```

**Principle:** If the Context value is a new object on every render, wrap it with `useMemo` or split it into stable/unstable parts.
**Severity:** ⚠️ 🟠 Major

---

## 6. StyleSheet defined inside component body

**Problem:** `StyleSheet.create()` inside a component function creates a new object on every render.

```tsx
// 🔴 Bad
function TransactionItem() {
  const styles = StyleSheet.create({  // recreated every render
    container: { padding: 16 }
  })
  return <View style={styles.container} />
}

// ✅ Good — defined outside component
const styles = StyleSheet.create({
  container: { padding: 16 }
})

function TransactionItem() {
  return <View style={styles.container} />
}
```

**Principle:** Always place `StyleSheet.create()` at module scope outside the component.
Exception: dynamic styles based on theme/dark mode — wrap with `useMemo`.
**Severity:** 🛠️ 🟡 Minor

---

## 7. useSelector selecting large store slice

**Problem:** `useSelector` selecting a large, frequently changing slice causes unnecessary re-renders.

```ts
// 🔴 Bad
const transactionState = useSelector(state => state.transactions)
// component re-renders whenever ANY field in transactions changes

// ✅ Good — select only what you need
const items = useSelector(state => state.transactions.items)
const isLoading = useSelector(state => state.transactions.isLoading)
```

**Principle:** Select only the minimum data the component actually uses. Memoize derived data with `reselect`'s `createSelector`.
**Severity:** 🛠️ 🔵 Trivial
