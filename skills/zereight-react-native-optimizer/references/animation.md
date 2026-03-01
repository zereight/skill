# Animation Performance Checks

Reference: `react-native-animations`, `vercel-react-native-skills`

**Core rule:** Animations must run on the UI thread. Any animation that touches JS thread state causes jank.

---

## 1. Legacy Animated API instead of Reanimated

**Problem:** `Animated.Value` runs on the JS thread — 60fps cannot be guaranteed

```tsx
// 🔴 Bad
const opacity = useRef(new Animated.Value(0)).current
Animated.timing(opacity, { toValue: 1, useNativeDriver: true }).start()

// ✅ Good — Reanimated shared value runs on UI thread
import { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated'

const opacity = useSharedValue(0)
opacity.value = withTiming(1)

const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value
}))
```

**Principle:** All new animations must use Reanimated 3. Mark existing `Animated` API usage as migration targets.
**Severity:** 🛠️ 🟠 Major

---

## 2. Animation driving style via setState (JS thread)

**Problem:** Managing animation values in React state causes a re-render crossing the JS bridge on every frame.

```tsx
// 🔴 Bad — setState on every animation frame
const [translateX, setTranslateX] = useState(0)
useEffect(() => {
  const animation = requestAnimationFrame(() => {
    setTranslateX(prev => prev + 1)  // re-render every frame
  })
  return () => cancelAnimationFrame(animation)
}, [translateX])

// ✅ Good — shared value mutated directly on UI thread
const translateX = useSharedValue(0)
translateX.value = withSpring(100)
```

**Principle:** Never put animation values in React state. Manage them exclusively as shared values.
**Severity:** ⚠️ 🟠 Major

---

## 3. Worklet accessing JS-side state without runOnJS

**Problem:** Reading React state or JS-side variables directly inside a worklet causes crashes or stale values.

```tsx
// 🔴 Bad — `items` is JS-side array, not accessible from UI thread
const gesture = Gesture.Pan().onEnd(() => {
  'worklet'
  console.log(items.length)  // crash or stale value
})

// ✅ Good — pass via runOnJS or use shared value
const handleEnd = (length: number) => {
  console.log(length)  // runs on JS thread
}

const gesture = Gesture.Pan().onEnd(() => {
  'worklet'
  runOnJS(handleEnd)(sharedItems.value.length)
})
```

**Principle:** When JS-side data is needed inside a worklet, pre-sync it via a shared value or delegate to the JS thread with `runOnJS`.
**Severity:** ⚠️ 🟠 Major

---

## 4. useAnimatedStyle depending on non-shared reactive data

**Problem:** Referencing props or state directly inside `useAnimatedStyle` forces execution on the JS thread.

```tsx
// 🔴 Bad — `isActive` is React state, forces JS thread execution
const animatedStyle = useAnimatedStyle(() => ({
  backgroundColor: isActive ? 'blue' : 'gray'  // isActive from useState
}))

// ✅ Good — mirror to shared value
const isActiveShared = useSharedValue(isActive)
useEffect(() => {
  isActiveShared.value = isActive
}, [isActive])

const animatedStyle = useAnimatedStyle(() => ({
  backgroundColor: isActiveShared.value ? 'blue' : 'gray'
}))
```

**Principle:** All values referenced inside `useAnimatedStyle` must be shared values.
**Severity:** ⚠️ 🟡 Minor

---

## 5. TouchableOpacity in animated/gesture context

**Problem:** `TouchableOpacity` handles opacity on the JS thread — causes input lag when combined with gestures.

```tsx
// 🔴 Bad — JS thread opacity, gesture conflicts
<TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
  <Animated.View style={animatedStyle} />
</TouchableOpacity>

// ✅ Good — GestureDetector + Reanimated Pressable
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'

const scale = useSharedValue(1)
const tap = Gesture.Tap()
  .onBegin(() => { scale.value = withSpring(0.95) })
  .onFinalize(() => { scale.value = withSpring(1) })
  .onEnd(() => runOnJS(handlePress)())

<GestureDetector gesture={tap}>
  <Animated.View style={[animatedStyle, useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))]} />
</GestureDetector>
```

**Principle:** Replace touch handling in animated components with `GestureDetector`.
**Severity:** 🛠️ 🟡 Minor

---

## 6. Animation not cancelled on unmount

**Problem:** Animations continuing after a component unmounts cause memory leaks and `setState on unmounted component` warnings.

```tsx
// 🔴 Bad — animation continues after unmount
useEffect(() => {
  opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true)
}, [])

// ✅ Good — cancel on cleanup
useEffect(() => {
  opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true)
  return () => {
    cancelAnimation(opacity)
  }
}, [])
```

**Principle:** Always call `cancelAnimation` in cleanup for `withRepeat` or long-running animations.
**Severity:** ⚠️ 🟡 Minor

---

## 7. LayoutAnimation instead of Reanimated layout animations

**Problem:** `LayoutAnimation` applies globally to all layout changes, potentially causing unintended animations.

```tsx
// 🔴 Bad
LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
setExpanded(!expanded)

// ✅ Good — Reanimated layout animation on specific element
import { FadeIn, FadeOut } from 'react-native-reanimated'

{expanded && (
  <Animated.View entering={FadeIn} exiting={FadeOut}>
    <ExpandedContent />
  </Animated.View>
)}
```

**Principle:** When layout animation is needed on a specific component only, use Reanimated's entering/exiting props.
**Severity:** 🛠️ 🔵 Trivial
