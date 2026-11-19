# Zodigram 앱 (Android · iOS)

웹 코드(`public/`)를 그대로 쓰는 [Capacitor](https://capacitorjs.com) 앱입니다. 웹을 고치면 앱도 같은 코드를 씁니다.

```
public/                웹 사이트이자 앱 화면 (HTML·CSS·JS)
capacitor.config.json  앱 이름·ID·스플래시·상태 표시줄 설정
android/               안드로이드 프로젝트 (Android Studio)
ios/                   iOS 프로젝트 (Xcode, Swift Package Manager)
assets/                앱 아이콘·스플래시 원본 (scripts/make-app-assets.py 로 생성)
```

## 자주 쓰는 명령

| 명령 | 하는 일 |
|---|---|
| `npm run app:sync` | `public/` 의 최신 웹 파일을 android·ios 에 복사하고 플러그인을 맞춘다 |
| `npm run app:assets` | 아이콘·스플래시 원본을 다시 만들고 iOS·안드로이드 크기별 파일을 생성 |
| `npm run app:android` | 안드로이드 디버그 앱(APK) 빌드 → `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run app:android:open` | Android Studio 로 열기 |
| `npm run app:ios:open` | Xcode 로 열기 (맥에서만) |

웹을 고친 뒤에는 **`npm run app:sync` → 빌드** 순서입니다. 앱은 웹 파일을 안에 담고 있어서, 웹에 올린 변경이 앱에는 자동으로 들어가지 않습니다(스토어 업데이트가 필요합니다).

## 앱에서 웹과 달라지는 점

- 공유 링크·카드 업로드는 앱 안 주소(`https://localhost`)가 아니라 실제 사이트 주소를 씁니다(`public/assets/js/core/env.js` 의 `SITE_ORIGIN`). 서버(`worker/index.js`)는 앱 출처의 업로드만 CORS 로 허용합니다.
- 공유 창은 네이티브 공유 플러그인을 씁니다. 웹뷰에서 되지 않는 "이미지로 저장"(파일 내려받기)은 앱에서 숨기고 링크로 공유합니다.
- 서비스 워커는 앱에서 등록하지 않습니다(파일이 앱에 들어 있음).
- 글꼴(Noto Serif KR, Pretendard)은 인터넷에서 받습니다. 오프라인이면 기기 기본 글꼴로 보입니다.
- **아침 알림**: 내 정보 ▸ 아침 알림에서 켜고 시각을 정합니다(앱에서만 보임). 앞으로 14일 치를 기기에 미리 예약하고, 앱을 켤 때마다 다시 예약합니다. 정확한 알람 권한은 쓰지 않아 몇 분 오차가 있을 수 있으며, 2주 넘게 앱을 열지 않으면 알림이 끊깁니다. 안드로이드 13+는 알림 권한을 묻습니다.
- 저장한 사람·보관함·내 정보는 기기 웹뷰의 localStorage 에 있습니다. 앱을 지우면 함께 지워지므로, 내 정보 ▸ 백업과 복원에서 백업해 둘 수 있습니다(앱은 공유 창으로 보내기, 웹은 파일 내려받기).

## 앱 ID 정하기 (출시 전에 꼭)

지금은 임시 ID `com.zodigram.app` 입니다. **스토어에 올린 뒤에는 바꿀 수 없으니** 직접 소유한 도메인을 거꾸로 쓴 이름(예: `kr.example.zodigram`)으로 정하세요. 바꿀 곳 4군데:

1. `capacitor.config.json` 의 `appId`
2. `android/app/build.gradle` 의 `namespace`, `applicationId`
3. `android/app/src/main/java/…` 의 패키지 폴더·`package` 선언과 `AndroidManifest.xml`
4. Xcode 의 `PRODUCT_BUNDLE_IDENTIFIER` (`ios/App/App.xcodeproj/project.pbxproj`)

## Android

### 이 컴퓨터에서 빌드
Android Studio·SDK 36·JDK 21 이 있으면 됩니다.
```bash
npm run app:android
```
폰에서 직접 설치해 보려면 폰의 USB 디버깅을 켜고 `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
GitHub 의 **Actions → "Android 테스트 앱 만들기" → Run workflow** 로도 APK 를 받을 수 있습니다.

### 스토어 출시 (Google Play)
1. [Play Console](https://play.google.com/console) 개발자 계정(일회성 등록비)
2. 업로드 키 만들기 — **키 파일과 비밀번호는 절대 저장소에 올리지 마세요**(`.gitignore` 로 `*.jks`, `*.keystore`, `key.properties` 는 막아 두었습니다)
   ```bash
   keytool -genkey -v -keystore zodigram-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
3. `android/key.properties` 와 `app/build.gradle` 의 `signingConfigs` 를 설정하고 `gradlew bundleRelease` 로 AAB 생성
4. Play Console 에 올리기. 개인 계정은 **비공개 테스트 요건**이 있을 수 있으니 제출 전에 현재 정책을 확인하세요.

## iOS

**iOS 앱은 맥(Xcode)에서만 빌드하고 서명할 수 있습니다.** 윈도우에서는 프로젝트 생성까지만 됩니다.

| 필요한 것 | 비고 |
|---|---|
| Apple Developer Program | 연회비. 스토어·TestFlight 배포에 필수 |
| 맥 + Xcode | 없으면 아래 "맥이 없다면" |

### 맥이 있다면
```bash
npm ci && npm run app:sync && npm run app:ios:open
```
Xcode 에서 Signing & Capabilities → Team 선택 → 실기기 실행 → Product ▸ Archive → TestFlight/App Store 업로드.

### 맥이 없다면
- **컴파일 확인**: GitHub 의 **Actions → "iOS 빌드 확인" → Run workflow**. 서명 없이 시뮬레이터용으로 빌드해 오류가 없는지 봅니다.
- **스토어용 빌드**: GitHub Actions 의 맥 서버나 Codemagic 같은 CI 에 Apple 인증서·프로비저닝 프로필을 비밀 값으로 등록해 서명 빌드를 만들 수 있습니다. 인증서는 Apple 개발자 계정에서 직접 만들어야 합니다.

### 심사 때 알아 둘 것
- 웹 사이트를 감싼 앱만으로는 "최소 기능" 사유로 반려될 수 있습니다(App Store 가이드라인 4.2). 앱에 담긴 계산·저장·보관함 기능을 심사 노트에 설명하고, 아침 알림 같은 기기 기능을 더하면 유리합니다.
- 운세 앱은 허용되는 분류입니다. 연령 등급·개인정보 처리방침 주소(사이트에 안내 페이지 추가 필요)를 준비하세요.

## 다음에 하면 좋은 것
- 글꼴을 앱에 담아 오프라인에서도 같은 모양으로
