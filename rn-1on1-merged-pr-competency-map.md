# RN 1on1 MERGED PR 역량 매핑

## 요약

- 기준 저장소: `bank-x/mobile-app-workspace`
- 작성자: `Tao Kim (Tao) / tao.exe`
- 기준 PR: Bitbucket `author.nickname = "tao.exe" AND state = "MERGED"`
- 확인된 MERGED PR 수: 177개
- 목적: 1on1에서 사용할 역량별 대표 STAR 후보와 보조 증거 PR 분리
- 주의: 제목 기반 1차 분류이므로, 최종 대표 사례는 PR 내용과 실제 업무 맥락으로 보정한다.

## 분류 요약

- 전문성: 28개
- 문제해결력: 55개
- 커뮤니케이션: 28개
- 성과 영향력: 33개
- 사람 영향력: 33개

## 1on1용 묶음형 STAR

아래 내용은 PR 하나를 그대로 말하기보다, 비슷한 업무 흐름을 묶어서 설명하기 위한 초안이다. PR 번호는 보강 증거로만 사용한다.

### 전문성

#### 사례 1. RN 네비게이션/화면 전환 구조 개선

- S: 온보딩, header close, dismiss 흐름처럼 RN 앱의 화면 전환과 뒤로가기 동작이 화면별로 다르게 동작할 수 있는 영역이 있었다.
- T: 단순 버튼 동작 수정이 아니라 navigation stack, dismiss 동작, 화면 전환 애니메이션이 기존 앱 구조 안에서 자연스럽게 동작하도록 맞춰야 했다.
- A: 화면 진입/이탈 경로와 header close 동작을 확인하고, `dismissTo`, `dismissStemTo`, navigation animation option 같은 RN 화면 전환 제어 지점을 정리했다.
- R: 화면 전환 동작이 더 일관되게 정리됐고, 이후 onboarding이나 close/dismiss 흐름이 필요한 화면에서 같은 구조를 활용할 수 있게 됐다.
- Stage 판단: Stage 3 후보. RN navigation 구조와 화면 생명주기 이해를 실제 화면 동작 개선에 적용했다.
- 보강할 증거: [#1788](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1788), [#1694](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1694), [#1622](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1622)

#### 사례 2. RN 입력/키보드/포커스 처리 개선

- S: RN 입력 화면에서 keyboard bounce, bottom sheet와 키보드 겹침, OTP timer/focus처럼 모바일 입력 UX에서 자주 깨지는 케이스가 있었다.
- T: 입력 컴포넌트만 고치는 것이 아니라 focus 상태, keyboard dismiss 타이밍, screen focus, timer 상태가 함께 맞물려 안정적으로 동작해야 했다.
- A: RN 화면 focus와 input focus, keyboard dismiss 조건, timer 정지 조건을 나눠 확인하고, 사용자 이탈/복귀 시 상태가 꼬이지 않도록 처리했다.
- R: 입력 화면의 사용성 문제가 줄었고, bottom sheet/OTP/keyboard 관련 흐름에서 회귀 가능성을 낮췄다.
- Stage 판단: Stage 3 후보. RN 모바일 입력 UX와 화면 상태 관리 지식을 실제 문제 해결에 적용했다.
- 보강할 증거: [#1360](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1360), [#1352](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1352), [#132](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/132), [#163](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/163)

#### 사례 3. 애니메이션/입력 컴포넌트 구조 개선

- S: amount input, toast, navigation transition, worklet callback처럼 RN 앱에서 사용자 경험과 성능에 민감한 애니메이션/입력 영역 개선이 필요했다.
- T: 단순 UI 수정이 아니라 컴포넌트 내부 상태, 애니메이션 동작, worklet 제약, 접근성 옵션까지 고려해 안정적으로 동작하게 해야 했다.
- A: 기존 컴포넌트의 상태 흐름과 애니메이션 실행 조건을 확인하고, 내부 값을 분리하거나 옵션을 추가해 화면별 요구사항을 수용할 수 있게 했다.
- R: 재사용되는 UI/애니메이션 컴포넌트의 적용 범위가 넓어졌고, 이후 화면에서 같은 컴포넌트를 더 안정적으로 사용할 수 있게 됐다.
- Stage 판단: Stage 3 후보. RN UI/애니메이션 구조 이해를 바탕으로 실제 컴포넌트 개선에 적용했다.
- 보강할 증거: [#1607](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1607), [#1703](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1703), [#1694](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1694), [#276](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/276)

### 문제해결력

#### 사례 1. 송금 실패 플로우 정리

- S: 송금 실패 케이스에서 오류 코드, 결과 화면, 재시도/복귀 동작이 여러 갈래로 나뉘어 있었다.
- T: 실패 상황별로 어떤 화면과 동작이 맞는지 정의하고 구현해야 했다.
- A: 실패 조건을 나눠 보고, 화면 이동과 에러 처리 기준을 정리해 단계별 PR로 반영했다.
- R: 송금 실패 플로우의 판단 기준이 명확해졌고, QA/리뷰에서 확인해야 하는 범위가 줄었다.
- Stage 판단: Stage 3 후보. 문제 핵심과 해결 범위를 스스로 정리했다.
- 보강할 증거: [#1852](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1852), [#1873](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1873), [#1884](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1884), [#1866](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1866)

#### 사례 2. QR/e-slip 예외 처리

- S: QR, e-slip 영역에서 예외 상황마다 다른 화면 처리와 문구 처리가 필요했다.
- T: 사용자에게 보이는 실패 상태를 일관되게 처리하면서 화면별 특수 케이스를 유지해야 했다.
- A: QR/e-slip 실패 조건을 구분하고, 공통 처리 가능한 부분과 화면별 분기를 나눠 구현했다.
- R: 예외 화면 동작이 정리되었고, 비슷한 실패 케이스를 추가할 때 참고할 수 있는 흐름이 생겼다.
- Stage 판단: Stage 3 후보. 정의되지 않은 예외 흐름을 분석해 해결 방안을 적용했다.
- 보강할 증거: [#1781](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1781), [#1717](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1717), [#1827](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1827), [#1975](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1975)

#### 사례 3. 회귀/사용성 문제 수정

- S: keyboard, focus, toast, modal, layout 같은 사용성 영역에서 작은 회귀와 엣지 케이스가 반복됐다.
- T: 증상만 맞추는 것이 아니라 어떤 상태 전환에서 문제가 생기는지 확인해야 했다.
- A: 화면 상태, 포커스 이동, dismiss 타이밍, 모달 표시 조건을 나눠 보고 필요한 지점만 수정했다.
- R: 사용자 흐름 중 어색하거나 깨지는 동작이 줄었고, 회귀 범위를 좁혀 안정적으로 수정했다.
- Stage 판단: Stage 2~3 후보. 필요한 정보를 파악하고 원인 범위를 좁혀 해결했다.
- 보강할 증거: [#1703](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1703), [#1397](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1397), [#1393](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1393), [#2003](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2003)

### 커뮤니케이션

#### 사례 1. i18n/문구 반영

- S: 은행 목록, transfer limit, 계좌번호 검증 등 사용자 노출 문구와 번역 기준을 맞춰야 하는 작업이 있었다.
- T: 단순 번역 추가가 아니라 화면 맥락에 맞는 키와 문구를 적용해야 했다.
- A: 화면별 문구 위치와 번역 키 사용 방식을 확인하고, 기존 구조에 맞춰 i18n을 반영했다.
- R: 사용자에게 노출되는 문구 일관성이 개선됐고, QA가 확인할 기준도 명확해졌다.
- Stage 판단: Stage 2~3 후보. 요구사항을 화면 표현 기준으로 정리해 반영했다.
- 보강할 증거: [#2007](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2007), [#1509](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1509), [#1486](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1486), [#2061](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2061)

#### 사례 2. T&C/HTML 표현 정리

- S: T&C, HTML URL, HTML renderer처럼 서버/콘텐츠/앱 화면 표현이 연결되는 작업이 있었다.
- T: 콘텐츠를 앱에서 안정적으로 보여주고, 화면 이동과 표시 기준을 맞춰야 했다.
- A: HTML URL, renderer, token/시간 표시, 화면 진입 조건을 나눠 확인해 구현했다.
- R: T&C 콘텐츠 표시 흐름이 정리됐고, 사용자에게 노출되는 약관 화면의 안정성이 올라갔다.
- Stage 판단: Stage 3 후보. 여러 입력 기준을 앱 화면 동작으로 정리했다.
- 보강할 증거: [#2080](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2080), [#61](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/61), [#58](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/58), [#57](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/57), [#56](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/56), [#52](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/52)

#### 사례 3. UI 표현/레이아웃 기준 반영

- S: CTA 위치, header padding, pressed style, watermark 같은 화면 표현 조정이 필요했다.
- T: 디자인 요구사항을 기존 컴포넌트 구조 안에서 깨지지 않게 반영해야 했다.
- A: 화면 구조와 공통 컴포넌트 사용 방식을 확인하고, 간격/상태/표현 변경 범위를 좁혀 적용했다.
- R: UI 표현 기준이 더 명확해졌고, 리뷰/QA에서 확인할 포인트를 줄였다.
- Stage 판단: Stage 2~3 후보. 요구사항을 구현 가능한 기준으로 변환했다.
- 보강할 증거: [#1628](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1628), [#1346](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1346), [#1279](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1279), [#1266](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1266)

### 성과 영향력

#### 사례 1. 송금/PromptPay 플로우 개선

- S: 송금, PromptPay, transfer limit 영역은 제품 주요 플로우라 변경 영향이 컸다.
- T: 담당 화면만 고치는 것이 아니라 앞뒤 화면과 예외 상황까지 고려해야 했다.
- A: 기존 화면 흐름과 API/상태 처리 기준을 확인하고, 필요한 검증/분기/화면 이동을 구현했다.
- R: 주요 송금 플로우의 안정성이 올라갔고, 사용자 이탈이나 실패 처리 리스크를 줄였다.
- Stage 판단: Stage 2~3 후보. 담당 기능 완성과 제품 품질 리스크 감소에 기여했다.
- 보강할 증거: [#2053](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2053), [#1692](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1692), [#1312](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1312), [#1700](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1700)

#### 사례 2. e-slip/QR 제품 흐름 개선

- S: QR, e-slip 확인/검증 흐름에서 사용자에게 보여줄 결과와 예외 처리가 필요했다.
- T: 정상/실패/검증 결과 화면이 제품 흐름 안에서 자연스럽게 이어지도록 해야 했다.
- A: 기존 화면 구조를 확인하고, 결과 화면과 오류 화면을 공통 패턴으로 정리해 반영했다.
- R: e-slip/QR 관련 사용자 플로우가 더 안정적으로 동작했고, 결과 화면 처리 기준이 명확해졌다.
- Stage 판단: Stage 3 후보. 제품 플로우 관점에서 기능과 예외 처리를 함께 정리했다.
- 보강할 증거: [#1981](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1981), [#1975](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1975), [#1781](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1781), [#1717](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1717), [#1827](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1827)

#### 사례 3. cardless ATM/account/onboarding 흐름 개선

- S: cardless ATM, 계좌, onboarding처럼 여러 사용자가 거치는 제품 흐름에서 화면 개선이 있었다.
- T: 각 기능의 업무 규칙을 유지하면서 공통 컴포넌트와 기존 화면 구조를 활용해야 했다.
- A: 화면별 상태와 공통 컴포넌트 사용 방식을 확인하고, 필요한 기능/분기만 좁혀 구현했다.
- R: 주요 제품 흐름의 완성도와 일관성이 올라갔고, 회귀 위험을 줄이면서 기능 반영을 마무리했다.
- Stage 판단: Stage 2~3 후보. 개인 담당 업무를 안정적으로 끝내고 제품 흐름 개선에 기여했다.
- 보강할 증거: [#1982](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1982), [#1792](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1792), [#1694](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1694), [#1393](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1393)

### 사람 영향력

#### 사례 1. 공통 컴포넌트/헬퍼 기반 정리

- S: 여러 화면에서 반복되는 컴포넌트와 helper 사용 방식이 있었다.
- T: 내 화면만 해결하는 것이 아니라, 동료가 유사 작업에서 재사용할 수 있는 형태로 정리해야 했다.
- A: 기존 사용처와 변경 영향을 확인하고, 공통 사용 가능한 형태로 컴포넌트/헬퍼를 정리했다.
- R: 반복 구현과 판단 비용이 줄었고, 팀에서 같은 패턴을 더 쉽게 사용할 수 있게 됐다.
- Stage 판단: Stage 3 후보. 동료의 업무 효율에 직접 도움이 되는 개선을 했다.
- 보강할 증거: [#1595](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1595), [#1182](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1182), [#898](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/898)

#### 사례 2. 개발 편의/검증 기반 개선

- S: storybook, local/develop bundle, QA skip button처럼 개발과 검증 편의를 높이는 작업이 필요했다.
- T: 실제 제품 기능 외에도 동료가 테스트하거나 확인하는 흐름을 줄여야 했다.
- A: 개발/검증 환경에서 필요한 진입점과 조건을 확인하고, 로컬/개발 환경 중심으로 편의 기능을 추가했다.
- R: 확인 시간이 줄고, 동료가 기능을 검증하거나 개발할 때 접근성이 좋아졌다.
- Stage 판단: Stage 2~3 후보. 협업과 검증 효율을 높이는 도움을 제공했다.
- 보강할 증거: [#1792](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1792), [#1182](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1182)

#### 사례 3. 사용 방식 정리/deprecated 처리

- S: 기존 컴포넌트나 유틸 중 혼동을 줄이거나 대체 경로를 알려야 하는 항목이 있었다.
- T: 잘못된 사용을 막고, 다음 작업자가 어떤 방향으로 써야 하는지 알 수 있게 해야 했다.
- A: 기존 사용처를 확인하고 deprecated 표시나 대체 사용 방식을 코드/PR 맥락에 드러냈다.
- R: 팀 내 사용 기준이 더 분명해졌고, 이후 유사 작업에서 불필요한 판단 비용이 줄었다.
- Stage 판단: Stage 2~3 후보. 동료가 더 나은 방향으로 작업할 수 있게 피드백/기준을 제공했다.
- 보강할 증거: [#1328](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1328), [#1472](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1472)

## 전문성

- Stage 2~3 근거: 필수 기술/구조를 이해하고 담당 업무에 적용했으며, 일부는 앱/빌드/플랫폼 구조 이해를 바탕으로 문제 해결에 응용했다.
- 1on1 한 줄: RN 앱의 화면 구현뿐 아니라 빌드, 배포, 플랫폼 설정, 공통 개발 기반까지 이해하고 담당 업무에 적용했습니다.

### 대표 STAR 후보

#### PR [#2061](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2061): [UAT][MP-1432] fix i18n at account number length validation

- 링크: [PR [#206](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/206)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2061)
- 생성일: 2026-05-11
- 브랜치: jira/MP-1432-uat2 -> staging1
- S: [UAT][MP-1432] fix i18n at account number length validation 작업에서 RN 앱의 빌드/배포/개발 환경 또는 공통 기술 기반을 다뤄야 했다.
- T: 담당 범위 안에서 기존 구조와 제약을 파악하고, 필요한 변경을 안정적으로 반영해야 했다.
- A: 관련 스크립트, 설정, 브랜치 흐름, 플랫폼별 조건을 확인한 뒤 변경 범위를 좁혀 적용했다.
- R: 빌드/배포/개발 흐름의 막힘을 줄이고, 이후 같은 유형의 작업을 더 명확하게 처리할 수 있게 했다.
- Stage 판단: Stage 3 후보: 직무 지식과 앱/플랫폼 구조 이해를 실제 업무 판단에 적용했다.
- 보강할 증거: [PR [#206](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/206)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2061), jira/MP-1432-uat2 -> staging1

#### PR [#2054](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2054): 🚨🚨🚨🚨🚨  [UAT][MP-1432] update account number length to 16 from 15

- 링크: [PR [#205](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/205)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2054)
- 생성일: 2026-05-08
- 브랜치: jira/MP-1432-uat -> staging1
- S: 🚨🚨🚨🚨🚨  [UAT][MP-1432] update account number length to 16 from 15 작업에서 RN 앱의 빌드/배포/개발 환경 또는 공통 기술 기반을 다뤄야 했다.
- T: 담당 범위 안에서 기존 구조와 제약을 파악하고, 필요한 변경을 안정적으로 반영해야 했다.
- A: 관련 스크립트, 설정, 브랜치 흐름, 플랫폼별 조건을 확인한 뒤 변경 범위를 좁혀 적용했다.
- R: 빌드/배포/개발 흐름의 막힘을 줄이고, 이후 같은 유형의 작업을 더 명확하게 처리할 수 있게 했다.
- Stage 판단: Stage 3 후보: 직무 지식과 앱/플랫폼 구조 이해를 실제 업무 판단에 적용했다.
- 보강할 증거: [PR [#205](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/205)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2054), jira/MP-1432-uat -> staging1

#### PR [#1974](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1974): [Forward Port][BXUAT-23] add qrstring param

- 링크: [PR [#197](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/197)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1974)
- 생성일: 2026-04-30
- 브랜치: forward-port/staging1-to-develop/bxuat-23 -> develop
- S: [Forward Port][BXUAT-23] add qrstring param 작업에서 RN 앱의 빌드/배포/개발 환경 또는 공통 기술 기반을 다뤄야 했다.
- T: 담당 범위 안에서 기존 구조와 제약을 파악하고, 필요한 변경을 안정적으로 반영해야 했다.
- A: 관련 스크립트, 설정, 브랜치 흐름, 플랫폼별 조건을 확인한 뒤 변경 범위를 좁혀 적용했다.
- R: 빌드/배포/개발 흐름의 막힘을 줄이고, 이후 같은 유형의 작업을 더 명확하게 처리할 수 있게 했다.
- Stage 판단: Stage 3 후보: 직무 지식과 앱/플랫폼 구조 이해를 실제 업무 판단에 적용했다.
- 보강할 증거: [PR [#197](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/197)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1974), forward-port/staging1-to-develop/bxuat-23 -> develop

#### PR [#1973](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1973): [UAT][MP-1378] remove CODE_SIGN_ENTITLEMENTS at staging1

- 링크: [PR [#197](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/197)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1973)
- 생성일: 2026-04-30
- 브랜치: jira/MP-1378 -> staging1
- S: [UAT][MP-1378] remove CODE_SIGN_ENTITLEMENTS at staging1 작업에서 RN 앱의 빌드/배포/개발 환경 또는 공통 기술 기반을 다뤄야 했다.
- T: 담당 범위 안에서 기존 구조와 제약을 파악하고, 필요한 변경을 안정적으로 반영해야 했다.
- A: 관련 스크립트, 설정, 브랜치 흐름, 플랫폼별 조건을 확인한 뒤 변경 범위를 좁혀 적용했다.
- R: 빌드/배포/개발 흐름의 막힘을 줄이고, 이후 같은 유형의 작업을 더 명확하게 처리할 수 있게 했다.
- Stage 판단: Stage 3 후보: 직무 지식과 앱/플랫폼 구조 이해를 실제 업무 판단에 적용했다.
- 보강할 증거: [PR [#197](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/197)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1973), jira/MP-1378 -> staging1

#### PR [#1964](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1964): [ITMX-UAT][MP-1373] bump to 0.149.1

- 링크: [PR [#196](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/196)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1964)
- 생성일: 2026-04-30
- 브랜치: jira/MP-1373 -> staging1
- S: [ITMX-UAT][MP-1373] bump to 0.149.1 작업에서 RN 앱의 빌드/배포/개발 환경 또는 공통 기술 기반을 다뤄야 했다.
- T: 담당 범위 안에서 기존 구조와 제약을 파악하고, 필요한 변경을 안정적으로 반영해야 했다.
- A: 관련 스크립트, 설정, 브랜치 흐름, 플랫폼별 조건을 확인한 뒤 변경 범위를 좁혀 적용했다.
- R: 빌드/배포/개발 흐름의 막힘을 줄이고, 이후 같은 유형의 작업을 더 명확하게 처리할 수 있게 했다.
- Stage 판단: Stage 3 후보: 직무 지식과 앱/플랫폼 구조 이해를 실제 업무 판단에 적용했다.
- 보강할 증거: [PR [#196](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/196)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1964), jira/MP-1373 -> staging1

### 보조 증거 PR 목록

- [[#206](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/206)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2061) | 2026-05-11 | [UAT][MP-1432] fix i18n at account number length validation | jira/MP-1432-uat2 -> staging1
- [[#205](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/205)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2054) | 2026-05-08 | 🚨🚨🚨🚨🚨  [UAT][MP-1432] update account number length to 16 from 15 | jira/MP-1432-uat -> staging1
- [[#197](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/197)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1974) | 2026-04-30 | [Forward Port][BXUAT-23] add qrstring param | forward-port/staging1-to-develop/bxuat-23 -> develop
- [[#197](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/197)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1973) | 2026-04-30 | [UAT][MP-1378] remove CODE_SIGN_ENTITLEMENTS at staging1 | jira/MP-1378 -> staging1
- [[#196](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/196)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1964) | 2026-04-30 | [ITMX-UAT][MP-1373] bump to 0.149.1 | jira/MP-1373 -> staging1
- [[#194](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/194)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1946) | 2026-04-29 | [MP-1361] add forward port helper script for ITMX UAT | jira/MP-1361-staging1 -> staging1
- [[#162](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/162)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1622) | 2026-03-30 | [MP-1059] Apply screen transition design guide at onboarding proccess | jira/MP-1059 -> develop
- [[#131](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/131)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1314) | 2026-03-10 | [MP-882] add legacy development scripts for Android and iOS | jira/MP-882 -> develop
- [[#131](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/131)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1312) | 2026-03-10 | [PAYT-1689] redesign transfer limit | jira/PAYT-1689 -> develop
- [[#119](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/119)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1196) | 2026-02-27 | [MP-785] update Android script commands to include appId for different environments | jira/MP-785 -> develop
- [[#108](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/108)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1083) | 2026-02-20 | [PAYT-1692] Adjust trasnfer limit guide description | jira/PAYT-1692 -> develop
- [[#99](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/99)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/993) | 2026-02-11 | Redesign TransactionLimitListScreen | jira/PAYT-1513 -> develop
- [[#96](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/96)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/967) | 2026-02-09 | [PAYT-1624] Fix qr scan layout at android 14 & Oppo device | jira/PAYT-1624 -> develop
- [[#86](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/86)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/861) | 2026-02-02 | Redesign Transfer Bank Account List UI | feat/transfer-bank-account-list-ui -> develop
- [[#85](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/85)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/854) | 2026-01-30 | [PAYT-1521] Redesign transfer input amount screen | jira/PAYT-1521 -> develop
- [[#42](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/42)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/422) | 2025-12-03 | [MP-248] enable async postfix eslint rule & renaming | jira/MP-248 -> develop
- [[#28](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/28)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/282) | 2025-11-19 | [MP-180] add exhaustive-deps rule for specific hooks in ESLint configuration | jira/MP-180-hook-deps-eslint -> develop
- [[#25](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/25)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/253) | 2025-11-14 | add start:developer script for developer mini app | jira/MP-167 -> develop
- [[#22](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/22)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/221) | 2025-11-10 | [MP-152] Add eslint rule "index file is always be barrel file" | jira/MP-152 -> develop
- [[#21](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/21)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/215) | 2025-11-07 | fix vulnerability-CVE-2025-11953 | fix/vulnerability-CVE-2025-11953 -> develop
- [[#12](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/12)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/128) | 2025-10-23 | [MP-94] add eslint rule postfix of async function | jira/MP-94 -> develop
- [[#12](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/12)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/121) | 2025-10-23 | add usecallback eslint rule | feat/add-usecallback-eslint -> develop
- [[#11](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/11)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/119) | 2025-10-22 | [MP-67] add device certificate with csr | jira/MP-67 -> develop
- [[#9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/9)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/92) | 2025-10-15 | [MP-72] eslint ci did not worked | jira/MP-72 -> develop
- [[#6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/6)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/61) | 2025-09-25 | fix: ios dark mode for HTML renderer | feat/fix-ios-darkmode-for-html-renderer -> develop
- [[#3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/3)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/33) | 2025-09-23 | update ESLint validation to include TypeScript React files (*.tsx) | fix/eslint-setting -> develop
- [[#2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/21) | 2025-09-19 | Enhance design system component | feat/enhance-design-system -> develop
- [#4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/4) | 2025-09-09 | fix: resolve security vulnerabilities in dependencies | feature/security-fix-dependencies-v2 -> develop

## 문제해결력

- Stage 2~3 근거: 필요한 정보를 스스로 파악해 해결 방안을 적용했고, 일부는 문제 핵심과 해결 범위를 정의했다.
- 1on1 한 줄: 오류가 난 지점만 고친 것이 아니라 실패 조건과 영향 범위를 나눠 보고 해결 범위를 정리했습니다.

### 대표 STAR 후보

#### PR [#1884](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1884): [PAYT-2060][last] add error handling logic

- 링크: [PR [#188](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/188)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1884)
- 생성일: 2026-04-24
- 브랜치: jira/PAYT-2060-3 -> develop
- S: [PAYT-2060][last] add error handling logic 작업에서 오류, 예외, 회귀 또는 실패 플로우가 발생했다.
- T: 문제의 재현 조건과 영향 범위를 파악하고, 담당 화면/흐름에서 해결 방안을 적용해야 했다.
- A: 실패 조건을 분리해 확인하고, 관련 화면 이동/상태/문구/검증 로직을 기준에 맞게 수정했다.
- R: 사용자 플로우의 예외 처리가 명확해졌고, 동일 유형의 회귀 가능성을 줄였다.
- Stage 판단: Stage 3 후보: 문제 핵심을 정의하고 해결 범위를 정해 처리했다.
- 보강할 증거: [PR [#188](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/188)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1884), jira/PAYT-2060-3 -> develop

#### PR [#1873](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1873): [PAYT-2060][[#2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2)] add hanle error case

- 링크: [PR [#187](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/187)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1873)
- 생성일: 2026-04-23
- 브랜치: jira/PAYT-2060-2 -> develop
- S: [PAYT-2060][[#2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2)] add hanle error case 작업에서 오류, 예외, 회귀 또는 실패 플로우가 발생했다.
- T: 문제의 재현 조건과 영향 범위를 파악하고, 담당 화면/흐름에서 해결 방안을 적용해야 했다.
- A: 실패 조건을 분리해 확인하고, 관련 화면 이동/상태/문구/검증 로직을 기준에 맞게 수정했다.
- R: 사용자 플로우의 예외 처리가 명확해졌고, 동일 유형의 회귀 가능성을 줄였다.
- Stage 판단: Stage 3 후보: 문제 핵심을 정의하고 해결 범위를 정해 처리했다.
- 보강할 증거: [PR [#187](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/187)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1873), jira/PAYT-2060-2 -> develop

#### PR [#1852](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1852): [PAYT-2060][[#1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1)] transfer error handling

- 링크: [PR [#185](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/185)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1852)
- 생성일: 2026-04-21
- 브랜치: jira/PAYT-2060-1 -> develop
- S: [PAYT-2060][[#1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1)] transfer error handling 작업에서 오류, 예외, 회귀 또는 실패 플로우가 발생했다.
- T: 문제의 재현 조건과 영향 범위를 파악하고, 담당 화면/흐름에서 해결 방안을 적용해야 했다.
- A: 실패 조건을 분리해 확인하고, 관련 화면 이동/상태/문구/검증 로직을 기준에 맞게 수정했다.
- R: 사용자 플로우의 예외 처리가 명확해졌고, 동일 유형의 회귀 가능성을 줄였다.
- Stage 판단: Stage 3 후보: 문제 핵심을 정의하고 해결 범위를 정해 처리했다.
- 보강할 증거: [PR [#185](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/185)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1852), jira/PAYT-2060-1 -> develop

#### PR [#1827](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1827): [PAYT-2061][[#3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/3)] QR error handling

- 링크: [PR [#182](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/182)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1827)
- 생성일: 2026-04-17
- 브랜치: jira/PAYT-2061-3 -> develop
- S: [PAYT-2061][[#3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/3)] QR error handling 작업에서 오류, 예외, 회귀 또는 실패 플로우가 발생했다.
- T: 문제의 재현 조건과 영향 범위를 파악하고, 담당 화면/흐름에서 해결 방안을 적용해야 했다.
- A: 실패 조건을 분리해 확인하고, 관련 화면 이동/상태/문구/검증 로직을 기준에 맞게 수정했다.
- R: 사용자 플로우의 예외 처리가 명확해졌고, 동일 유형의 회귀 가능성을 줄였다.
- Stage 판단: Stage 3 후보: 문제 핵심을 정의하고 해결 범위를 정해 처리했다.
- 보강할 증거: [PR [#182](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/182)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1827), jira/PAYT-2061-3 -> develop

#### PR [#1700](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1700): [PAYT-2062] transfer limit error handling

- 링크: [PR [#170](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/170)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1700)
- 생성일: 2026-04-06
- 브랜치: jira/PAYT-2062 -> develop
- S: [PAYT-2062] transfer limit error handling 작업에서 오류, 예외, 회귀 또는 실패 플로우가 발생했다.
- T: 문제의 재현 조건과 영향 범위를 파악하고, 담당 화면/흐름에서 해결 방안을 적용해야 했다.
- A: 실패 조건을 분리해 확인하고, 관련 화면 이동/상태/문구/검증 로직을 기준에 맞게 수정했다.
- R: 사용자 플로우의 예외 처리가 명확해졌고, 동일 유형의 회귀 가능성을 줄였다.
- Stage 판단: Stage 3 후보: 문제 핵심을 정의하고 해결 범위를 정해 처리했다.
- 보강할 증거: [PR [#170](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/170)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1700), jira/PAYT-2062 -> develop

### 보조 증거 PR 목록

- [[#200](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/200)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2003) | 2026-05-06 | [MP-1395] fix tiny regression style issue | jira/MP-1395 -> develop
- [[#197](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/197)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1975) | 2026-05-04 | [MP-1364] Refactoring to BankxResultCase - eslip verificaiton error screen | feature/MP-1364 -> develop
- [[#191](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/191)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1912) | 2026-04-27 | [MP-1299] use enqueueErrorModal | feature/MP-1299 -> develop
- [[#188](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/188)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1884) | 2026-04-24 | [PAYT-2060][last] add error handling logic | jira/PAYT-2060-3 -> develop
- [[#187](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/187)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1873) | 2026-04-23 | [PAYT-2060][[#2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2)] add hanle error case | jira/PAYT-2060-2 -> develop
- [[#186](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/186)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1866) | 2026-04-22 | [MP-1309] add transfer failure screen | jira/MP-1309 -> develop
- [[#185](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/185)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1852) | 2026-04-21 | [PAYT-2060][[#1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1)] transfer error handling | jira/PAYT-2060-1 -> develop
- [[#182](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/182)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1827) | 2026-04-17 | [PAYT-2061][[#3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/3)] QR error handling | jira/PAYT-2061-3 -> develop
- [[#178](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/178)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1788) | 2026-04-14 | [MP-1255] refactoring dismissTo, dismissStemTo | jira/MP-1255 -> develop
- [[#178](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/178)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1781) | 2026-04-14 | [PAYT-2061][[#1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1)] eslip exception handling | jira/PAYT-2061-eslip -> develop
- [[#177](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/177)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1779) | 2026-04-14 | [MP-1252] add enqueueErrorModal | jira/MP-1252 -> develop
- [[#177](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/177)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1777) | 2026-04-14 | [MP-1201] fix wrong error popup style | jira/MP-1201 -> develop
- [[#171](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/171)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1717) | 2026-04-07 | [PAYT-2061][[#2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2)] QR exception handling | jira/PAYT-2061 -> develop
- [[#170](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/170)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1703) | 2026-04-06 | [MP-1172] fix toast animation works well even with animations turned off | jira/MP-1172 -> develop
- [[#170](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/170)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1700) | 2026-04-06 | [PAYT-2062] transfer limit error handling | jira/PAYT-2062 -> develop
- [[#139](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/139)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1397) | 2026-03-16 | [MP-915] fix: dont show double bottom sheet | jira/MP-915 -> develop
- [[#139](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/139)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1393) | 2026-03-13 | [MP-929] fi&refactoringx: add toast notification on successful account change | jira/MP-929 -> develop
- [[#135](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/135)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1352) | 2026-03-12 | [MP-772] adding keyboard dismiss to block overlapping keyboard on bottomsheet | jira/MP-772-2 -> develop
- [[#127](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/127)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1275) | 2026-03-06 | [MP-860] change words at eslip verification error page | jira/MP-860 -> develop
- [[#120](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/120)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1209) | 2026-03-03 | [MP-792] fix: ShowMeTheMoney CTA button visibility | jira/MP-792 -> develop
- [[#120](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/120)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1206) | 2026-03-03 | [MP-790] fix: filtering qr scan overlay area | jira/MP-790 -> develop
- [[#108](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/108)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1082) | 2026-02-20 | fix: update currency name to use getCurrencyUnit | jira/MP-707 -> develop
- [[#108](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/108)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1081) | 2026-02-20 | fix: correct GetFatcaAndCrsQuestions authentication type to REQUIRE | fix/fatca-need-to-session-token -> develop
- [[#106](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/106)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1062) | 2026-02-19 | fix: TransferInputAmount can not be autofocus (regression issue) | jira/PAYT-1682-input-amount-not-settled -> develop
- [[#103](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/103)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1030) | 2026-02-12 | adjust bankx badge + check icon | fix/adjust-badge-icon -> develop
- [[#93](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/93)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/939) | 2026-02-06 | [MP-619] enhance QR code error handling | jira/MP-619 -> develop
- [[#90](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/90)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/902) | 2026-02-05 | Implement amount validation at transfer input amount | jira/PAYT-1521-validation-hook -> develop
- [[#85](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/85)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/857) | 2026-02-02 | Improve transfer amount sanitization with comprehensive tests | fix/transfer-amount-sanitize-improvements -> develop
- [[#85](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/85)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/856) | 2026-02-02 | mount NewBankXToast component | feat/provider-mount-new-toast -> develop
- [[#76](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/76)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/765) | 2026-01-20 | fix metro config common -> feature-common | fix-metro-wrong-pkg -> develop
- [[#72](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/72)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/728) | 2026-01-14 | [MP-450] fix save&resume message | jira/MP-450 -> develop
- [[#71](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/71)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/713) | 2026-01-13 | [MP-443] Fix Save & Resume navigation z-index issue,  replacing fullScreenModal with card presentation | jira/MP-443 -> develop
- [[#68](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/68)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/680) | 2026-01-09 | [MP-411] fix: NDID pending modal logic | jira/MP-411 -> develop
- [[#46](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/46)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/467) | 2025-12-10 | [MP-219] refactor: using pasuable timer in NDID progress screen | jira/MP-219 -> develop
- [[#45](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/45)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/457) | 2025-12-09 | [MP-266] add explicit bind methods in PausableTimer | jira/MP-266 -> develop
- [[#41](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/41)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/418) | 2025-12-03 | [MP-243] add useBankXFocusEffect to exhaustive-deps lint rule | jira/MP-243 -> develop
- [[#41](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/41)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/410) | 2025-12-02 | fix: replace navigation to success screen for Ndid verification | jira/MP-239 -> develop
- [[#40](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/40)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/404) | 2025-12-02 | [MP-236] fix: NDID failure case | jira/MP-236 -> develop
- [[#40](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/40)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/401) | 2025-12-02 | [MP-218] fix: refetch when NDID timer is 00:00 (expired) | jira/MP-218 -> develop
- [[#38](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/38)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/385) | 2025-12-01 | [MP-223] remove deeplink, storeurl handling | jira/MP-223-2 -> develop
- [[#35](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/35)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/357) | 2025-11-28 | [MP-211] remove unused NDID verification failure code handling | jira/MP-211 -> develop
- [[#33](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/33)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/338) | 2025-11-26 | [PLF-343] NDID verification - fail, expire, pending | jira/PLF-343-2 -> develop
- [[#28](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/28)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/283) | 2025-11-19 | [MP-180] fix: ocr-form laser code validation | jira/MP-180-fix-ocr-form-validation -> develop
- [[#25](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/25)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/254) | 2025-11-14 | fix: authentication-method mini app | jira/MP-168 -> develop
- [[#19](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/19)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/196) | 2025-11-04 | fix: Don't send OTP, until phone number check modal cancel. | jira/MP-135 -> develop
- [[#16](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/16)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/163) | 2025-10-29 | enhance screen focus handling to countdown timer | jira/MP-118 -> develop
- [[#16](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/16)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/161) | 2025-10-29 | feat: refactor for OTP expiry failure case handling | jira/MP-120 -> develop
- [[#15](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/15)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/159) | 2025-10-29 | fix: update OTP validation to use error messages constants for Demo | jira/MP-119 -> develop
- [[#13](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/13)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/135) | 2025-10-24 | fix: remove navigation to CasaPolicyScreen after agreeing to terms | jira/MP-102 -> develop
- [[#13](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/13)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/132) | 2025-10-24 | fix: otp expiry timer must stop when user escape otp screen | jira/MP-97 -> develop
- [[#11](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/11)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/112) | 2025-10-21 | [MP-85] fix onboarding mini app | jira/MP-85 -> develop
- [[#10](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/10)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/108) | 2025-10-20 | [MP-83] fix typing blink | jira/MP-83 -> develop
- [[#8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/8)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/82) | 2025-10-13 | fix: phone number input screen bugs | jira/PLF-160 -> develop
- [[#8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/8)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/81) | 2025-10-13 | fix: disable resource shrinking to prevent removal of native images | jira/MP-62 -> develop
- [[#7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/7)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/76) | 2025-10-02 | [PLF-161] fix otp input screen bugs | jira/PLF-161 -> develop

## 커뮤니케이션

- Stage 2~3 근거: 요구사항과 화면 표현 기준을 정리해 반영했고, 일부는 이해관계자가 판단할 수 있는 기준을 만들었다.
- 1on1 한 줄: 요구사항을 화면 흐름, 문구, i18n, UI 기준으로 다시 정리해 리뷰와 QA가 확인하기 쉽게 만들었습니다.

### 대표 STAR 후보

#### PR [#2080](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2080): [PAYT-2197] Promptpay t&c with HTML url

- 링크: [PR [#208](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/208)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2080)
- 생성일: 2026-05-12
- 브랜치: jira/PAYT-2197 -> develop
- S: [PAYT-2197] Promptpay t&c with HTML url 작업에서 화면 문구, i18n, T&C, UI 표현 또는 요구사항 해석이 필요했다.
- T: 기획/디자인/API 기준을 화면 동작과 문구로 일관되게 반영해야 했다.
- A: 요구사항을 화면 단위로 나누고, 문구/레이아웃/표현 기준을 기존 구조에 맞춰 적용했다.
- R: 리뷰어와 QA가 확인할 기준이 명확해졌고, 사용자에게 노출되는 표현의 일관성이 개선됐다.
- Stage 판단: Stage 2~3 후보: 단순 전달이 아니라 판단 가능한 기준으로 정리해 반영했다.
- 보강할 증거: [PR [#208](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/208)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2080), jira/PAYT-2197 -> develop

#### PR [#2007](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2007): [MP-1397] apply i18n at bank list

- 링크: [PR [#200](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/200)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2007)
- 생성일: 2026-05-06
- 브랜치: jira/MP-1397 -> develop
- S: [MP-1397] apply i18n at bank list 작업에서 화면 문구, i18n, T&C, UI 표현 또는 요구사항 해석이 필요했다.
- T: 기획/디자인/API 기준을 화면 동작과 문구로 일관되게 반영해야 했다.
- A: 요구사항을 화면 단위로 나누고, 문구/레이아웃/표현 기준을 기존 구조에 맞춰 적용했다.
- R: 리뷰어와 QA가 확인할 기준이 명확해졌고, 사용자에게 노출되는 표현의 일관성이 개선됐다.
- Stage 판단: Stage 2~3 후보: 단순 전달이 아니라 판단 가능한 기준으로 정리해 반영했다.
- 보강할 증거: [PR [#200](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/200)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2007), jira/MP-1397 -> develop

#### PR [#1509](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1509): [MP-1858] apply i18n to part of transferlimit screen

- 링크: [PR [#150](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/150)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1509)
- 생성일: 2026-03-20
- 브랜치: jira/MP-1858 -> develop
- S: [MP-1858] apply i18n to part of transferlimit screen 작업에서 화면 문구, i18n, T&C, UI 표현 또는 요구사항 해석이 필요했다.
- T: 기획/디자인/API 기준을 화면 동작과 문구로 일관되게 반영해야 했다.
- A: 요구사항을 화면 단위로 나누고, 문구/레이아웃/표현 기준을 기존 구조에 맞춰 적용했다.
- R: 리뷰어와 QA가 확인할 기준이 명확해졌고, 사용자에게 노출되는 표현의 일관성이 개선됐다.
- Stage 판단: Stage 2~3 후보: 단순 전달이 아니라 판단 가능한 기준으로 정리해 반영했다.
- 보강할 증거: [PR [#150](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/150)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1509), jira/MP-1858 -> develop

#### PR [#1486](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1486): [MP-982] apply i18n again at transferlimit screen

- 링크: [PR [#148](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/148)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1486)
- 생성일: 2026-03-19
- 브랜치: jira/MP-982 -> develop
- S: [MP-982] apply i18n again at transferlimit screen 작업에서 화면 문구, i18n, T&C, UI 표현 또는 요구사항 해석이 필요했다.
- T: 기획/디자인/API 기준을 화면 동작과 문구로 일관되게 반영해야 했다.
- A: 요구사항을 화면 단위로 나누고, 문구/레이아웃/표현 기준을 기존 구조에 맞춰 적용했다.
- R: 리뷰어와 QA가 확인할 기준이 명확해졌고, 사용자에게 노출되는 표현의 일관성이 개선됐다.
- Stage 판단: Stage 2~3 후보: 단순 전달이 아니라 판단 가능한 기준으로 정리해 반영했다.
- 보강할 증거: [PR [#148](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/148)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1486), jira/MP-982 -> develop

#### PR [#1266](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1266): [MP-853] add 'export with watermark' param at eslip screen

- 링크: [PR [#126](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/126)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1266)
- 생성일: 2026-03-06
- 브랜치: jira/MP-853 -> develop
- S: [MP-853] add 'export with watermark' param at eslip screen 작업에서 화면 문구, i18n, T&C, UI 표현 또는 요구사항 해석이 필요했다.
- T: 기획/디자인/API 기준을 화면 동작과 문구로 일관되게 반영해야 했다.
- A: 요구사항을 화면 단위로 나누고, 문구/레이아웃/표현 기준을 기존 구조에 맞춰 적용했다.
- R: 리뷰어와 QA가 확인할 기준이 명확해졌고, 사용자에게 노출되는 표현의 일관성이 개선됐다.
- Stage 판단: Stage 2~3 후보: 단순 전달이 아니라 판단 가능한 기준으로 정리해 반영했다.
- 보강할 증거: [PR [#126](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/126)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1266), jira/MP-853 -> develop

### 보조 증거 PR 목록

- [[#208](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/208)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2080) | 2026-05-12 | [PAYT-2197] Promptpay t&c with HTML url | jira/PAYT-2197 -> develop
- [[#200](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/200)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2007) | 2026-05-06 | [MP-1397] apply i18n at bank list | jira/MP-1397 -> develop
- [[#162](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/162)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1628) | 2026-03-30 | [MP-1055] apply pressed style at transfer limit screen | jira/MP-1055 -> develop
- [[#150](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/150)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1509) | 2026-03-20 | [MP-1858] apply i18n to part of transferlimit screen | jira/MP-1858 -> develop
- [[#148](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/148)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1486) | 2026-03-19 | [MP-982] apply i18n again at transferlimit screen | jira/MP-982 -> develop
- [[#134](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/134)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1346) | 2026-03-11 | [MP-896] add header padding to improve layout | jira/MP-896 -> develop
- [[#127](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/127)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1279) | 2026-03-09 | [MP-864] move up CTA button at some dev Screens | jira/MP-864 -> develop
- [[#126](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/126)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1266) | 2026-03-06 | [MP-853] add 'export with watermark' param at eslip screen | jira/MP-853 -> develop
- [[#112](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/112)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1121) | 2026-02-23 | [PAYT-1712] Mock PromptPay Registration T&C screen | jira/PAYT-1712 -> develop
- [[#68](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/68)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/688) | 2026-01-12 | [MP-416] first save&resume screen must show bottom to top. | jira/MP-416 -> develop
- [[#63](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/63)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/636) | 2026-01-06 | [PLF-899] NDID consent screen (decline) | jira/PLF-899 -> develop
- [[#62](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/62)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/620) | 2026-01-06 | [PLF-895] add NDID t&c api | jira/PLF-895-infra -> develop
- [[#61](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/61)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/618) | 2026-01-06 | [PLF-895] NDID consent screen (accept) | jira/PLF-895 -> develop
- [[#57](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/57)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/572) | 2025-12-26 | [PLF-906] feat: add conditional exit button header to CASA introduction screen | jira/PLF-906 -> develop
- [[#39](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/39)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/394) | 2025-12-01 | [MP-226] remove loading ui when NDID polling | jira/MP-226 -> develop
- [[#31](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/31)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/312) | 2025-11-24 | [MP-190] feat: add QA bypass button in digital ID verification screen | jira/MP-190 -> develop
- [[#26](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/26)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/265) | 2025-11-17 | [MP-172] block to goback at T&C screen | jira/MP-172 -> develop
- [[#25](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/25)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/259) | 2025-11-14 | [MP-169] create NDID flow ui | jira/MP-169 -> develop
- [[#23](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/23)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/237) | 2025-11-12 | [PLF-315] mock email otp screen with mock api | jira/PLF-315 -> develop
- [[#21](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/21)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/211) | 2025-11-06 | [PLF-316] email input screen (only-ui logic) | jira/PLF-316 -> develop
- [[#12](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/12)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/125) | 2025-10-23 | [MP-92] remove Korean locale from translation checks | jira/MP-92 -> develop
- [[#11](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/11)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/116) | 2025-10-21 | [MP-88] refactor: Terms screen | jira/MP-88 -> develop
- [[#10](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/10)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/101) | 2025-10-16 | [PLF-116] OTP screen resend feature | jira/PLF-116 -> develop
- [[#5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/5)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/58) | 2025-09-25 | [PLF-86] add html renderer | jira/PLF-86-5 -> jira/PLF-86-4
- [[#5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/5)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/57) | 2025-09-25 | [PLF-86] time formatting on T&C screen | jira/PLF-86-4 -> develop
- [[#5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/5)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/56) | 2025-09-25 | [PLF-86] set user token in T&C screen | jira/PLF-86-3 -> develop
- [[#5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/5)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/52) | 2025-09-25 | [PLF-86] T&C screen (api integration + clean up) | jira/PLF-86-2 -> develop
- [[#4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/4)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/46) | 2025-09-24 | T&C screen (mock) | jira/PLF-86 -> develop

## 성과 영향력

- Stage 2~3 근거: 담당 기능을 안정적으로 완성해 제품 플로우와 팀 품질 리스크 감소에 기여했다.
- 1on1 한 줄: 송금/QR/e-slip/계좌 같은 주요 제품 플로우에서 담당 기능을 안정적으로 마무리해 품질 리스크를 줄였습니다.

### 대표 STAR 후보

#### PR [#2053](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2053): [MP-1432] update account number length 16 from 15

- 링크: [PR [#205](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/205)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2053)
- 생성일: 2026-05-08
- 브랜치: jira/MP-1432 -> develop
- S: [MP-1432] update account number length 16 from 15 작업에서 송금, QR, e-slip, 계좌, 온보딩 등 제품 주요 플로우 개선이 필요했다.
- T: 제품 흐름의 품질과 안정성을 유지하면서 담당 기능을 완성해야 했다.
- A: 기존 화면 흐름과 공통 컴포넌트 사용 방식을 확인하고, 필요한 기능/분기/상태 처리를 구현했다.
- R: 담당 기능이 제품 플로우 안에서 동작하게 되었고, 사용자 경험 또는 운영 안정성에 기여했다.
- Stage 판단: Stage 2~3 후보: 개인 담당 업무를 안정적으로 끝내고 팀/제품 리스크 감소에 기여했다.
- 보강할 증거: [PR [#205](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/205)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2053), jira/MP-1432 -> develop

#### PR [#1982](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1982): [MP-1365] Replace to BankxResultCase - Cardless ATM

- 링크: [PR [#198](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/198)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1982)
- 생성일: 2026-05-04
- 브랜치: jira/MP-1365 -> develop
- S: [MP-1365] Replace to BankxResultCase - Cardless ATM 작업에서 송금, QR, e-slip, 계좌, 온보딩 등 제품 주요 플로우 개선이 필요했다.
- T: 제품 흐름의 품질과 안정성을 유지하면서 담당 기능을 완성해야 했다.
- A: 기존 화면 흐름과 공통 컴포넌트 사용 방식을 확인하고, 필요한 기능/분기/상태 처리를 구현했다.
- R: 담당 기능이 제품 플로우 안에서 동작하게 되었고, 사용자 경험 또는 운영 안정성에 기여했다.
- Stage 판단: Stage 2~3 후보: 개인 담당 업무를 안정적으로 끝내고 팀/제품 리스크 감소에 기여했다.
- 보강할 증거: [PR [#198](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/198)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1982), jira/MP-1365 -> develop

#### PR [#1981](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1981): [MP-1381] Refactoring to BankxResultCase - eslip verification result screeen

- 링크: [PR [#198](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/198)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1981)
- 생성일: 2026-05-04
- 브랜치: jira/MP-1381 -> develop
- S: [MP-1381] Refactoring to BankxResultCase - eslip verification result screeen 작업에서 송금, QR, e-slip, 계좌, 온보딩 등 제품 주요 플로우 개선이 필요했다.
- T: 제품 흐름의 품질과 안정성을 유지하면서 담당 기능을 완성해야 했다.
- A: 기존 화면 흐름과 공통 컴포넌트 사용 방식을 확인하고, 필요한 기능/분기/상태 처리를 구현했다.
- R: 담당 기능이 제품 플로우 안에서 동작하게 되었고, 사용자 경험 또는 운영 안정성에 기여했다.
- Stage 판단: Stage 2~3 후보: 개인 담당 업무를 안정적으로 끝내고 팀/제품 리스크 감소에 기여했다.
- 보강할 증거: [PR [#198](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/198)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1981), jira/MP-1381 -> develop

#### PR [#1692](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1692): [PAYT-1981] separate tranfer limit cardless ATM section

- 링크: [PR [#169](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/169)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1692)
- 생성일: 2026-04-03
- 브랜치: jira/PAYT-1981 -> develop
- S: [PAYT-1981] separate tranfer limit cardless ATM section 작업에서 송금, QR, e-slip, 계좌, 온보딩 등 제품 주요 플로우 개선이 필요했다.
- T: 제품 흐름의 품질과 안정성을 유지하면서 담당 기능을 완성해야 했다.
- A: 기존 화면 흐름과 공통 컴포넌트 사용 방식을 확인하고, 필요한 기능/분기/상태 처리를 구현했다.
- R: 담당 기능이 제품 플로우 안에서 동작하게 되었고, 사용자 경험 또는 운영 안정성에 기여했다.
- Stage 판단: Stage 2~3 후보: 개인 담당 업무를 안정적으로 끝내고 팀/제품 리스크 감소에 기여했다.
- 보강할 증거: [PR [#169](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/169)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1692), jira/PAYT-1981 -> develop

#### PR [#1312](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1312): [PAYT-1689] redesign transfer limit

- 링크: [PR [#131](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/131)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1312)
- 생성일: 2026-03-10
- 브랜치: jira/PAYT-1689 -> develop
- S: [PAYT-1689] redesign transfer limit 작업에서 송금, QR, e-slip, 계좌, 온보딩 등 제품 주요 플로우 개선이 필요했다.
- T: 제품 흐름의 품질과 안정성을 유지하면서 담당 기능을 완성해야 했다.
- A: 기존 화면 흐름과 공통 컴포넌트 사용 방식을 확인하고, 필요한 기능/분기/상태 처리를 구현했다.
- R: 담당 기능이 제품 플로우 안에서 동작하게 되었고, 사용자 경험 또는 운영 안정성에 기여했다.
- Stage 판단: Stage 2~3 후보: 개인 담당 업무를 안정적으로 끝내고 팀/제품 리스크 감소에 기여했다.
- 보강할 증거: [PR [#131](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/131)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1312), jira/PAYT-1689 -> develop

### 보조 증거 PR 목록

- [[#205](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/205)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/2053) | 2026-05-08 | [MP-1432] update account number length 16 from 15 | jira/MP-1432 -> develop
- [[#198](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/198)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1982) | 2026-05-04 | [MP-1365] Replace to BankxResultCase - Cardless ATM | jira/MP-1365 -> develop
- [[#198](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/198)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1981) | 2026-05-04 | [MP-1381] Refactoring to BankxResultCase - eslip verification result screeen | jira/MP-1381 -> develop
- [[#169](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/169)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1694) | 2026-04-03 | [MP-1180] add animation option to onboarding navigation | jira/MP-1180 -> develop
- [[#169](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/169)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1692) | 2026-04-03 | [PAYT-1981] separate tranfer limit cardless ATM section | jira/PAYT-1981 -> develop
- [[#126](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/126)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1267) | 2026-03-06 | [PAYT-1689] add ruler component | jira/PAYT-1689-ruler -> develop
- [[#123](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/123)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1233) | 2026-03-04 | [MP-821] show billerId instead of reference1 for bill payment | jira/MP-821 -> develop
- [[#122](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/122)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1226) | 2026-03-03 | [MP-809] QR scan - scaling qr area point | jira/MP-809 -> develop
- [[#121](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/121)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1213) | 2026-03-03 | [MP-773] block non-numeric input in account number and promptPay id | jira/MP-773 -> develop
- [[#110](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/110)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1100) | 2026-02-20 | Adjust ecl of eslip qr | chore/adjust-eslip-ecl -> develop
- [[#107](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/107)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1074) | 2026-02-19 | [PAYT-1682] Refactor qr scan flow for reusing | jira/PAYT-1682-refactor -> develop
- [[#107](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/107)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1073) | 2026-02-19 | [PAYT-1682] Handle 'BoT QR' + 'TypeOfAmount 1' + 'No amount value' case | jira/PAYT-1682 -> develop
- [[#104](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/104)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1043) | 2026-02-13 | [PAYT-1667] use react-native-share when img share | jira/PAYT-1667-tao -> develop
- [[#103](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/103)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1031) | 2026-02-13 | [MP-627] replace custom selected chip to BankXBadge component | jira/MP-627 -> develop
- [[#95](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/95)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/951) | 2026-02-09 | implement transfer input amount | feat/storybook-input-amount -> develop
- [[#93](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/93)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/936) | 2026-02-06 | [PAYT-1613] send QR reference data for all bill payments | jira/PAYT-1613 -> jira/PAYT-1521
- [[#92](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/92)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/925) | 2026-02-06 | [PAYT-1537] add typeOfAmount at BoT QR | jira/PAYT-1537 -> develop
- [[#90](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/90)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/906) | 2026-02-05 | Add animated TransferAmountInputField component | jira/PAYT-1521-amount-input-field -> develop
- [[#89](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/89)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/898) | 2026-02-05 | Add Bill Payment Reference components | jira/PAYT-1521-bill-payment-reference -> develop
- [[#89](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/89)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/897) | 2026-02-05 | Add RecipientDisplay component | jira/PAYT-1521-recipient-display -> develop
- [[#80](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/80)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/805) | 2026-01-27 | [PAYT-1466] Support CRLF string at BOT qr string | jira/PAYT-1466 -> develop
- [[#68](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/68)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/687) | 2026-01-09 | [PLF-1049] skip IDP selection when pre NDID flow is existed | jira/PLF-1049 -> develop
- [[#58](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/58)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/586) | 2025-12-30 | [MP-327] refactoring otp code | jira/MP-327 -> develop
- [[#38](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/38)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/387) | 2025-12-01 | [MP-225] replace WHITE100 with BG_WHITE in ndid-verification components | jira/MP-225 -> develop
- [[#34](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/34)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/348) | 2025-11-27 | [MP-176] QR code generation with qrcode-svg | jira/MP-176-qrcode-svg -> develop
- [[#29](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/29)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/299) | 2025-11-20 | [PLF-336] NDID verification - success | jira/PLF-336 -> develop
- [[#28](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/28)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/288) | 2025-11-19 | [PLF-489] api intergration - get NDID provider | jira/PLF-489 -> develop
- [[#28](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/28)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/284) | 2025-11-19 | [MP-180] support bankxeffect cleanup | jira/MP-180-support-bankxeffect-cleanup -> develop
- [[#27](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/27)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/276) | 2025-11-18 | [MP-179] support useBankXCallback to worklet functions | jira/MP-179 -> develop
- [[#25](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/25)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/252) | 2025-11-14 | [PLF-329] NDID request - no enrolled IdP app (mock) | jira/PLF-329 -> develop
- [[#23](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/23)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/235) | 2025-11-12 | [PLF-318] implement SendEmailOTP API | jira/PLF-318 -> develop
- [[#22](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/22)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/224) | 2025-11-10 | [MP-151] Rename sms OTP api spec | jira/MP-151 -> develop
- [[#22](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/22)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/222) | 2025-11-10 | [MP-123] use BankxCTAButtonSubmitter | jira/MP-123 -> develop

## 사람 영향력

- Stage 2~3 근거: 동료가 재사용하거나 판단할 수 있는 공통 기반/개발 편의 개선에 기여했다.
- 1on1 한 줄: 공통 컴포넌트, 헬퍼, 개발 편의 개선을 통해 동료가 같은 작업을 더 쉽게 반복할 수 있게 했습니다.

### 대표 STAR 후보

#### PR [#1792](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1792): [MP-1258] add qa skip button

- 링크: [PR [#179](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/179)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1792)
- 생성일: 2026-04-14
- 브랜치: jira/MP-1258 -> develop
- S: [MP-1258] add qa skip button 작업에서 팀이 재사용하거나 유지보수할 수 있는 기반 개선이 필요했다.
- T: 동료가 같은 패턴을 더 쉽게 사용하거나 판단할 수 있도록 공통 기반을 정리해야 했다.
- A: 기존 사용처와 변경 영향을 확인하고, 재사용 가능한 형태로 컴포넌트/헬퍼/가이드를 정리했다.
- R: 반복 작업이 줄고, 동료가 유사 작업을 진행할 때 참고할 수 있는 기반이 생겼다.
- Stage 판단: Stage 2~3 후보: 동료 협업과 실질적인 개선 도움으로 볼 수 있다.
- 보강할 증거: [PR [#179](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/179)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1792), jira/MP-1258 -> develop

#### PR [#1595](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1595): [MP-1083] update currency code to use getCurrencyUnit

- 링크: [PR [#159](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/159)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1595)
- 생성일: 2026-03-26
- 브랜치: jira/MP-1083 -> develop
- S: [MP-1083] update currency code to use getCurrencyUnit 작업에서 팀이 재사용하거나 유지보수할 수 있는 기반 개선이 필요했다.
- T: 동료가 같은 패턴을 더 쉽게 사용하거나 판단할 수 있도록 공통 기반을 정리해야 했다.
- A: 기존 사용처와 변경 영향을 확인하고, 재사용 가능한 형태로 컴포넌트/헬퍼/가이드를 정리했다.
- R: 반복 작업이 줄고, 동료가 유사 작업을 진행할 때 참고할 수 있는 기반이 생겼다.
- Stage 판단: Stage 2~3 후보: 동료 협업과 실질적인 개선 도움으로 볼 수 있다.
- 보강할 증거: [PR [#159](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/159)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1595), jira/MP-1083 -> develop

#### PR [#1328](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1328): [MP-890] deprecated marking at spacer

- 링크: [PR [#132](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/132)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1328)
- 생성일: 2026-03-11
- 브랜치: jira/MP-890 -> develop
- S: [MP-890] deprecated marking at spacer 작업에서 팀이 재사용하거나 유지보수할 수 있는 기반 개선이 필요했다.
- T: 동료가 같은 패턴을 더 쉽게 사용하거나 판단할 수 있도록 공통 기반을 정리해야 했다.
- A: 기존 사용처와 변경 영향을 확인하고, 재사용 가능한 형태로 컴포넌트/헬퍼/가이드를 정리했다.
- R: 반복 작업이 줄고, 동료가 유사 작업을 진행할 때 참고할 수 있는 기반이 생겼다.
- Stage 판단: Stage 2~3 후보: 동료 협업과 실질적인 개선 도움으로 볼 수 있다.
- 보강할 증거: [PR [#132](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/132)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1328), jira/MP-890 -> develop

#### PR [#1182](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1182): [MP-489] include storybook only local/develop bundle

- 링크: [PR [#118](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/118)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1182)
- 생성일: 2026-02-27
- 브랜치: jira/MP-489 -> develop
- S: [MP-489] include storybook only local/develop bundle 작업에서 팀이 재사용하거나 유지보수할 수 있는 기반 개선이 필요했다.
- T: 동료가 같은 패턴을 더 쉽게 사용하거나 판단할 수 있도록 공통 기반을 정리해야 했다.
- A: 기존 사용처와 변경 영향을 확인하고, 재사용 가능한 형태로 컴포넌트/헬퍼/가이드를 정리했다.
- R: 반복 작업이 줄고, 동료가 유사 작업을 진행할 때 참고할 수 있는 기반이 생겼다.
- Stage 판단: Stage 2~3 후보: 동료 협업과 실질적인 개선 도움으로 볼 수 있다.
- 보강할 증거: [PR [#118](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/118)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1182), jira/MP-489 -> develop

#### PR [#898](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/898): Add Bill Payment Reference components

- 링크: [PR [#89](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/89)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/898)
- 생성일: 2026-02-05
- 브랜치: jira/PAYT-1521-bill-payment-reference -> develop
- S: Add Bill Payment Reference components 작업에서 팀이 재사용하거나 유지보수할 수 있는 기반 개선이 필요했다.
- T: 동료가 같은 패턴을 더 쉽게 사용하거나 판단할 수 있도록 공통 기반을 정리해야 했다.
- A: 기존 사용처와 변경 영향을 확인하고, 재사용 가능한 형태로 컴포넌트/헬퍼/가이드를 정리했다.
- R: 반복 작업이 줄고, 동료가 유사 작업을 진행할 때 참고할 수 있는 기반이 생겼다.
- Stage 판단: Stage 2~3 후보: 동료 협업과 실질적인 개선 도움으로 볼 수 있다.
- 보강할 증거: [PR [#89](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/89)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/898), jira/PAYT-1521-bill-payment-reference -> develop

### 보조 증거 PR 목록

- [[#179](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/179)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1792) | 2026-04-14 | [MP-1258] add qa skip button | jira/MP-1258 -> develop
- [[#159](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/159)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1595) | 2026-03-26 | [MP-1083] update currency code to use getCurrencyUnit | jira/MP-1083 -> develop
- [[#147](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/147)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1472) | 2026-03-18 | [MP-981] add elastic scroll prop | jira/MP-981 -> develop
- [[#132](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/132)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1328) | 2026-03-11 | [MP-890] deprecated marking at spacer | jira/MP-890 -> develop
- [[#118](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/118)2](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1182) | 2026-02-27 | [MP-489] include storybook only local/develop bundle | jira/MP-489 -> develop
- [[#99](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/99)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/997) | 2026-02-11 | add chevron_right_1 icon | feat/add-chevron-1 -> develop
- [[#77](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/77)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/773) | 2026-01-22 | [MP-505] Add OrbBackground Component with skia | jira/MP-505 -> develop
- [[#74](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/74)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/745) | 2026-01-16 | Apply storybook with sample code | storybook-test -> develop
- [[#72](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/72)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/721) | 2026-01-13 | [PLF-1092] pin input reset when change pin api was called | jira/PLF-1092 -> develop
- [[#71](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/71)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/714) | 2026-01-13 | [MP-444] Add save & resume "Today" term | jira/MP-444 -> develop
- [[#70](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/70)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/705) | 2026-01-12 | [PLF-1077] disable Biometrics when Change pin | jira/PLF-1077 -> develop
- [[#63](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/63)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/639) | 2026-01-06 | [PLF-1000][save&resume] implement save point SP3 | jira/PLF-1000 -> jira/PLF-999-2
- [[#63](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/63)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/638) | 2026-01-06 | [PLF-999][save&resume] implement save point SP1 | jira/PLF-999-2 -> jira/PLF-907
- [[#63](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/63)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/637) | 2026-01-06 | [PLF-999][save&resume] SP1 verification method | jira/PLF-999 -> jira/PLF-907
- [[#61](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/61)5](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/615) | 2026-01-05 | [PLF-907][save&resume] implement save point SP0 | jira/PLF-907 -> develop
- [[#57](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/57)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/577) | 2025-12-30 | [PLF-800] add Home feature + save&resume card | jira/PLF-800 -> develop
- [[#56](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/56)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/564) | 2025-12-24 | [Again][PLF-775] add: mobile number change flow (with MOCK api) | feature/mobile-number-change -> develop
- [[#51](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/51)7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/517) | 2025-12-17 | [PLF-774] apply change-pin, confirm change-pin api | jira/PLF-774 -> develop
- [[#50](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/50)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/503) | 2025-12-15 | [PLF-773] add change-pin flow (mock api) | jira/PLF-773 -> develop
- [[#49](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/49)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/491) | 2025-12-12 | [MP-284] exclude symlinked config files from pre-commit checks | jira/MP-284 -> develop
- [[#48](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/48)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/488) | 2025-12-12 | [PLF-691] add settings feature | jira/PLF-691 -> develop
- [[#47](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/47)1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/471) | 2025-12-10 | [MP-270] refactor: jest.config.js, jest.setup.js | jira/MP-270 -> develop
- [[#46](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/46)6](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/466) | 2025-12-10 | [MP-252] upgrade react-navigation v6 -> v7 | jira/MP-252 -> develop
- [[#45](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/45)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/450) | 2025-12-08 | [MP-251] make jest.setup.js to symlink | jira/MP-251-2 -> develop
- [[#35](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/35)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/358) | 2025-11-28 | [MP-212] remove unnecessary test code | jira/MP-212 -> develop
- [[#33](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/33)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/334) | 2025-11-26 | [PLF-572] feat: remove QA skip button and update FATCA/CRS navigation flow | jira/PLF-572 -> develop
- [[#32](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/32)0](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/320) | 2025-11-25 | feat: add deeplink support | jira/PLF-336-deeplinking -> develop
- [[#31](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/31)9](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/319) | 2025-11-25 | feat: add openUrl utility with fallback URL | jira/PLF-336-openurl -> develop
- [[#21](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/21)4](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/214) | 2025-11-07 | [MP-124] Refactor: index is always barrel file | jira/MP-124 -> develop
- [[#16](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/16)8](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/168) | 2025-10-30 | Enhance svg usage | jira/MP-111 -> develop
- [[#15](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/15)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/153) | 2025-10-28 | feat: add contextMenuHidden prop | jira/MP-279 -> develop
- [[#7](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/7)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/73) | 2025-10-01 | refactor carousel + enhance test code | feat/enhance-carousel -> develop
- [[#1](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/1)3](https://bitbucket.org/bank-x/mobile-app-workspace/pull-requests/13) | 2025-09-16 | [PLF-80] welcom page | jira/PLF-80 -> develop

## 제외 기준

- `DECLINED` PR 23개는 대표 사례에서 제외한다. 필요하면 시행착오/방향 전환 근거로만 별도 확인한다.
- `OPEN` PR 1개는 완료 성과가 아니므로 대표 사례에서 제외한다.

## 최종 점검

- MERGED PR 수: 177개
- 역량별 합계: 177개
- 각 역량별 대표 STAR 후보: 5개
- 각 대표 후보 필드: `S/T/A/R`, `Stage 판단`, `보강할 증거` 포함
