# Native / Bridge Performance Checks

Reference: `react-native-best-practices`, `agent-device`

---

## 1. Event listener / subscription not removed in cleanup

**문제:** 리스너를 cleanup에서 제거하지 않으면 컴포넌트 언마운트 후에도 계속 실행 → 메모리 누수, 크래시 위험

```tsx
// 🔴 Bad
useEffect(() => {
  const subscription = AppState.addEventListener('change', handleAppStateChange)
  // no cleanup!
}, [])

// ✅ Good
useEffect(() => {
  const subscription = AppState.addEventListener('change', handleAppStateChange)
  return () => subscription.remove()
}, [])

// Keyboard, NetInfo, DeviceEventEmitter 등도 동일 패턴
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(handleNetworkChange)
  return unsubscribe
}, [])
```

**원칙:** `addEventListener`, `addListener`, `subscribe` 등 등록 함수가 있으면 cleanup에서 반드시 제거한다.
**Severity:** ⚠️ 🟠 Major

---

## 2. NativeModules called synchronously in render path

**문제:** 동기 native module 호출은 JS thread를 블로킹해 UI freeze 발생

```tsx
// 🔴 Bad — synchronous native call in render
function MyComponent() {
  const deviceId = NativeModules.DeviceInfo.getDeviceIdSync()  // blocks JS thread
  return <Text>{deviceId}</Text>
}

// ✅ Good — async call in effect
function MyComponent() {
  const [deviceId, setDeviceId] = useState('')
  useEffect(() => {
    NativeModules.DeviceInfo.getDeviceId().then(setDeviceId)
  }, [])
  return <Text>{deviceId}</Text>
}
```

**원칙:** native module 호출은 항상 async로, render 함수 밖에서 실행한다.
**Severity:** ⚠️ 🟠 Major

---

## 3. Large object passed over bridge

**문제:** bridge를 통해 10KB 이상의 JSON을 직렬화하면 JS thread를 수백ms 블로킹할 수 있다.

```tsx
// 🔴 Bad — passing entire store snapshot over bridge
NativeModules.Analytics.track(JSON.stringify(entireAppState))

// ✅ Good — pass only what native needs
NativeModules.Analytics.track(JSON.stringify({
  screen: currentScreen,
  userId: user.id,
  eventName: 'page_view'
}))
```

**원칙:** bridge payload는 최소화한다. 큰 데이터가 필요하면 native storage(SQLite, MMKV)를 통해 공유하거나 streaming API를 사용한다.
**Severity:** ⚠️ 🟡 Minor

---

## 4. Image without dimensions or resizeMode

**문제:** 크기가 없는 이미지는 로드 후 레이아웃 재계산(layout thrashing)을 유발한다.

```tsx
// 🔴 Bad — no dimensions, layout recalculates after load
<Image source={{ uri: profileImageUrl }} />

// ✅ Good
<Image
  source={{ uri: profileImageUrl }}
  style={{ width: 48, height: 48 }}
  resizeMode="cover"
/>

// Or use expo-image for automatic optimization
import { Image } from 'expo-image'
<Image
  source={profileImageUrl}
  style={{ width: 48, height: 48 }}
  contentFit="cover"
  transition={200}
/>
```

**원칙:** 모든 이미지에는 `width`, `height`, `resizeMode`를 명시한다. 가능하면 `expo-image`를 사용해 blurhash/캐싱을 활용한다.
**Severity:** 🛠️ 🟡 Minor

---

## 5. Remote image without caching strategy

**문제:** 매 요청마다 원격 이미지를 다시 다운로드하면 네트워크 비용과 렌더 지연이 증가한다.

```tsx
// 🔴 Bad — no caching
<Image source={{ uri: `https://cdn.example.com/user/${userId}/avatar.jpg` }} />

// ✅ Good — expo-image with disk cache
import { Image } from 'expo-image'
<Image
  source={`https://cdn.example.com/user/${userId}/avatar.jpg`}
  cachePolicy="disk"
  style={{ width: 48, height: 48 }}
/>

// Or FastImage for react-native-fast-image users
import FastImage from 'react-native-fast-image'
<FastImage
  source={{ uri: avatarUrl, priority: FastImage.priority.normal }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

**원칙:** 원격 이미지는 반드시 캐싱 전략을 명시한다. `expo-image` 또는 `react-native-fast-image`를 사용한다.
**Severity:** 🛠️ 🟡 Minor

---

## 6. New dependency added without bundle size check

**문제:** 잘못된 라이브러리 선택으로 번들이 수백KB 증가할 수 있다.

```
⚪ Info — 새 패키지가 추가됐습니다. 번들 사이즈 영향을 확인하세요.

권장 체크:
1. bundlephobia.com에서 패키지 사이즈 확인
2. 사이즈가 50KB+인 경우 대안 검토
3. moment.js → date-fns / dayjs
4. lodash (full) → lodash-es + tree shaking 또는 개별 함수 import
```

**원칙:** 50KB 이상의 새 의존성은 대안을 검토한다. PR에 번들 사이즈 영향을 명시하는 것을 권장.
**Severity:** ⚪ Info

---

## 7. console.log in production code path

**문제:** `console.log`는 JS thread를 블로킹하고 민감 데이터를 노출할 수 있다.

```tsx
// 🔴 Bad
function processPayment(data: PaymentData) {
  console.log('processing payment', data)  // leaks sensitive data, blocks thread
  return submitPayment(data)
}

// ✅ Good — remove or use __DEV__ guard
function processPayment(data: PaymentData) {
  if (__DEV__) {
    console.log('processing payment', { amount: data.amount })  // no sensitive fields
  }
  return submitPayment(data)
}
```

**원칙:** 프로덕션 코드에서 `console.log`는 `__DEV__` 가드로 감싸거나 제거한다. 민감 데이터(카드번호, 토큰 등)는 절대 로깅하지 않는다.
**Severity:** 🧹 🔵 Trivial (민감 데이터 포함 시 ⚠️ 🟠 Major로 상향)
