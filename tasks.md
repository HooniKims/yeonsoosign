# Next Session Tasks

검증 일시: 2026-03-11  
현재 기준: 우선 이슈 1~12 반영 완료, Firebase/Vercel 핵심 설정 반영 완료, 실브라우저 수동 E2E 및 실운영 GAS 확인 후속 권장

## 이번 세션 반영 완료

### 1. 공개형 세션 중복 서명 방지
- 상태: 완료
- 처리 내용:
  1. `office` 세션에서 `소속 / 직위 / 이름`을 정규화한 고정 참가자 키를 사용하도록 변경
  2. 같은 정보로 다시 제출하면 새 항목을 추가하지 않고 기존 서명을 덮어쓰기하도록 정리
  3. 동일 정보 재서명 시 사용자 확인 창을 먼저 띄우도록 처리
- 관련 파일:
  - `src/components/SignerView.jsx`
- 메모:
  - 정책은 "재입력 차단"이 아니라 "같은 정보면 재서명 덮어쓰기"로 확정

### 2. CSV/TXT 명단 업로드 시 헤더 행 제거
- 상태: 완료
- 처리 내용:
  1. CSV/TXT/XLSX 모두 공통 헤더 감지 로직을 사용하도록 정리
  2. `Department,Name`, `직위,성명`, `부서,이름` 형태의 첫 행은 명단에서 제외
  3. BOM, 공백, 단순 변형 헤더도 같이 정리하도록 보강
- 관련 파일:
  - `src/lib/staff.js`
- 메모:
  - 샘플 검증 결과:
    - 헤더 포함 CSV `3명` 정상 파싱
    - 헤더 포함 TXT `2명` 정상 파싱

### 3. 같은 날짜/같은 유형 세션 간 서명 묶음 처리 해제
- 상태: 완료
- 처리 내용:
  1. 서명 추가 시 대상 세션을 `date + type` 묶음이 아니라 현재 `session.id` 하나로 제한
  2. 출력 화면에서 서명 삭제 시에도 현재 `session.id`에만 반영되도록 수정
  3. 삭제 확인 문구를 세션 단위 동작에 맞게 변경
- 관련 파일:
  - `src/App.jsx`
- 메모:
  - 기존처럼 세션 A/B가 같이 증가하거나 같이 삭제되는 동작은 제거됨

### 4. 클라우드 URL 입력 검증 메시지 개선
- 상태: 완료
- 처리 내용:
  1. `sessions.js`에 공통 `validateScriptUrl()` 추가
  2. 잘못된 URL은 저장 전 / 테스트 전 즉시 차단되도록 `CloudSetupView.jsx`와 `App.jsx`에 검증 연결
  3. 브라우저 기본 예외 문자열 대신 사용자 안내형 메시지로 교체
- 관련 파일:
  - `src/lib/sessions.js`
  - `src/components/CloudSetupView.jsx`
  - `src/App.jsx`
- 메모:
  - 현재 잘못된 URL 입력 시 안내 문구:
    - `올바른 URL 형식이 아닙니다. http:// 또는 https:// 주소를 확인해 주세요.`

### 5. 랜딩 브랜딩/저작권 문구 및 버전 표기 정리
- 상태: 완료
- 처리 내용:
  1. 메인 페이지 제작자 표기 제거
  2. 접속 시점의 현재 연도를 반영하는 저작권 문구를 영문(All rights reserved.) 형태로 변경
  3. 앱 버전을 `v0.9`로 조정
- 관련 파일:
  - `src/components/LandingView.jsx`
  - `src/styles.css`
  - `src/lib/constants.js`
- 메모:
  - 저작권 문구는 `© {현재연도} HooniKim. All rights reserved.` 형식으로 표시

