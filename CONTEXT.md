# Rider Identity Control

배달 플랫폼이 라이더 명의 대여·대리 운행을 줄이기 위해 운영하는 본인확인·계정 통제 영역.

## Language

**Operator**:
본인확인 통제를 설계·운영·로그를 보유하는 주체. 이 맥락에서는 배달 플랫폼을 가리킨다.
_Avoid_: 위탁사, 정부, 협회 (단독 운영 주체로 쓸 때)

**Rider Account**:
플랫폼에 등록된 라이더 단위. 명의자 정보·정산 계좌·운행 이력·통제 로그가 귀속된다.
_Avoid_: User, account (고객 계정과 혼동될 때)

**Primary Objective**:
통제 설계·운영에서 최우선으로 만족시킬 목표. 이 맥락에서는 국정감사·감사에 제출 가능한 증빙(설계 의도, 운영 통계, 감사 로그)이 1순위이며, 명의 대여 실질 차단은 부수 목표다.
_Avoid_: fraud prevention (1순위 목표로 쓸 때)

**Control**:
Operator가 Rider Account에 대해 문서화·로그화하여 운영하는 본인확인 또는 계정 통제 조치. 국감 증빙의 기본 단위다.
_Avoid_: feature, check (구현 용어로 쓸 때)

**Audit Evidence Package**:
국감·감사에서 통제 운영을 입증하기 위해 갖춰야 하는 최소 산출물 묶음. 이 맥락에서는 통제 설계서, 기간별 운영 통계, 익명화된 enforcement 샘플 사례를 포함한다.
_Avoid_: compliance report (범위가 더 넓을 때)

**Protected Population**:
통제로 인해 부당하게 피해를 받으면 안 되는 라이더 집단. 이 맥락에서는 신용불량 등으로 본인 명의 정산계좌를 쓰지 못해 타인 명의 계좌로 정산받는 정상 라이더를 포함한다.
_Avoid_: 예외 사용자, whitelist

**Nominal Lending**:
불법체류자 등이 **한국인 Rider Account 명의**를 빌려 등록·운행하는 행위. 플랫폼에 보이는 등록 정보는 한국인 명의이므로, 외국인 체류·비자 조회와는 직접 맞지 않는다.
_Avoid_: 명의 도용 (법률 용어가 다를 때), 대리 운행

**Residence Linkage**:
외국인등록·체류 자격 등 **출입국/체류 정보**를 Rider Account와 대조하는 통제. Nominal Lending 위협 모델(등록 명의가 한국인)에서는 **실효가 거의 없다**.
_Avoid_: 체류 연계, 비자 확인 (명의 대여 맥락에서 기대할 때)

**Settlement Account Verification**:
등록 명의와 정산계좌 **예금주 이름이 일치하는지** 검사하는 통제. 이 프로젝트에서는 **사용하지 않는다** — 신용불량자 등 Protected Population을 걸러내기 때문이다.
_Avoid_: 계좌 실명 확인, payout account match

**Account Access Verification**:
Rider Account에 **등록해 둔 정산계좌로 1원을 입금**하고, 입금자명·인증숫자 등으로 그 계좌에 **접근·통제할 수 있음**을 확인하는 조치. 예금주 이름이 등록 명의와 같은지는 **요구하지 않을 수 있다**.
_Avoid_: 계좌 1원 인증 (이름 일치 검사와 혼동할 때), Settlement Account Verification

**Re-authentication**:
이미 등록된 Rider Account에 대해 휴대폰 본인인증 등을 다시 요구하는 조치. 예측 불가 시점에 명의 대여자의 **동석·대리 응답 비용**을 올릴 수는 있으나, 빈도가 낮으면 **실질 차단**이 아니라 **불편·감사 로그**에 가깝다.
_Avoid_: 본인확인 (효과를 과장할 때)

**Control Effect**:
통제가 달성하는 효과의 종류. **Attestation**(국감·감사에 통제 운영을 입증)과 **Enforcement**(부정 이용을 실제로 중단)는 구분한다. 이 맥락에서 저빈도 Re-authentication은 주로 Attestation에 가깝다.
_Avoid_: prevention (입증과 차단을 혼용할 때)
