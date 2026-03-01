# Native / Bridge Performance Checks

Reference: `react-native-best-practices`, `agent-device`

---

## 1. Event listener / subscription not removed in cleanup

**Problem:** Failing to remove a listener in cleanup keeps it running after the component unmounts → memory leak, crash risk.

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

// Same pattern applies to Keyboard, NetInfo, DeviceEventEmitter, etc.
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(handleNetworkChange)
  return unsubscribe
}, [])
```

**Principle:** Any registration call (`addEventListener`, `addListener`, `subscribe`, etc.) must have a corresponding removal in cleanup.
**Severity:** ⚠️ 🟠 Major

---

## 2. NativeModules called synchronously in render path

**Problem:** Synchronous native module calls block the JS thread, causing UI freezes.

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

**Principle:** Always call native modules asynchronously and outside the render function.
**Severity:** ⚠️ 🟠 Major

---

## 3. Large object passed over bridge

**Problem:** Serializing 10KB+ JSON over the bridge can block the JS thread for hundreds of milliseconds.

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

**Principle:** Minimize bridge payloads. For large data, share via native storage (SQLite, MMKV) or use a streaming API.
**Severity:** ⚠️ 🟡 Minor

---

## 4. Image without dimensions or resizeMode

**Problem:** Images without explicit dimensions cause layout recalculation (layout thrashing) after they load.

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

**Principle:** Always specify `width`, `height`, and `resizeMode` on every image. Use `expo-image` when possible for blurhash and caching support.
**Severity:** 🛠️ 🟡 Minor

---

## 5. Remote image without caching strategy

**Problem:** Re-downloading remote images on every request increases network cost and render latency.

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

**Principle:** Always specify a caching strategy for remote images. Use `expo-image` or `react-native-fast-image`.
**Severity:** 🛠️ 🟡 Minor

---

## 6. New dependency added without bundle size check

**Problem:** A poor library choice can silently add hundreds of KB to the bundle.

```
⚪ Info — A new package was added. Verify the bundle size impact.

Recommended checks:
1. Check package size on bundlephobia.com
2. If 50KB+, evaluate alternatives
3. moment.js → date-fns / dayjs
4. lodash (full) → lodash-es + tree shaking or individual function imports
```

**Principle:** Evaluate alternatives for any new dependency over 50KB. Recommend noting the bundle size impact in the PR.
**Severity:** ⚪ Info

---

## 7. console.log in production code path

**Problem:** `console.log` blocks the JS thread and can expose sensitive data.

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

**Principle:** Wrap `console.log` in production code with a `__DEV__` guard or remove it. Never log sensitive data (card numbers, tokens, etc.).
**Severity:** 🧹 🔵 Trivial (escalate to ⚠️ 🟠 Major if sensitive data is included)
