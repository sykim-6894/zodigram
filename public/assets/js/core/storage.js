// 저장소 추상화. 앱으로 감쌀 때 이 파일만 Capacitor Preferences 등으로 바꾸면 된다.
// 생년월일은 기기 밖으로 나가지 않는다.
import { normalizeNotify } from './notify.js';

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

/* ── 보관함(저장한 결과)과 방문 기록 ── */
const VAULT_KEY = 'zodigram.vault.v1';
const VISIT_KEY = 'zodigram.visits.v1';
export const VAULT_LIMIT = 200;

/** 저장한 항목(최신순) */
export function loadVault() {
  try {
    const list = JSON.parse(localStorage.getItem(VAULT_KEY) || '[]');
    return Array.isArray(list) ? list.filter((x) => x && x.id && x.kind).sort((a, b) => b.created - a.created) : [];
  } catch { return []; }
}

const writeVault = (list) => localStorage.setItem(VAULT_KEY, JSON.stringify(list));

export function getVaultItem(id) {
  return loadVault().find((x) => x.id === id) || null;
}

/** 항목 추가. 가득 차면 { ok: false, reason: 'full' } */
export function addVaultItem(item) {
  try {
    const list = loadVault();
    if (list.length >= VAULT_LIMIT) return { ok: false, reason: 'full' };
    const saved = { ...item, id: `v${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`, created: Date.now() };
    list.push(saved);
    writeVault(list);
    return { ok: true, item: saved };
  } catch {
    return { ok: false, reason: 'storage' };
  }
}

export function updateVaultItem(id, patch) {
  const list = loadVault();
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  writeVault(list);
  return list[i];
}

export function deleteVaultItem(id) {
  writeVault(loadVault().filter((x) => x.id !== id));
}

/** 오늘 방문을 기록한다(날짜 문자열 YYYY-MM-DD). 최근 400일만 남긴다. */
export function recordVisit(key) {
  try {
    const set = new Set(loadVisits());
    if (set.has(key)) return;
    set.add(key);
    localStorage.setItem(VISIT_KEY, JSON.stringify([...set].sort().slice(-400)));
  } catch { /* 저장할 수 없으면 기록하지 않는다 */ }
}

export function loadVisits() {
  try {
    const list = JSON.parse(localStorage.getItem(VISIT_KEY) || '[]');
    return Array.isArray(list) ? list.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)) : [];
  } catch { return []; }
}

/* 아침 알림 설정 */
const NOTIFY_KEY = 'zodigram.notify.v1';

export function loadNotify() {
  try { return normalizeNotify(JSON.parse(localStorage.getItem(NOTIFY_KEY) || 'null')); }
  catch { return normalizeNotify(null); }
}

export function saveNotify(s) {
  const v = normalizeNotify(s);
  try { localStorage.setItem(NOTIFY_KEY, JSON.stringify(v)); } catch { /* 저장 불가 */ }
  return v;
}
