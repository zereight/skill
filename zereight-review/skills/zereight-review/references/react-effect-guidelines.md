# React Effect Guidelines

Reference: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

**Core rule:** Effects are for synchronizing with *external systems* (network, browser DOM, third-party libraries).
If there is no external system involved, you probably don't need an Effect.

Report violations as 🛠️ 🟡 Minor (causes extra renders) or 🛠️ 🔵 Trivial (style only).
If the violation causes a bug (stale data, wrong event trigger), escalate to ⚠️ 🟠 Major.

---

## 1. Derived State

**Problem:** Synchronizing a value derivable from props/state via an Effect

```ts
// 🔴 Bad — extra render pass, state gets stale before Effect runs
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(firstName + ' ' + lastName);
}, [firstName, lastName]);

// ✅ Good — computed during render, always in sync
const fullName = firstName + ' ' + lastName;
```

**Principle:** Values that can be computed from existing props/state should not be stored in state — compute them directly during render.

---

## 2. Expensive Calculation

**Problem:** Attempting to cache an expensive calculation with Effect + setState

```ts
// 🔴 Bad
const [visibleTodos, setVisibleTodos] = useState([]);
useEffect(() => {
  setVisibleTodos(getFilteredTodos(todos, filter));
}, [todos, filter]);

// ✅ Good — direct computation (cheap case)
const visibleTodos = getFilteredTodos(todos, filter);

// ✅ Good — useMemo for expensive case
const visibleTodos = useMemo(
  () => getFilteredTodos(todos, filter),
  [todos, filter]
);
```

**Principle:** Cache slow calculations with `useMemo`. Effect + setState causes an extra render cycle.

---

## 3. State Reset on Prop Change

**Problem:** Resetting state via an Effect when a prop changes

```ts
// 🔴 Bad — renders stale state first, then re-renders after Effect
useEffect(() => {
  setComment('');
}, [userId]);

// ✅ Good — key prop forces React to remount with clean state
<Profile userId={userId} key={userId} />
```

**Principle:** Use the `key` prop when you need to reset the entire component state.

---

## 4. Partial State Adjustment on Prop Change

**Problem:** Adjusting only part of the state via an Effect when a prop changes

```ts
// 🔴 Bad
useEffect(() => {
  setSelection(null);
}, [items]);

// 🟡 Better — adjust during rendering (avoids extra render cycle)
const [prevItems, setPrevItems] = useState(items);
if (items !== prevItems) {
  setPrevItems(items);
  setSelection(null);
}

// ✅ Best — derive from ID so adjustment is never needed
const [selectedId, setSelectedId] = useState(null);
const selection = items.find(item => item.id === selectedId) ?? null;
```

**Principle:** First check whether ID-based derivation can eliminate the need for "adjustment" entirely.

---

## 5. Event-Specific Logic in Effect

**Problem:** Placing logic that should only run on a user event (e.g. click) inside an Effect

```ts
// 🔴 Bad — fires on every render where isInCart is true (including page reload)
useEffect(() => {
  if (product.isInCart) {
    showNotification(`Added ${product.name} to cart!`);
  }
}, [product]);

// ✅ Good — runs only when user clicks
function handleBuyClick() {
  addToCart(product);
  showNotification(`Added ${product.name} to cart!`);
}
```

**Decision criteria:** "Does this code run because the component *appeared on screen*, or because *the user did something*?"
→ The former belongs in an Effect; the latter belongs in an event handler.

---

## 6. Notifying Parent via Effect

**Problem:** Propagating an internal state change to the parent via an Effect

```ts
// 🔴 Bad — parent re-renders after child, causing cascading renders
useEffect(() => {
  onChange(isOn);
}, [isOn, onChange]);

// ✅ Good — both updates happen in the same event
function updateToggle(nextIsOn) {
  setIsOn(nextIsOn);
  onChange(nextIsOn);
}
```

**Principle:** State changes that originate from the same event should be handled in a single event handler.

---

## 7. Effect Chain (Cascading Effects)

**Problem:** An Effect changes state, which triggers another Effect, forming a chain

```ts
// 🔴 Bad — 4 re-renders for one user action
useEffect(() => { if (card?.gold) setGoldCardCount(c => c + 1) }, [card]);
useEffect(() => { if (goldCardCount > 3) setRound(r => r + 1) }, [goldCardCount]);
useEffect(() => { if (round > 5) setIsGameOver(true) }, [round]);
useEffect(() => { alert('Good game!') }, [isGameOver]);

// ✅ Good — calculate during render, update in event handler
const isGameOver = round > 5;

function handlePlaceCard(nextCard) {
  setCard(nextCard);
  if (nextCard.gold) {
    if (goldCardCount < 3) {
      setGoldCardCount(goldCardCount + 1);
    } else {
      setGoldCardCount(0);
      setRound(round + 1);
      if (round === 5) alert('Good game!');
    }
  }
}
```

**Principle:** Effect chains make code fragile. Compute the next state all at once inside an event handler.

---

## 8. Data Fetching Without Cleanup (Race Condition)

**Problem:** On rapid input changes, a response from an earlier request arrives after a later one, displaying stale results

```ts
// 🔴 Bad — race condition: "hell" response may overwrite "hello" response
useEffect(() => {
  fetchResults(query, page).then(json => {
    setResults(json);
  });
}, [query, page]);

// ✅ Good — ignore stale responses with cleanup flag
useEffect(() => {
  let ignore = false;
  fetchResults(query, page).then(json => {
    if (!ignore) setResults(json);
  });
  return () => { ignore = true; };
}, [query, page]);
```

**Principle:** When fetching data inside an Effect, always ignore stale responses via a cleanup flag.
→ If this pattern repeats, extract it into a custom hook like `useData(url)`.

---

## 9. External Store Subscription via Effect

**Problem:** Manually subscribing to an external store (e.g. browser API) directly inside an Effect

```ts
// 🔴 Bad — manual subscription with Effect is error-prone
const [isOnline, setIsOnline] = useState(navigator.onLine);
useEffect(() => {
  const handler = () => setIsOnline(navigator.onLine);
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}, []);

// ✅ Good — use the purpose-built hook
function subscribe(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}
const isOnline = useSyncExternalStore(
  subscribe,
  () => navigator.onLine,
  () => true
);
```

**Principle:** Use `useSyncExternalStore` for external store subscriptions.

---

## Review Severity Guide

| Pattern | Severity | Rationale |
|---|---|---|
| Derived state (synced via Effect) | 🛠️ 🟡 Minor | 2 extra renders, state stale risk |
| Event logic in Effect | ⚠️ 🟠 Major | Causes real bugs e.g. re-firing on page reload |
| Effect chain (3 or more) | 🛠️ 🟡 Minor | Reduces maintainability, harder to debug |
| Data fetch without cleanup | ⚠️ 🟠 Major | Race condition → stale data displayed |
| Notify parent via Effect | 🛠️ 🟡 Minor | Extra render pass, timing issues |
| External store via Effect | 🛠️ 🔵 Trivial | Works but a better API exists |
| Expensive calc without useMemo | 🛠️ 🔵 Trivial | Performance concern, usually below practical threshold |
