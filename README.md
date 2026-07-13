# 유니디아 견적 플로우

승인된 2개 계정만 로그인해서 쓰는 모바일 웹 견적 도구입니다. Expo(React Native, 웹 빌드 포함) 프런트엔드와 Node/tRPC 백엔드, MySQL로 구성되어 있고 단일 Railway 서비스로 배포합니다.

> 견적 계산은 현재 캐피탈사 수식을 코드로 흉내낸 **시뮬레이션 엔진**입니다. 실제 캐피탈사 Excel과 결과가 검증되기 전까지는 고객에게 발송하지 말고 연습용으로만 사용하세요. 실제 Excel 연동 계획은 [docs/excel-bridge.md](docs/excel-bridge.md)를 참고하세요.

## 기술 스택

* **프런트엔드**: Expo Router (React Native + 웹), tRPC 클라이언트, NativeWind
* **백엔드**: Express + tRPC, JWT 쿠키 기반 이메일/비밀번호 로그인
* **DB**: MySQL (Drizzle ORM) — 상담 이력과 캐피탈사 금리를 서버에 저장해 두 계정이 함께 조회/수정
* **AI 이미지 추출**: Google Gemini API (OpenAI 호환 엔드포인트)

## 로컬 개발

```bash
pnpm install
cp .env.example .env   # 값 채우기
pnpm db:push            # DATABASE_URL에 테이블 생성
pnpm dev                 # 서버(3000) + 웹(8081) 동시 구동
```

## 배포 (Railway 기준)

1. Railway에 새 프로젝트를 만들고 "MySQL" 플러그인을 추가합니다 → `DATABASE_URL`이 자동으로 채워집니다.
2. 같은 프로젝트에 이 저장소를 GitHub 연결로 추가합니다 (Node 서비스).
3. 아래 환경변수를 Railway 서비스 설정에 채웁니다 (`.env.example` 참고).
4. 빌드 명령: `pnpm build` (서버 번들 + 웹 정적 빌드를 함께 생성합니다), 시작 명령: `pnpm start`.
5. 배포 후 한 번, Railway 콘솔에서 `pnpm db:push`를 실행해 테이블을 만듭니다 (또는 배포 파이프라인에 포함).
6. Railway가 발급한 URL이 두 분이 접속할 주소입니다. 폰 브라우저에서 그대로 열면 됩니다.

## 환경변수

`.env.example`에 전체 목록이 있습니다. 요약:

| 변수 | 용도 |
|---|---|
| `DATABASE_URL` | MySQL 연결 문자열 (Railway MySQL 플러그인이 자동 제공) |
| `JWT_SECRET` | 로그인 세션 쿠키 서명 키. 아무 긴 무작위 문자열이면 됩니다 |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/)에서 발급받은 키. AI 이미지 추출에 사용 |
| `AUTH_USER_1_EMAIL` / `AUTH_USER_1_PASSWORD` | 첫 번째 계정 |
| `AUTH_USER_2_EMAIL` / `AUTH_USER_2_PASSWORD` | 두 번째 계정 |
| `EXPO_PUBLIC_API_BASE_URL` | 보통 비워둡니다 (웹은 같은 도메인을 자동으로 씁니다). 프런트/백엔드를 다른 도메인에 분리 배포할 때만 설정 |

## 금리 업데이트

캐피탈사에서 매달 새 금리를 받으면 코드를 고칠 필요 없이, 앱 안 **설정 → 캐피탈사 금리 수정** 화면에서 바로 반영합니다.
