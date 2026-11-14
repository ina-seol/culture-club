# 공개 버전 배포 기록

2026-11-14 배포 완료. 이 파일 이름은 초기 준비 단계에서 사용한 이름을 유지한다.

- 사이트: https://ina-seol.github.io/culture-club/
- 저장소: https://github.com/ina-seol/culture-club
- Firebase: dddd-77ad2, Firestore Standard / 서울 asia-northeast3
- Google 로그인 활성화 및 ina-seol.github.io 승인 도메인 등록 완료.
- 사용자별 일기 규칙을 에뮬레이터로 검증한 뒤 콘솔에 원문 대조·게시 완료.
- 프로젝트 소유자가 승인한 Google 사용자의 UID로 관리자 ACL 설정 완료. 관리자 이메일·UID는 소스에 넣지 않는다.
- 실제 공개 사이트에서 Google 로그인, 관리자 화면, 일기 저장, 새로고침 후 조회, 휴지통 이동, 로그아웃을 확인했다. 가상 검증 기록 한 편은 휴지통에 보관했다.
- 허브·일기 로컬 API 테스트 11개, Firestore 보안 규칙 테스트 6개 통과. 클라우드 타입 검사·빌드 및 운영 의존성 감사 통과.
- Pages 하위 경로의 이미지·해시 경로·공유용 영어교실 위젯 정상 열림 확인.
- 기존 로컬 DB와 일기는 업로드하거나 자동 이전하지 않았다.

보안 규칙은 콘솔에 게시했다. firestore.indexes.json의 본문 인덱싱 제외는 별도 운영 최적화 설정이며, 현재 쿼리는 기본 단일 필드 색인으로 동작한다. 이 인덱싱 제외 설정의 운영 반영은 확인하지 않았다.
