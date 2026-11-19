// 백업·복원 — 이 기기에만 있는 내 정보·저장한 사람·보관함·방문 기록·알림 설정을 글자(JSON) 한 덩어리로 내보내고 되가져온다.
import { STORAGE_KEYS } from './storage.js';

export const BACKUP_APP = 'zodigram';
export const BACKUP_VERSION = 1;

// 항목마다 들어 있어야 하는 모양
const SHAPES = {
  profile: (v) => v && typeof v === 'object' && !Array.isArray(v) && v.year && v.month && v.day,
  people: Array.isArray,
  vault: Array.isArray,
  visits: Array.isArray,
  notify: (v) => v && typeof v === 'object' && !Array.isArray(v),
  draws: (v) => v && typeof v === 'object' && !Array.isArray(v),
};

function readJson(storage, key) {
  try { const raw = storage.getItem(key); return raw == null ? undefined : JSON.parse(raw); } catch { return undefined; }
}

/** 저장된 내용을 백업 글자로 만든다 */
export function createBackup(storage = localStorage, now = new Date()) {
  const data = {};
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    const v = readJson(storage, key);
    if (v !== undefined && SHAPES[name](v)) data[name] = v;
  }
  return JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, createdAt: now.toISOString(), data });
}

/** 백업 글자를 검사한다. 쓸 수 있으면 { ok:true, data, counts } */
export function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(String(text || '').trim()); } catch { return { ok: false, reason: 'format' }; }
  if (!obj || obj.app !== BACKUP_APP || !obj.data || typeof obj.data !== 'object') return { ok: false, reason: 'format' };
  if (!(obj.version <= BACKUP_VERSION)) return { ok: false, reason: 'version' };
  const data = {};
  for (const name of Object.keys(STORAGE_KEYS)) {
    const v = obj.data[name];
    if (v !== undefined && SHAPES[name](v)) data[name] = v;
  }
  if (!Object.keys(data).length) return { ok: false, reason: 'empty' };
  const counts = { profile: data.profile ? 1 : 0, people: data.people?.length || 0, vault: data.vault?.length || 0 };
  return { ok: true, data, counts, createdAt: obj.createdAt || '' };
}

/** 백업 내용으로 이 기기의 저장 내용을 바꾼다(백업에 있는 항목만 덮어쓴다) */
export function restoreBackup(text, storage = localStorage) {
  const r = parseBackup(text);
  if (!r.ok) return r;
  try {
    for (const [name, v] of Object.entries(r.data)) storage.setItem(STORAGE_KEYS[name], JSON.stringify(v));
  } catch { return { ok: false, reason: 'storage' }; }
  return r;
}

/** 백업 파일 이름: zodigram-backup-2026-11-19.json */
export const backupFileName = (now = new Date()) => `zodigram-backup-${now.toISOString().slice(0, 10)}.json`;
