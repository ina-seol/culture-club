# 컬처클럽 · 우리 반 영어학습관

초등 3–6학년을 위한 영어 활동 허브입니다. 세계문화 탐험, My English Town, 지혜의 미로 탐험대, 낱말 놀이터, 오늘의 일기장, 나의 영어교실을 한곳에서 엽니다. Slush의 파스텔 스티커와 Zeus Jones의 크림색 종이·편집형 구성을 배달의민족 JUA 글꼴과 함께 사용합니다. 메인과 카드에는 생성 이미지 파일을 사용합니다.

세계문화 탐험은 3·4·5·6학년 각각 크리스마스·할로윈·미국 추수감사절을 다룹니다. 문화 읽기 → 영어 표현 3개 → 선택형 퀴즈 5문항으로 구성되며 학생 이름·학번·답안·점수를 수집하지 않습니다. 학습과 채점은 프론트엔드에서 작동합니다.

## 공개 버전

공개 사이트: https://ina-seol.github.io/culture-club/

저장소: https://github.com/ina-seol/culture-club

Firebase 프로젝트는 `dddd-77ad2`입니다. Pages 배포, Google 로그인, 관리자 화면, 실제 일기 저장·새로고침 조회·휴지통 이동·로그아웃을 확인했습니다. 배포 기록은 `cloud/DEPLOYMENT_PENDING.md`, 보안 검토와 제한은 `SECURITY_REVIEW.md`에 기록합니다.

GitHub Pages는 화면과 이미지를 제공하고, Firebase Authentication과 Firestore는 로그인과 일기 저장을 담당합니다. 공개 사이트에 로컬 Node 서버나 SQLite를 올리지 않습니다. 기존 로컬 일기와 백업은 Firebase로 자동 이전하지 않습니다.

## 로컬 실행

Node.js 24 이상:

```sh
npm ci
npm run dev
```

http://127.0.0.1:5173 을 엽니다. 기본 개발 실행은 기존 Node·SQLite 백엔드를 사용합니다. 처음 한 번 서버 컴퓨터에서 선생님이 직접 12자 이상의 교사 비밀번호를 설정합니다. 비밀번호는 scrypt 해시로 저장합니다.

```sh
npm test
npm run build
npm start
```

빌드 후 실행 주소는 http://127.0.0.1:3001 입니다. API는 기본적으로 loopback에서만 수신합니다. 로컬 서버를 인터넷에 공개하려면 별도 HTTPS·운영 설정이 필요합니다.

## Firebase·Pages 빌드

다음 명령으로 보안 규칙을 검증하고 공개 버전을 빌드합니다.

```sh
npm run test:rules
npm run build:cloud
```

규칙 테스트는 Java 21 이상과 Firestore 에뮬레이터를 사용하며, `demo-culture-club` 가상 프로젝트에서만 실행합니다. 실제 일기는 테스트에 사용하지 않습니다. `build:cloud`는 Firebase 백엔드, `/culture-club/` 자산 경로, 해시 라우팅을 적용합니다. 다른 저장소 이름은 `VITE_BASE_PATH=/다른이름/`으로 지정합니다.

`main` 변경 시 GitHub Actions가 로컬 API 테스트, Firestore 권한 테스트, 운영 의존성 감사와 클라우드 빌드를 통과한 후 Pages에 배포합니다. Firebase 웹 설정은 공개 클라이언트 식별자이며 서비스 계정 키가 아닙니다. GitHub에 Firebase 관리자 비밀키를 등록할 필요가 없습니다. Firestore 규칙은 프로젝트 소유자의 인증된 콘솔 또는 CLI에서 별도로 배포합니다.

## 로그인과 권한

공개 버전은 Google 로그인으로 계정별 일기장을 엽니다. 허브 목록 편집 권한은 별도입니다. 프로젝트 소유자가 인증 사용자 UID를 확인한 뒤 `cultureClubAdmins/{uid}` 문서에 boolean `active: true`를 설정해야 합니다. 일반 사용자가 스스로 관리자 문서를 생성·수정하거나 다른 관리자를 열람할 수 없습니다.

