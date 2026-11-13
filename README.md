# Zodigram · 별과 괘

> Zodiac + (Tri/Hexa)gram — 서양의 별자리와 동양의 괘

동양의 **괘**와 서양의 **별**로 읽는 오늘의 운세.
빌드 과정 없는 정적 사이트(HTML·CSS·ES 모듈)이고, 모든 계산은 브라우저 안에서 이루어집니다. 생년월일은 서버로 보내지 않습니다.

| 동양 東 | 서양 西 |
|---|---|
| 사주 원국(사주팔자)과 오행 분포 | 별자리(태양궁): 실제 태양 황경으로 판정 |
| 오늘의 일진: 십신으로 보는 하루 | 오늘의 달: 솔라 하우스와 각(aspect) |
| 띠 운세: 합·충·해 관계 | 수비학: 생명수, 개인일 수 |
| 주역: 오늘의 괘, 동전 점(본괘·지괘) | 타로: 오늘의 카드, 세 장 펼치기 |

공통으로 **오늘의 한마디**(동양 고전·속담 / 서양 고전), 일진, 음력, 달의 위상을 보여 줍니다.

- **길일 달력**: 날마다 음력·일진·24절기·공휴일·손 없는 날, 생년월일이 있으면 내 일지와 합·충인 날과 그날의 십신 풀이
- **공유 카드**: 오늘 운세를 1080×1350 이미지로 그려 휴대폰 공유 창(카카오톡 등)으로 보내거나 저장

## 로컬 실행

```bash
npm run dev          # http://localhost:5173
npm test             # 만세력·절기·음력·달력·주역 계산 테스트
python scripts/make-images.py   # 앱 아이콘(PNG)·링크 미리보기(og.png) 다시 만들기 (Pillow 필요)
```

Node 18 이상만 있으면 되고, 설치할 패키지는 없습니다.

## 폴더 구조

```
public/                 ← 배포되는 사이트 전체
  index.html
  assets/css/style.css
  assets/js/
    core/               ← 화면과 무관한 계산 (앱에서도 그대로 재사용)
      astro.js          율리우스일, 태양·달 황경, 절기, 달 위상
      saju.js           사주 계산, 십신, 지지 관계
      western.js        별자리, 달 트랜짓, 수비학
      iching.js         동전 점
      fortune.js        ★ 화면에서 부르는 운세 API (getToday/getEast/getWest)
      storage.js        저장소 (앱 전환 시 이 파일만 교체)
      seed.js           날짜별로 고정되는 난수
    data/               ← 해석 문구 (64괘, 타로 22장, 별자리, 한마디 …)
    ui/                 ← 화면 템플릿과 SVG 그림
    app.js              ← 해시 라우터
  manifest.webmanifest, sw.js   ← PWA(설치·오프라인)
  _headers              ← Cloudflare 보안 헤더
tests/                  ← node --test
wrangler.jsonc          ← Cloudflare Workers 배포 설정
.github/workflows/pages.yml     ← GitHub Pages 자동 배포
```

## 배포

### 1) GitHub Pages
1. GitHub에 새 저장소를 만들고 push 합니다.
2. 저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 바꿉니다.
3. `main` 에 push 할 때마다 테스트 후 `public/` 이 배포됩니다.
   주소: `https://sykim-6894.github.io/zodigram/` (해시 라우팅이라 하위 경로에서도 동작)

### 2) Cloudflare 연결 (둘 중 하나)
현재 배포 주소: **https://zodigram.ksy2202.workers.dev** (Cloudflare Workers, `main`에 push하면 자동 배포)

- **Cloudflare Pages (Git 연결)** — Workers & Pages → Create → Pages → Connect to Git → 저장소 선택
  - Framework preset: `None`
  - Build command: *(비워 둠)*
  - Build output directory: `public`
- **Cloudflare Workers (정적 자산)** — 저장소 루트에서 `npx wrangler deploy`
  (`wrangler.jsonc` 가 `public/` 을 올립니다)

커스텀 도메인은 Cloudflare 대시보드의 Custom domains 에서 연결하면 됩니다.

## 앱으로 확장하기

이미 준비된 것
- **PWA**: 휴대폰에서 "홈 화면에 추가"하면 앱처럼 열리고, 한 번 방문하면 오프라인에서도 동작합니다.
- **계산과 화면 분리**: `core/fortune.js` 가 순수 함수 API라 React Native·Flutter(WebView)·서버 어디로든 옮기기 쉽습니다.
- **저장소 추상화**: `core/storage.js` 한 파일만 바꾸면 됩니다.

다음 단계 (택1)
1. **Capacitor** (권장): 지금 코드를 그대로 감싸 Android/iOS 앱으로 빌드
   ```bash
   npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
   npx cap init "Zodigram" com.example.zodigram --web-dir public
   npx cap add android && npx cap open android
   ```
   이후 `storage.js` 를 `@capacitor/preferences` 로, 알림은 `@capacitor/local-notifications` 로 "오늘의 운세" 아침 알림을 붙이면 됩니다.
2. **TWA(Trusted Web Activity)**: 배포된 PWA 주소를 그대로 Play 스토어 앱으로 등록 (Bubblewrap 사용).
   스토어 등록 전에 PNG 아이콘(192·512px, maskable)을 추가해야 합니다.

## 계산 기준과 한계
- 사주: 연주는 입춘, 월주는 12절(태양 황경), 일주는 율리우스일(2000-01-01 = 戊午). 시주는 한국 표준시에서 30분 보정(자시 23:30~01:30), 23:30 이후 출생은 다음 날 일주로 봅니다.
- 태양 황경 오차 약 ±0.01°(절기 시각 수 분), 달 황경 약 ±0.3°.
- 음력: 합삭(Meeus)과 중기로 직접 계산하며, 동지가 든 달을 11월로 두고 중기 없는 첫 달을 윤달로 봅니다. 1900~2100년 전 기간을 양력↔음력 왕복 검증했습니다.
- 아직 한국의 과거 서머타임(1948–1988 일부 연도) 보정, 대운·세운은 지원하지 않습니다.
- 해석 문구와 한마디 번역은 이 프로젝트를 위해 새로 썼고, 인용은 저작권이 끝난 고전·속담만 사용했습니다.
