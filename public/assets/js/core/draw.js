// 오늘의 한 장 뽑기 — 하루 한 장, 뽑은 카드는 도감에 쌓인다.
import { MAJOR_ARCANA } from '../data/tarot.js';

/** 기록에서 카드별 뽑은 횟수와 모은 장 수를 센다 */
export function collection(draws) {
  const counts = MAJOR_ARCANA.map(() => 0);
  let total = 0;
  for (const d of Object.values(draws || {})) {
    if (d && Number.isInteger(d.n) && d.n >= 0 && d.n < counts.length) { counts[d.n]++; total++; }
  }
  return { counts, total, owned: counts.filter((c) => c > 0).length, size: counts.length };
}

/** 연속으로 뽑은 날 수(오늘 뽑지 않았으면 어제까지 센다) */
export function drawStreak(draws, todayKey) {
  const set = new Set(Object.keys(draws || {}));
  const day = (k, delta) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10); };
  let k = set.has(todayKey) ? todayKey : day(todayKey, -1);
  let n = 0;
  while (set.has(k)) { n++; k = day(k, -1); }
  return n;
}