관리자는 첫 로그인에서 기본 프로그램 목록을 한 번 초기화합니다. 이후 수정·삭제한 카드는 재시작이나 로그인 때 복원하지 않습니다. Google 로그인은 기본 프로필·이메일 인증만 요청하며 Drive·메일 접근 권한을 요구하지 않습니다.

## 일기장과 개인정보

날짜·제목·본문·기분 작성, 월별 목록·검색, 수정, 휴지통 이동·복원을 제공합니다. 저장 버튼으로 명시적으로 저장하며 자동 저장은 하지 않습니다. 미저장 상태에서 이동하면 확인합니다. 다른 창에서 수정한 일기는 버전 충돌을 안내합니다. 영구 삭제 버튼은 제공하지 않습니다.

Firebase 버전은 `cultureClubDiaries/{uid}/entries/{id}`에 저장합니다. 검증된 Google 계정의 UID와 경로가 일치해야 읽기·쓰기가 가능합니다. 목록·미리보기·휴지통도 동일한 권한으로 보호하며, 허브 관리자 권한만으로 다른 사람의 일기를 읽을 수 없습니다. 프로젝트 소유자의 Firebase 관리 권한은 별개입니다. AI·광고·Analytics SDK를 추가하지 않습니다. Firestore 영구 브라우저 캐시는 사용하지 않으며 로그인 세션은 탭 범위입니다. 공용 기기에서는 이용 후 로그아웃해 주세요.

로컬 버전은 단일 교사 계정으로 `data/diary.sqlite`를 사용합니다. 허브 목록·교사 비밀번호 해시는 `data/culture.sqlite`에 별도로 저장합니다. 이 파일과 백업은 비공개이며 저장소·Pages 산출물에 포함하지 않습니다.

```sh
npm run backup
```

`data/backups/<시각>/`에 두 DB의 일관된 스냅샷을 저장합니다. 백업에는 일기 본문과 비밀번호 해시가 포함됩니다. 복구할 때 서버를 종료하고 현재 data 폴더를 별도 보관한 후 새 data 폴더에 두 파일을 원래 이름으로 복사합니다. 이전 WAL/SHM 파일과 섞지 않습니다. 로컬 파일은 디스크 암호화 형식이 아니며 컴퓨터 관리자에게 접근 가능합니다.

## 영어교실 위젯

`public/widgets/english-classroom.html`은 제공받은 원본의 공유용 사본입니다. 기존 학생 실명·좌석·알림 백업을 제거했고 기본 명단은 1–24번입니다. 이용자가 입력하는 명단과 설정은 해당 브라우저 저장소에만 남습니다. 위젯 글꼴은 jsDelivr CDN에서 가져옵니다. BGM 음원 3개는 제공되지 않아 버튼을 비활성화했습니다. 타이머 알림음은 별도입니다. 원본 Downloads 파일은 저장소에 포함하지 않습니다.

## 파일 안내

- `src/`: 허브·세계문화 학습·일기 화면과 디자인
- `shared/`: 프로그램 목록·일기 입력 검증
- `cloud/`: Firebase 클라이언트 어댑터·공개 웹 설정·진행 상태
- `firebase/`: 보안 규칙·인덱스·에뮬레이터 테스트
- `server/`: 기존 로컬 서버·인증·SQLite·백업
- `public/`: 최종 이미지·글꼴·공유용 위젯
- `SECURITY_REVIEW.md`: 공개 전 보안 검토 기록
- `CONTENT_SOURCES.md`: 문화교육 참고 자료
- `public/fonts/OFL.txt`: JUA 글꼴 라이선스

실제 수업 전에 교사가 문화 설명과 학년별 영어 난이도를 검토해 주세요.

### 수업제작소 바로가기
허브의 고정 교사 도구 카드에서 [Lesson Factory](https://ina-seol.github.io/lesson-factory/)를 새 탭으로 엽니다. 공용 프로그램 목록의 초기화 여부와 관계없이 표시되며, 동일 URL의 등록 항목은 중복 표시하지 않습니다. 카드 제목·설명·연결은 `src/main.tsx`, 생성 표지는 `public/images/programs/lesson-factory-v1.jpg`에 있습니다. 고정 카드는 관리실의 공용 목록 편집 대상이 아닙니다.
