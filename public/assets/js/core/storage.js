// 저장소 추상화. 앱으로 감쌀 때 이 파일만 Capacitor Preferences 등으로 바꾸면 된다.
// 생년월일은 기기 밖으로 나가지 않는다.
const KEY = 'zodigram.profile.v1';

export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (p && p.year && p.month && p.day) return p;
  } catch { /* 손상된 값은 무시 */ }
  return null;
}

export function saveProfile(p) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}
