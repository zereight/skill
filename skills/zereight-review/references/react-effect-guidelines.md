# React Effect Guidelines

Reference: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

**Core rule:** Effects are for synchronizing with *external systems* (network, browser DOM, third-party libraries).
If there is no external system involved, you probably don't need an Effect.

Report violations as 🛠️ 🟡 Minor (causes extra renders) or 🛠️ 🔵 Trivial (style only).
If the violation causes a bug (stale data, wrong event trigger), escalate to ⚠️ 🟠 Major.

---

## 1. Derived State

**문제:** props/state에서 계산 가능한 값을 Effect로 동기화

```ts
// 🔴 Bad — extra render pass, state gets stale before Effect runs
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(firstName + ' ' + lastName);
}, [firstName, lastName]);

// ✅ Good — computed during render, always in sync
const fullName = firstName + ' ' + lastName;
```

**원칙:** 기존 props/state로부터 계산 가능한 값은 state에 두지 말고 렌더 중에 직접 계산한다.

---

## 2. Expensive Calculation

**문제:** 비용이 큰 계산을 Effect + setState로 캐싱하려는 시도

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

**원칙:** 느린 계산은 `useMemo`로 캐시한다. Effect + setState는 추가 렌더를 유발한다.

---

## 3. State Reset on Prop Change

**문제:** prop이 바뀔 때 state를 Effect로 초기화

```ts
// 🔴 Bad — renders stale state first, then re-renders after Effect
useEffect(() => {
  setComment('');
}, [userId]);

// ✅ Good — key prop forces React to remount with clean state
<Profile userId={userId} key={userId} />
```

**원칙:** 컴포넌트 전체 state를 초기화해야 한다면 `key` prop을 사용한다.

---

## 4. Partial State Adjustment on Prop Change

**문제:** prop이 바뀔 때 일부 state만 Effect로 조정

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

**원칙:** ID 기반 파생으로 "adjustment" 자체를 없앨 수 있는지 먼저 검토한다.

---

## 5. Event-Specific Logic in Effect

**문제:** 유저 이벤트(클릭 등)에 의해 발생해야 하는 로직을 Effect에 넣음

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

**판단 기준:** "이 코드가 실행되는 이유가 컴포넌트가 *화면에 표시되었기 때문*인가, 아니면 *유저가 특정 행동을 했기 때문*인가?"
→ 전자는 Effect, 후자는 이벤트 핸들러.

---

## 6. Notifying Parent via Effect

**문제:** 내부 state 변경을 Effect로 부모에게 전달

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

**원칙:** 같은 이벤트에서 발생한 state 변경은 하나의 이벤트 핸들러에서 처리한다.

---

## 7. Effect Chain (Cascading Effects)

**문제:** Effect가 state를 바꾸고, 그 state가 다른 Effect를 트리거하는 체인

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

**원칙:** Effect 체인은 코드를 취약하게 만든다. 이벤트 핸들러에서 다음 state를 한 번에 계산한다.

---

## 8. Data Fetching Without Cleanup (Race Condition)

**문제:** 빠른 입력 시 이전 요청의 응답이 최신 요청보다 늦게 도착해 stale 결과 표시

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

**원칙:** Effect로 데이터를 fetch할 때는 반드시 cleanup으로 stale 응답을 무시해야 한다.
→ 이 패턴이 반복된다면 `useData(url)` 같은 커스텀 훅으로 추출하라.

---

## 9. External Store Subscription via Effect

**문제:** 브라우저 API 등 외부 store를 Effect로 직접 구독

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

**원칙:** 외부 store 구독에는 `useSyncExternalStore`를 사용한다.

---

## Review Severity Guide

| 패턴 | 심각도 | 근거 |
|---|---|---|
| Derived state (Effect로 동기화) | 🛠️ 🟡 Minor | 불필요한 렌더 2회, state stale 위험 |
| Event logic in Effect | ⚠️ 🟠 Major | 페이지 로드 시 재실행 등 실제 버그 유발 |
| Effect chain (3개 이상) | 🛠️ 🟡 Minor | 유지보수성 저하, 디버깅 어려움 |
| Data fetch without cleanup | ⚠️ 🟠 Major | race condition → 잘못된 데이터 표시 |
| Notify parent via Effect | 🛠️ 🟡 Minor | 추가 렌더 pass, 타이밍 이슈 |
| External store via Effect | 🛠️ 🔵 Trivial | 작동은 하지만 better API 존재 |
| Expensive calc without useMemo | 🛠️ 🔵 Trivial | 성능, 대부분 실용적 임계치 이하 |
