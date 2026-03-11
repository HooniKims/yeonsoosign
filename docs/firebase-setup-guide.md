# Firebase / Vercel 후속 설정 가이드

이 문서는 `tasks.md`의 `남은 후속 권장 작업` 1~6을 실제 배포 기준으로 수행할 때 필요한 체크리스트다.

## 1. Vercel 환경변수

Vercel Project Settings > Environment Variables에 아래 값을 모두 등록한다.

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_SCHOOL_SEARCH_ENDPOINT=/api/schools
VITE_ADMIN_API_ENDPOINT=/api/admins
NEIS_API_KEY=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

메모:
- `VITE_*` 값은 브라우저 번들에 주입된다.
- `NEIS_API_KEY`는 서버 함수 `api/schools.js`에서만 사용된다.
- `FIREBASE_ADMIN_*`는 서버 함수 `api/admins.js`에서만 사용된다.
- `FIREBASE_ADMIN_PRIVATE_KEY`는 줄바꿈을 포함한 키 원문을 넣거나 `\n` 이스케이프 문자열로 넣는다.
- 운영/프리뷰 환경을 분리한다면 둘 다 동일하게 넣는다.

## 2. Firebase Console 설정

Authentication:
- `Email/Password` provider 활성화
- `Google` provider 활성화
- 승인된 도메인에 운영 도메인과 Vercel 프리뷰 도메인 추가

Firestore:
- Native mode 사용
- Rules 탭에 루트의 [`firestore.rules`](/C:/Users/Administrator/Desktop/vibe_coding_progects/Codex_test/yeonsoo_sign/firestore.rules) 내용 적용

## 3. Firestore 데이터 구조

보안 규칙과 QR 서명 공개 접근을 같이 만족시키기 위해 학교 설정을 2개 컬렉션으로 분리했다.

- `admins/{uid}`
  - 본인만 읽기/업데이트 가능
  - `schoolId`, `schoolName`, `role`, `status`
- `schools/{schoolId}`
  - 공개 읽기 가능
  - 공유 링크 진입 시 필요한 공개 정보만 저장
  - `schoolName`, `officeName`, `gasWebAppUrl`, `enabled`
- `schoolPrivate/{schoolId}`
  - 같은 학교 관리자만 읽기/업데이트 가능
  - `defaultStaffCache`

주의:
- 기존 `schools/{schoolId}` 문서에 `defaultStaffCache`가 남아 있었다면 공개 읽기로 노출될 수 있다.
- 이번 코드에서는 학교 설정 저장 또는 기본 명단 저장 시 `schools` 문서의 legacy `defaultStaffCache` 필드를 자동 제거한다.
- 이미 운영 중인 학교가 있다면 관리자 화면에서 한 번 학교 설정 저장 또는 기본 명단 저장을 실행해 정리한다.

## 4. Rules 적용 절차

Firebase CLI를 쓰는 경우:

```bash
firebase deploy --only firestore:rules
```

CLI를 쓰지 않는 경우:
1. Firebase Console > Firestore Database > Rules 이동
2. [`firestore.rules`](/C:/Users/Administrator/Desktop/vibe_coding_progects/Codex_test/yeonsoo_sign/firestore.rules) 내용 붙여넣기
3. 게시(Publish)

## 5. 수동 E2E 체크리스트

관리자 인증:
1. 이메일 가입
2. Google 가입
3. 학교 검색 결과를 선택하지 않으면 가입이 차단되는지 확인
4. 가입 직후 `admins/{uid}`와 `schools/{schoolId}`가 생성되는지 확인
5. 기본 교직원 명단을 처음 저장한 뒤 `schoolPrivate/{schoolId}`가 생성되는지 확인

학교 설정:
1. 관리자 로그인
2. Apps Script URL 저장
3. 저장 직후 기존 연수 목록 조회 확인
4. 다른 브라우저 또는 시크릿 창 로그인 후 같은 학교 설정 재사용 확인

실사용 흐름:
1. 엑셀 업로드
2. 연수 등록
3. QR 또는 공유 링크 접속
4. 서명
5. 출력 / PDF 저장
6. 관리자 화면에서 서명 삭제

## 6. 이번 저장소에서 처리된 범위

이번 세션에서 저장소 기준으로 반영된 내용:
- 공개용 학교 설정과 관리자 전용 학교 설정 분리
- Firestore Rules 초안 추가
- 배포/검증 가이드 문서 추가
- `firebase.json` 추가
- `vitest` 기반 자동화 테스트 추가
  - `src/lib/auth.test.js`
  - `api/schools.test.js`
  - `src/lib/sessions.test.js`
  - `src/lib/staff.test.js`

아직 직접 수행하지 못한 내용:
- 실제 Firebase Console 반영
- 실제 Vercel 환경변수 입력
- 실브라우저 수동 E2E
- 실제 Google Apps Script 운영 URL 연동 검증

## 7. 로컬 검증 명령

```bash
npm test
npm run build
```
