# Animation Performance Checks

Reference: `react-native-animations`, `vercel-react-native-skills`

**Core rule:** Animations must run on the UI thread. Any animation that touches JS thread state causes jank.

---

## 1. Legacy Animated API instead of Reanimated

**문제:** `Animated.Value`는 JS thread에서 실행 — 60fps 보장 불가

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

**원칙:** 새로운 애니메이션은 반드시 Reanimated 3을 사용한다. 기존 `Animated` API는 migration 대상으로 표시.
**Severity:** 🛠️ 🟠 Major

---

## 2. Animation driving style via setState (JS thread)

**문제:** 애니메이션 값을 React state로 관리하면 매 프레임마다 JS bridge를 건너 리렌더가 발생한다.

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

**원칙:** 애니메이션 값은 절대 React state에 넣지 않는다. shared value로만 관리한다.
**Severity:** ⚠️ 🟠 Major

---

## 3. Worklet accessing JS-side state without runOnJS

**문제:** worklet 함수에서 JS thread의 React state나 변수를 직접 읽으면 크래시 또는 stale 값이 된다.

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

**원칙:** worklet 내에서 JS-side 데이터가 필요하면 shared value로 미리 동기화하거나 `runOnJS`로 JS thread에 위임한다.
**Severity:** ⚠️ 🟠 Major

---

## 4. useAnimatedStyle depending on non-shared reactive data

**문제:** `useAnimatedStyle` 내에서 props나 state를 직접 참조하면 JS thread 실행이 강제된다.

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

**원칙:** `useAnimatedStyle` 내부에서 참조하는 값은 모두 shared value여야 한다.
**Severity:** ⚠️ 🟡 Minor

---

## 5. TouchableOpacity in animated/gesture context

**문제:** `TouchableOpacity`는 JS thread에서 opacity 처리 — gesture와 조합 시 응답 지연 발생

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

**원칙:** 애니메이션이 있는 컴포넌트의 터치 핸들링은 `GestureDetector`로 교체한다.
**Severity:** 🛠️ 🟡 Minor

---

## 6. Animation not cancelled on unmount

**문제:** 컴포넌트 언마운트 후 진행 중인 애니메이션이 계속 실행되면 메모리 누수 및 `setState on unmounted component` 경고 발생

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

**원칙:** `withRepeat` 또는 장기 실행 애니메이션은 반드시 cleanup에서 `cancelAnimation`을 호출한다.
**Severity:** ⚠️ 🟡 Minor

---

## 7. LayoutAnimation instead of Reanimated layout animations

**문제:** `LayoutAnimation`은 모든 레이아웃 변경에 일괄 적용되어 의도치 않은 애니메이션 발생 가능

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

**원칙:** 특정 컴포넌트에만 레이아웃 애니메이션이 필요하다면 Reanimated의 entering/exiting을 사용한다.
**Severity:** 🛠️ 🔵 Trivial