### 6. UI 수정 및 모니모(Monimo) 스타일 디자인 개편
- 상태: 완료
- 처리 내용:
  1. 메인 타이틀('온라인 연수연명부') 줄바꿈 방지 및 한 줄 표기
  2. 메인 페이지 부제목 크기 축소 및 단일 줄 적용
  3. 오픈카톡방 문의 문구 및 링크 완전 삭제
  4. 구글 동기화(CloudSetupView) 페이지 유니코드 깨짐 텍스트 복구 및 상세 사용 가이드 추가
  5. 전반적인 테마를 산뜻한 모니모 스타일(화이트/라이트 블루 그라데이션, 부드러운 그림자와 테두리)로 개편
- 관련 파일:
  - `src/components/LandingView.jsx`
  - `src/components/CloudSetupView.jsx`
  - `src/styles.css`
- 메모:
  - 반응형 clamp 속성 재설정으로 메인 타이틀 크기 overflow 문제 최종 해결

### 7. 관리자 대시보드 UI 디자인 개선 및 양식 다운로드 오류 수정
- 상태: 완료
- 처리 내용:
  1. 학교용 카드 컨테이너(`surface-card-accent`)의 기존 좌측 굵은 테두리 제거 후, 모니모 스타일의 부드러운 그라데이션 및 입체 그림자 적용
  2. 전형적인 AI 느낌을 주는 시스템 기본 이모지(🏫, 🏢 등)를 세련된 미니멀 `lucide-react` SVG 아이콘들(Building, Calendar, PenLine 등)로 전면 교체
  3. 로컬/일부 브라우저 환경에서 명단 양식 다운로드 시 파일명 및 확장자가 유실되어 임시 UUID 이름으로 저장되는 이슈 해결
  4. `file-saver` 모듈을 도입하고, 브라우저의 다운로드 차단을 막기 위해 다운로드 트리거 지점을 사용자 클릭 컨텍스트 내의 동기 호출 영역으로 재조정
- 관련 파일:
  - `src/components/AdminView.jsx`
  - `src/lib/staff.js`
  - `src/styles.css`
  - `package.json`
- 메모:
  - 실제 브라우저 환경에서 `명단양식.xlsx` 파일명이 정상적으로 유지되어 다운로드 됨을 디버그 로그 및 화면 테스트로 수동 검증 완료


## 이번 세션 검증 결과
- `npm run build` 통과
- 로컬 모드 시나리오 검증 통과
  - `office` 동일 정보 재서명 시 1건 유지 + 최신 서명으로 덮어쓰기 확인
  - 같은 날짜 / 같은 유형의 다른 세션은 서명 추가/삭제가 서로 전파되지 않음 확인
  - CSV/TXT 헤더 제거 재확인
- 클라우드 모드 시나리오 검증 통과
  - 모의 `fetch` 기반 Apps Script 엔드포인트로 세션 CRUD / 테스트 / 서명 추가 / 삭제 재현
  - `office` 중복 덮어쓰기와 세션 독립성 모두 확인
- URL 검증 검증 통과
  - 공백 포함 정상 URL은 정규화됨
  - 잘못된 URL은 브라우저 기본 에러 대신 사용자용 메시지 반환

## 검증 방식 메모
- 이번 세션의 로컬/클라우드 재검증은 브라우저 수동 클릭 대신 `vite-node` 임시 시나리오 스크립트로 수행
- 이유:
  - 현재 작업 환경에는 Playwright 같은 브라우저 자동화 구성이 없음
  - 그래도 핵심 회귀 포인트는 실제 저장 로직과 동일한 코드 경로로 재현 가능

## 이미 확인된 정상 동작
- 랜딩, 관리자, 서명자, 클라우드 설정 진입 정상
- XLSX 템플릿 다운로드(확장자 유실 버그 수정 완료) 및 XLSX 명단 업로드 정상
- 학교형/공개형 세션 생성 및 삭제 정상
- 공유 링크 복사 정상
- 학교형 검색, 서명, 재서명 덮어쓰기 정상
- 비밀번호 세션 오답/정답 처리 정상
- 출력 화면 정렬, 필터, 삭제 모드 정상
- 클라우드 모드 CRUD 및 공유 링크 진입 정상
- 브라우저 콘솔 에러 / page error 0건

