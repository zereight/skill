---
name: zereight-react-native
description: Gateway skill for React Native development. Routes tasks to the right specialist skill — basics, animations, state, navigation, native modules, testing, deployment, or Storybook. Use when starting any React Native development task.
---

# zereight-react-native

This skill does not contain implementation details.
It routes you to the right specialist skill based on what you're building.

## Skill map

| Task | Use this skill |
|------|---------------|
| 컴포넌트, 스타일, 레이아웃, Expo 기초 | `react-native-basics` |
| 애니메이션, Reanimated, Gesture Handler | `react-native-animations` |
| 상태 관리 (Zustand, Redux, TanStack Query) | `react-native-state` |
| 네비게이션, 딥링크, 탭/스택 구조 | `react-native-navigation` |
| 네이티브 모듈, Turbo Modules, JSI, Fabric | `react-native-native-modules` |
| 테스트 (Jest, Testing Library, Detox) | `react-native-testing` |
| 배포 (EAS Build, App Store, Play Store) | `react-native-deployment` |
| Storybook 설정 | `setup-react-native-storybook` |
| Storybook 스토리 작성 | `writing-react-native-storybook-stories` |
| HeroUI Native 컴포넌트 | `heroui-native` |
| 성능 최적화 가이드 (FPS, TTI, 번들) | `react-native-best-practices` / `vercel-react-native-skills` |
| **코드 리뷰 시 성능 회귀 탐지** | `zereight-react-native-optimizer` |

## When to delegate to optimizer

`zereight-react-native-optimizer`는 **개발** 가이드가 아니라 **리뷰** 도구입니다.

다음 상황에서 optimizer를 호출하세요:
- PR diff에서 리스트, 애니메이션, 네이티브 모듈 코드가 변경됐을 때
- `zereight-review`와 함께 RN PR을 리뷰할 때

## Quick decision guide

```
새 기능 개발?
  → 기능 영역에 맞는 specialist skill 사용

성능 이슈 디버깅?
  → react-native-best-practices 또는 vercel-react-native-skills

PR 리뷰?
  → zereight-review + zereight-react-native-optimizer

UI 컴포넌트 라이브러리?
  → heroui-native
```
