# 공개 버전 준비 상태

대상 Firebase: dddd-77ad2 / 공개 저장소: ina-seol/culture-club.

완료: Firebase 웹 앱 등록, 서울 리전 Firestore 생성(현재 deny-all), Google 로그인 활성화, ina-seol.github.io 승인 도메인 등록, Google 로그인·사용자별 일기 클라이언트 코드와 규칙·테스트 작성, Pages 하위 경로 대응, 로컬 앱 빌드 검증.

대기: SDK 설치, 클라우드 타입 검사, Firestore 규칙 에뮬레이터 검증, 검증된 규칙 배포, GitHub 소스 업로드와 Pages 배포, 실제 Google 로그인과 계정별 저장 확인.

패키지 설치는 자동 승인 검토의 사용량 제한으로 실행되지 않았다. 이 제한이 해제된 뒤 검증을 이어간다. 검증 전에는 클라우드 앱을 배포하지 않는다. 기존 로컬 앱과 로컬 DB는 보존한다. 기존 일기를 Firebase로 자동 이전하지 않는다.

관리자 권한은 프로젝트 소유자가 Google 사용자 UID를 확인한 뒤 cultureClubAdmins/{uid}에 active: true를 등록하는 방식이다. 브라우저 앱에서 관리자 권한을 만들 수 없다.