### 8. 출력 관련 UI 개선 및 PDF 버그 수정
- 상태: 완료
- 처리 내용:
  1. A4 가득차게 인쇄되도록 `height: 100vh` 설정 및 `page-break` 관련 CSS 최적화 적용
  2. PDF 저장 시 `html2canvas`와 `jspdf` 조합으로 수동 렌더링 수행하여 두 번째 빈 페이지 생성 문제 해결
  3. `연수대상자 n명 중 m명 참가`로 표시되게 로직 수정 (명단 등록 여부 기준)
  4. PDF 파일명을 `YYMMDD_연수명_연수 연명부.pdf` 포맷으로 통일
  5. PDF용 CSS(`report-pdf-export`)를 분리하여 배경색 버그(투명->검정) 방지 및 비율 명확화 적용 완료
- 관련 파일:
  - `src/components/PrintPreview.jsx`
  - `src/lib/print.js`
  - `src/styles.css`
- 메모:
  - 사용자 직접 수청 코드가 병합되어 PDF 빈 페이지 없이 안정적으로 저장 확보

### 9. 출력 관련 추가 보정
- 상태: 완료
- 처리 내용:
  1. PDF 캡처 시 반응형 1열 레이아웃이 적용되어 한 줄로 길게 저장되던 문제를 확인하고, PDF 저장 시점에만 `report-pdf-export` 클래스를 적용하도록 보정
  2. A4 기준 2단 표 레이아웃과 페이지 비율을 고정해 화면과 저장 PDF의 레이아웃 차이를 줄임
  3. 참가 인원 표시는 명단 등록 수가 아니라 실제 서명이 있는 인원 수를 기준으로 계산하도록 수정
  4. 출력 문구는 `실제 서명` 같은 내부 기준을 드러내지 않고 `연수대상자 n명 / m명 참가`, `출력 대상 n명 중 m명 참가` 형식으로 정리
- 관련 파일:
  - `src/components/PrintPreview.jsx`
  - `src/styles.css`
- 메모:
  - PDF 저장 결과는 브라우저 창 폭과 무관하게 A4 2단 레이아웃으로 유지되도록 분리 처리

### 10. 등록된 연수 정보 수정 기능 추가
- 상태: 완료
- 처리 내용:
  1. 관리자 대시보드의 각 연수 카드에 `정보 수정` 버튼 추가
  2. 연수명, 기관명, 날짜, 시간, 인증 비밀번호를 카드 내부에서 바로 수정하고 저장/취소할 수 있도록 구현
  3. 저장은 기존 `upsertSession` 흐름을 재사용해 로컬 모드와 클라우드 모드 모두 동일하게 반영되도록 연결
  4. 수정된 기관명은 다음 연수 등록 기본값에도 반영되도록 `lastSchool` 갱신 처리
- 관련 파일:
  - `src/components/AdminView.jsx`
  - `src/App.jsx`
  - `src/styles.css`
- 메모:
  - 이번 반영은 `npm run build` 기준으로 검증 완료
  - 실제 브라우저에서 `정보 수정 -> 저장/취소` 흐름은 후속 수동 확인 권장

### 11. Google Apps Script 연동 POST CORS(preflight) 오류 대응
- 상태: 완료
- 처리 내용:
  1. `sessions.js`의 쓰기 요청(`createSession`, `deleteSession`, `addSignatureBatch`, `removeSignatureBatch`)을 `fetch(..., { mode: "no-cors" })` 기반 전송으로 전환
  2. 저장 응답 본문을 직접 읽지 않고, 후속 `GET getSessions` 재조회로 실제 반영 여부를 검증하도록 변경
  3. 클라우드 설정 화면에서 복사하는 Apps Script 예시 코드도 `parsePostPayload_()` 헬퍼를 추가해 현재 요청 포맷과 이후 호환성을 함께 보강
- 관련 파일:
  - `src/lib/sessions.js`
  - `src/lib/constants.js`
