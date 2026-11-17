// 저장소 추상화. 앱으로 감쌀 때 이 파일만 Capacitor Preferences 등으로 바꾸면 된다.
// 생년월일은 기기 밖으로 나가지 않는다.
const KEY = 'zodigram.profile.v1';
const PEOPLE_KEY = 'zodigram.people.v1';

const valid = (p) => p && p.year && p.month && p.day;

export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (valid(p)) return p;
  } catch { /* 손상된 값은 무시 */ }
  return null;
}

export function saveProfile(p) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}

/* ── 저장한 사람들(가족·친구·연인 등) ── */
export function loadPeople() {
  try {
    const list = JSON.parse(localStorage.getItem(PEOPLE_KEY) || '[]');
    return Array.isArray(list) ? list.filter(valid) : [];
  } catch { return []; }
}

export function getPerson(id) {
  return loadPeople().find((p) => p.id === id) || null;
}

export function savePerson(p) {
  const list = loadPeople();
  const id = p.id || `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  const next = { ...p, id };
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list[i] = next; else list.push(next);
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(list));
  return next;
}

export function deletePerson(id) {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(loadPeople().filter((p) => p.id !== id)));
}
