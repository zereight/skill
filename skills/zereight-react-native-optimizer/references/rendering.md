# Rendering Performance Checks

Reference: `react-native-best-practices`, `vercel-react-native-skills`

---

## 1. FlatList → FlashList for Large Lists

**문제:** FlatList는 50개 이상 아이템에서 스크롤 성능 저하 (JS thread에서 window 계산)

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

**원칙:** 아이템 수가 동적이거나 50개 이상 가능성이 있으면 FlashList를 사용한다.
**Severity:** 🛠️ 🟠 Major

---

## 2. keyExtractor returning index

**문제:** index 기반 key는 아이템 순서 변경 시 전체 재렌더를 유발한다.

```tsx
// 🔴 Bad
keyExtractor={(item, index) => index.toString()}

// ✅ Good
keyExtractor={(item) => item.id}
```

**원칙:** 안정적인 고유 ID를 key로 사용한다. ID가 없으면 복합키(`${item.type}-${item.createdAt}`)를 만든다.
**Severity:** ⚠️ 🟡 Minor

---

## 3. Inline function/object as prop to memoized child

**문제:** 매 렌더마다 새 참조가 생성되어 `React.memo`가 무효화된다.

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

**원칙:** memoized 컴포넌트에 전달하는 함수/객체는 `useCallback`/`useMemo`로 안정화한다.
**Severity:** 🛠️ 🟡 Minor

---

## 4. React.memo on component receiving unstable props

**문제:** `React.memo`를 써도 부모가 매 렌더마다 새 객체/함수를 props로 넘기면 항상 리렌더된다.

```tsx
// 🔴 Bad — memo is useless here
const Item = React.memo(({ style, onPress }) => ...)

// parent
<Item style={{ padding: 16 }} onPress={() => navigate(item.id)} />
//           ^^^^ new object   ^^^^ new function — memo never skips

// ✅ Good — stabilize at call site (see pattern 3)
```

**원칙:** `React.memo` 적용 후 props 안정성도 함께 검토한다. memo만 추가하고 call site를 고치지 않으면 효과 없음.
**Severity:** ⚠️ 🟡 Minor

---

## 5. Context provider scope too wide

**문제:** 자주 바뀌는 값을 가진 Context가 앱 루트 근처에 있으면 하위 전체가 리렌더된다.

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

**원칙:** Context value가 렌더마다 새 객체면 반드시 `useMemo`로 감싸거나 stable/unstable로 분리한다.
**Severity:** ⚠️ 🟠 Major

---

## 6. StyleSheet defined inside component body

**문제:** 컴포넌트 함수 내부의 `StyleSheet.create()`는 매 렌더마다 새 객체를 생성한다.

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

**원칙:** `StyleSheet.create()`는 항상 컴포넌트 외부 모듈 스코프에 둔다.
단, 테마/다크모드 기반 동적 스타일은 예외 — `useMemo`로 감싼다.
**Severity:** 🛠️ 🟡 Minor

---

## 7. useSelector selecting large store slice

**문제:** `useSelector`가 크고 자주 바뀌는 slice를 선택하면 불필요한 리렌더가 발생한다.

```ts
// 🔴 Bad
const transactionState = useSelector(state => state.transactions)
// component re-renders whenever ANY field in transactions changes

// ✅ Good — select only what you need
const items = useSelector(state => state.transactions.items)
const isLoading = useSelector(state => state.transactions.isLoading)
```

**원칙:** selector는 컴포넌트가 실제로 사용하는 최소 데이터만 선택한다. `reselect`의 `createSelector`로 파생 데이터를 메모이제이션한다.
**Severity:** 🛠️ 🔵 Trivial