- 메모:
  - 원인: Apps Script Web App의 쓰기 응답은 브라우저 CORS 정책과 충돌할 수 있어, 직접 응답을 읽는 `POST` 흐름이 로컬/배포 환경 모두에서 불안정했음
  - 영향 범위: 로컬 개발 서버뿐 아니라 별도 도메인으로 배포한 프런트에서도 동일하게 발생 가능한 구조였음
  - 이번 수정은 기존 Web App URL과 현재 Apps Script 코드 기준으로도 동작하도록 프런트 측 저장 확인 흐름을 조정한 대응임

### 12. Firebase 관리자 인증 + Firestore 학교 설정 + NEIS 학교 검색 구조 전환
- 상태: 완료
- 처리 내용:
  1. `Firebase Auth` 기반 관리자 인증 흐름 추가
     - 이메일/비밀번호 가입/로그인
     - Google 계정 가입/로그인
  2. 가입 시 학교명 자유 입력 대신 `NEIS` 검색 결과 선택이 필수이도록 UI/검증 추가
  3. `Vercel /api/schools` 서버 함수 추가
     - `NEIS_API_KEY`는 환경변수에서만 사용
     - 프런트는 `/api/schools`만 호출하도록 분리
  4. 학교별 설정을 `Firestore` 기준으로 전환
     - `admins/{uid}`: `schoolId`, `schoolName`, `role`, `status`
     - `schools/{schoolId}`: `schoolName`, `gasWebAppUrl`, `enabled`
     - `schoolPrivate/{schoolId}`: `defaultStaffCache`
  5. 기본 교직원 명단을 브라우저 `localStorage` 대신 학교별 `schoolPrivate/{schoolId}.defaultStaffCache`로 저장하도록 변경
  6. 관리자 랜딩 흐름 정리
     - `관리자 로그인/가입`
     - `학교 설정 보기`
     - `참여자 서명하기`
  7. 학교별 `GAS` 주소가 없으면 관리자 화면 대신 학교 설정 화면으로 유도되도록 변경
  8. 공유 링크를 `schoolId + sessionId` 기반으로 생성하도록 변경
     - 비로그인 참여자는 가입 없이 QR 링크로 접속 후 서명만 수행
  9. 기존 연수/서명/출력/PDF 데이터 저장은 계속 `GAS`를 사용하도록 유지
- 관련 파일:
  - `src/App.jsx`
  - `src/components/AuthView.jsx`
  - `src/components/LandingView.jsx`
  - `src/components/CloudSetupView.jsx`
  - `src/components/AdminView.jsx`
  - `src/lib/firebase.js`
  - `src/lib/auth.js`
  - `src/lib/schools.js`
  - `api/schools.js`
  - `.env.example`
  - `package.json`
- 메모:
  - 학교 검색은 브라우저에서 NEIS 키를 직접 쓰지 않고 Vercel 서버 함수 뒤에 숨김
  - 기존 `endpoint` 공유 링크도 호환을 위해 fallback으로 일부 유지
  - 실제 운영 전 `Firebase Auth provider`, `Vercel env`, `Firestore Rules` 설정 필요

## 남은 후속 권장 작업
1. 실제 브라우저에서 관리자 가입/로그인 수동 E2E 확인
   - 이메일 가입
   - Google 가입
   - 학교 검색 후 선택 없이는 가입 불가 확인
2. 실제 브라우저에서 학교 설정 수동 E2E 확인
   - GAS 주소 저장
   - 저장 후 기존 연수 목록 조회
   - 다른 브라우저 로그인 시 동일 학교 설정 재사용
3. 실제 Google Apps Script URL로 `엑셀 업로드 -> 연수 등록 -> QR 접속 -> 서명 -> 출력/PDF -> 삭제`까지 수동 E2E 확인
4. 필요하면 다음 단계에서 `Firestore Rules`와 `Firebase 초기 설정 가이드`를 문서화하거나 `sessions` / `staff` / `auth` 로직 테스트를 추가
5. 필요하면 다음 단계에서 관리자 수동 정리 절차를 별도 운영 문서로 정리

