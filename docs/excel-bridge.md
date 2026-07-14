# Excel 검증 연동 (Microsoft Graph Excel API)

## 현재 앱의 책임

현재 모바일 앱은 문의 캡처 선택, AI 구조화 추출, 상담사 검수, 금융사·상품 선택, 할인·수수료·잔가 조정, 결정론적 견적 시뮬레이션, 고객 발송 문구 생성과 서버 DB 아카이빙(두 상담사 공유)을 담당한다. 계산 결과에는 입력 스냅샷을 함께 저장해 동일 조건을 재현할 수 있도록 한다. 이 시뮬레이션 엔진은 캐피탈사 수식을 코드로 흉내낸 것이라, 아래 Graph API 연동으로 실제 Excel과 대조 검증되기 전까지는 **연습용으로만 사용하고 고객에게 발송하지 않는다.**

## 실제 Excel 연동이 필요한 이유

Microsoft Excel 원본 파일의 수식, 매크로, 외부 연결과 인쇄 영역을 그대로 실행하려면 진짜 Excel 연산 엔진이 필요하다. Expo 모바일 런타임이나 Railway에 올라간 Node 서버에서는 Excel COM 자동화(xlwings 등)를 직접 실행할 수 없다.

## 권장 구성: Microsoft Graph Excel API

캐피탈사 원본 엑셀 파일을 **OneDrive/SharePoint(Microsoft 365 비즈니스 계정)**에 업로드해 보관한다. Railway에 있는 API 서버가 Microsoft Graph의 Excel REST API로 지정된 셀에 값을 쓰고, Excel 자체 연산 엔진이 재계산한 결과를 다시 읽어온다. 별도 서버를 띄우거나 관리할 필요가 없고(요청은 항상 Railway → Microsoft로 나가는 아웃바운드 HTTPS 호출), Excel 무인 자동화 라이선스 문제도 없다 — Microsoft가 공식 지원하는 사용법이다.

이 방식을 채택한 이유(Windows PC 브리지 대비): 앱이 이미 Railway 클라우드에 배포되어 있어서, 사내 PC를 인터넷에 노출시켜야 하는 브리지 구조는 이제 안 맞는다. 자세한 비교는 문서 하단 "대안" 참고.

| 구간 | 책임 |
| --- | --- |
| 모바일 앱 | 입력 수집, 검수, 견적 요청 생성, 결과 표시 및 아카이빙 |
| Railway API 서버 | 캐피탈사·상품 ID로 승인된 템플릿 선택, Graph API 세션 생성, 셀 입력, 재계산 대기, 결과 추출 |
| Microsoft Graph Excel API | OneDrive/SharePoint에 있는 실제 Excel 파일을 열어 셀 값을 쓰고 재계산된 값을 반환 |
| Excel 템플릿 (OneDrive) | 캐피탈사 공식 수식, 승인된 셀 매핑, 인쇄 레이아웃 |

### 필요한 사전 준비

- Microsoft 365 비즈니스 구독 (OneDrive/SharePoint 포함)
- Azure AD(Entra ID) 앱 등록 — 클라이언트 ID/시크릿 발급, `Files.ReadWrite` 권한 부여, 클라이언트 자격 증명 흐름으로 액세스 토큰 발급·자동 갱신 처리
- 캐피탈사별 원본 엑셀 파일을 OneDrive의 정해진 폴더에 업로드하고, 파일 ID를 템플릿-버전 매핑표에 등록

### 주의: 재계산은 자동이 아닐 수 있다

워크북의 계산 모드가 "수동"으로 설정되어 있으면 셀 값을 써도 자동으로 재계산되지 않는다. 셀 입력 후 `POST /workbook/application/calculate` (`calculationType: "Recalculate"`)를 명시적으로 호출하고, 그 응답 이후에 결과 셀을 읽어야 한다. 이 호출을 빠뜨리면 이전 값(또는 빈 값)을 "재계산된 값"으로 오인해 반환하는 조용한 오류가 생길 수 있다.

## 요청 계약 예시

서버 내부에서 캐피탈사·상품 ID로 템플릿을 고르고, 아래와 같은 입력을 받아 Graph API 워크북 세션(`persistChanges: false`)을 열고 지정된 셀에 값을 쓴 뒤 재계산 결과를 읽어온다.

```json
{
  "quoteId": "local-uuid",
  "templateId": "capital-product-version",
  "vehicle": {
    "brand": "현대",
    "model": "그랜저",
    "trim": "캘리그래피",
    "price": 52000000
  },
  "terms": {
    "months": 48,
    "annualMileageKm": 20000,
    "discountAmount": 2500000,
    "feeRate": 2.5,
    "residualMode": "maximum"
  }
}
```

응답에는 `monthlyPayment`, `initialCost`, `residualValue`, `templateVersion`, `calculatedAt`이 포함되어야 한다. 결과 시트를 이미지로 남기고 싶다면 Graph API로 해당 범위를 렌더링하거나, 셀 값만 받아 앱 쪽에서 기존 견적 카드 UI로 다시 그리는 방식도 가능하다.

## 안전 규칙

서버는 임의 파일 경로, 임의 시트명 또는 임의 셀 주소를 요청에서 받지 않는다. 템플릿(OneDrive 파일 ID)과 셀 매핑은 서버 내부의 승인 목록으로만 관리한다. 요청마다 **비영구 워크북 세션**(`persistChanges: false`)을 새로 열어 계산 후 즉시 세션을 닫아, 요청 간 상태가 섞이지 않게 한다. 매크로가 포함된 파일은 Graph API로 실행되지 않으므로, 매크로 의존도가 높은 캐피탈사 템플릿은 별도 검토가 필요하다. 결과에는 템플릿 버전과 입력 해시를 남긴다.

## 장애 처리

Graph API 호출 실패, 수식 오류, 세션 시간 초과 시 앱은 기존 로컬 시뮬레이터 값을 공식 견적으로 오인해 확정하지 않는다. Graph API 결과에 `verified: true`가 있을 때만 "Excel 검증 완료" 상태로 전환하고, 실패 시 재시도와 수기 확인 안내를 제공한다.

## 대안: Windows PC 브리지 (비추천)

Windows 상담 PC에 Excel과 xlwings를 설치하고 로컬 브리지 서비스를 띄워 COM 자동화로 직접 연동하는 방식도 가능은 하다. 하지만 지금 아키텍처(Railway 클라우드 배포)에는 맞지 않는다:

- 브리지는 원래 "사내망 안에서만 통신"을 전제로 하는데, 앱이 이제 인터넷(Railway)에 있어서 사내 PC를 외부에 노출해야 함 (포트포워딩/VPN/터널링 필요)
- PC가 꺼지거나 인터넷이 끊기면 기능 전체가 마비됨 (가용성 낮음)
- PC를 외부에 노출하는 순간 공격 표면이 커짐 — "리스크 최소화"라는 원래 프로젝트 취지와 반대 방향
- Excel 무인 자동화는 Microsoft 라이선스 약관상 회색지대
- 브리지 서비스 자체를 직접 만들고 유지보수해야 함

캐피탈사 템플릿이 매크로·외부연결에 심하게 의존해서 Graph API로 도저히 재현이 안 되는 경우에만 예외적으로 재검토한다. 이 경우에도 위 "안전 규칙"과 "장애 처리" 원칙(승인된 템플릿·셀만 사용, `verified: true`가 있을 때만 확정)은 동일하게 적용해야 한다.