## 이번 후속 진행 내역
- 저장소 기준 선반영 완료
  - `firestore.rules` 추가
  - `firebase.json` 추가
  - `docs/firebase-setup-guide.md` 추가
  - 공개 학교 설정은 `schools/{schoolId}`, 관리자 전용 기본 명단은 `schoolPrivate/{schoolId}`로 분리
  - 공유 링크 진입 시에는 public-only 학교 설정만 읽도록 `src/lib/schools.js`, `src/App.jsx` 구조 조정
  - `schoolPrivate` 문서는 가입 시 자동 생성하지 않고, 관리자 명단 저장 시점에만 생성되도록 보안 정책 보강
  - 본인 계정 탈퇴 기능 추가
  - 최고 관리자 기능은 제거하고, 다른 관리자 계정 정리는 Firestore/Firebase Console 수동 관리 정책으로 유지
  - `api/admins.js` + `firebase-admin` 기반 본인 계정 탈퇴 API 추가
  - `vitest` 기반 자동화 테스트 추가
    - `api/schools.test.js`
    - `api/admins.test.js`
    - `src/lib/auth.test.js`
    - `src/lib/sessions.test.js`
    - `src/lib/staff.test.js`
  - `npm test`, `npm run build` 검증 통과
- 사용자 실설정 완료 보고 반영
  - Vercel 환경변수 입력 완료
  - Firestore Rules 적용 완료
  - Firebase Authentication `Email/Password`, `Google` provider 활성화 완료
  - Firebase Authorized Domains 추가 완료
- 아직 외부에서 직접 해야 하는 작업
  - 실제 브라우저 수동 E2E
  - 실제 Google Apps Script 운영 URL 검증

## 2026-03-11 추가 반영

### 13. 결과 출력 실시간 반영, QR 다운로드, 서명 저장 로딩, 인쇄 미리보기 보강
- 상태: 완료
- 처리 내용:
  1. `결과 출력` 버튼을 누를 때 최신 세션을 다시 불러오고, 출력 화면에서는 주기적으로 세션을 다시 읽어 서명이 새로고침 없이 반영되도록 조정
  2. 공유 QR을 앱 내부에서 직접 생성하도록 변경하고, 다운로드 PNG 안에 `연수명`, `날짜` 문구를 함께 넣도록 구성
  3. QR 다운로드 기본 파일명을 `날짜_연수명QR.png` 형식으로 지정
  4. 서명 확인 버튼을 누른 뒤 저장 중 오버레이와 안내 문구를 보여 주고, 저장 중 중복 클릭을 막도록 처리
  5. 브라우저 인쇄 미리보기에서 A4 폭/높이, 페이지 나눔, 셀 높이가 흔들리지 않도록 print CSS를 재정비
- 관련 파일:
  - `src/App.jsx`
  - `src/components/ShareDialog.jsx`
  - `src/components/SignatureModal.jsx`
  - `src/lib/qr.js`
  - `src/styles.css`
  - `package.json`
- 검증:
  - `npm run build` 통과
- 메모:
  - QR 생성은 `qrcode` 패키지 기반으로 로컬 생성
  - 실제 브라우저 인쇄 미리보기와 QR 다운로드 동작은 배포 후 한 번 더 수동 확인 권장

### 14. 인쇄 미리보기 2페이지 상단 잔상 격리 패치
- 상태: 완료
- 처리 내용:
  1. 인쇄 미리보기 2페이지 좌상단에 남던 빨간 조각은 `PrintPreview` 본문 데이터보다 보고서 외부 전역 레이어가 인쇄에 섞이는 쪽으로 원인 범위를 좁힘
  2. `@media print`에서 이미 알고 있는 요소만 숨기던 방식 대신, `#root` 안에서 `.report-shell`만 남기고 나머지 형제 요소를 숨기도록 최소 범위 격리 규칙 추가
  3. 보고서 내부 서명 이미지(`signature-preview`)나 표 본문은 건드리지 않고, 인쇄 시점에만 전역/fixed 오버레이 유입을 차단하도록 구성
  4. 수정 전 원본은 `.codex-backups/20260311-164500/styles.css.pre-print-isolation.bak`로 로컬 백업 보관
  5. 변경 사항을 `fix: isolate print output from overlays` 커밋으로 정리하고 `origin/main`에 푸시 완료
- 관련 파일:
  - `src/styles.css`
  - `src/components/PrintPreview.jsx`
  - `src/App.jsx`
- 검증:
  - `npm run build` 통과
- 메모:
  - 정확한 잔상 개체가 앱 토스트인지 브라우저/확장 주입 UI인지는 단정하지 않았고, 원인 범주를 “보고서 외부 오버레이 인쇄 혼입”으로 보고 안전하게 차단
  - 백업 폴더는 Git에 올리지 않고 로컬 롤백 용도로만 유지

## 2026-03-13 추가 반영

### 15. 관리자 인증/계정 관리 흐름 보완
- 상태: 완료
- 처리 내용:
  1. `src/lib/auth.js`를 인증 결과 객체 기반으로 바꾸고, Google 로그인 후 관리자 프로필이 없거나 학교 정보가 누락된 경우 `needsSignup` / `needsSchoolSelection` 상태를 반환하도록 수정
  2. 현재 로그인 상태를 유지한 채 관리자 가입을 마무리할 수 있도록 `completeAdminOnboarding()` helper를 추가하고, 이메일 계정용 `changeAdminPassword()`를 `reauthenticateWithCredential` + `updatePassword` 방식으로 구현
  3. `src/App.jsx`에서 인증 성공 후 단순 토스트/이동 대신 후속 상태를 해석하도록 수정하고, 복귀 로그인 시에도 관리자 프로필/학교 정보가 불완전하면 `AuthView` 보완 플로우로 강제 진입하도록 연결
  4. `src/components/AuthView.jsx`에 학교 검색 재사용형 온보딩 UI를 추가해서 Google 로그인 직후 관리자 가입 또는 학교 정보 보완을 같은 화면에서 이어서 완료할 수 있게 변경
  5. `src/components/AdminView.jsx`의 내 계정 영역에 비밀번호 변경 폼을 추가하고, Google-only 계정은 비밀번호 변경 불가 안내가 보이도록 정리
  6. `api/admins.js`의 `deleteSelf`를 idempotent 하게 수정해서 `admins/{uid}` 문서가 이미 없거나 Firebase Auth 사용자가 이미 삭제된 경우에도 거짓 실패 없이 탈퇴 완료로 처리
  7. `src/lib/auth.test.js`, `api/admins.test.js`를 새 인증/탈퇴 동작 기준으로 갱신
- 관련 파일:
  - `src/App.jsx`
  - `src/components/AuthView.jsx`
  - `src/components/AdminView.jsx`
  - `src/lib/auth.js`
  - `src/lib/auth.test.js`
  - `api/admins.js`
  - `api/admins.test.js`
  - `src/styles.css`
- 검증:
  - `npm test` 통과
  - `npm run build` 통과
- 메모:
  - 실제 Firebase/Google 팝업 기반 E2E와 Firestore 실데이터 확인은 현재 로컬 자동화 범위 밖이므로 배포 환경에서 한 번 더 확인 필요

### 16. 관리자 계정 메뉴 헤더 아이콘 이동
- 상태: 완료
- 처리 내용:
  1. 관리자 화면 본문에 있던 `내 계정` 카드를 제거하고, 상단 우측 액션 영역에서 `학교 설정` 왼편에 사람 아이콘 트리거를 추가
  2. 아이콘 클릭 시 관리자 정보, 비밀번호 변경, 계정 탈퇴를 한 번에 처리할 수 있는 팝오버 패널이 열리도록 `src/components/AdminView.jsx`를 조정
  3. 팝오버 바깥 클릭, `Escape` 입력 시 닫히도록 처리하고, 비밀번호 변경 성공 시 입력값 초기화 후 패널이 닫히도록 연결
  4. `src/styles.css`에 플랫한 계정 아이콘 버튼, 팝오버 레이아웃, 모바일 대응, 포커스 스타일을 추가
- 관련 파일:
  - `src/components/AdminView.jsx`
  - `src/styles.css`
- 검증:
  - `npm test` 통과
  - `npm run build` 통과
