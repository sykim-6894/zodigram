// 보관함: 저장할 결과를 항목으로 만들고, 내 점수 기록(지난 30일)과 연속 방문 일수를 계산한다.
// 점수는 날짜만 알면 다시 계산되므로 저장하지 않고, 저장하는 것은 사용자가 누른 결과와 방문 날짜뿐이다.
import { readCast } from './iching.js';
import { dayTotal } from './pick.js';
import { jdn, dateKey } from './astro.js';
import { PURPOSES } from '../data/pick-text.js';

export const KINDS = {
  iching: { ko: '주역 점', mark: '卦' },
  tarot: { ko: '타로', mark: '牌' },
  match: { ko: '궁합', mark: '緣' },
  day: { ko: '택일', mark: '日' },
};
export const KIND_KEYS = ['iching', 'tarot', 'match', 'day'];

const brief = (items, n = 4) => items.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, n)
  .map((i) => ({ label: i.label, detail: i.detail, delta: i.delta }));

/** 주역 점: 여섯 번 던진 값과 질문 */
export function ichingItem(values, question = '') {
  const r = readCast(values);
  const name = (h) => `${h.num}. ${h.fullName}`;
  return { kind: 'iching', title: r.relating ? `${name(r.primary)} → ${name(r.relating)}` : name(r.primary), memo: '', data: { values: values.slice(), question: question.trim() } };
}

/** 타로 세 장: 고른 카드 번호와 방향 */
export function tarotItem(chosen) {
  return {
    kind: 'tarot', memo: '',
    title: chosen.map((c) => `${c.card.ko}${c.reversed ? '(역)' : ''}`).join(' · '),
    data: { picks: chosen.map((c) => ({ n: c.card.n, reversed: !!c.reversed })) },
  };
}

/** 궁합: 그때의 결과를 그대로 남긴다(나중에 정보가 바뀌어도 저장본은 그대로) */
export function matchItem(me, other, r) {
  const names = [me.name || '나', other.name];
  return {
    kind: 'match', memo: '', title: `${names[0]} × ${names[1]}`,
    data: { personId: other.id || null, names, relation: other.relation || '', total: r.total, level: r.level, text: r.text,
      east: { score: r.east.score, items: brief(r.east.items) }, west: { score: r.west.score, items: brief(r.west.items) } },
  };
}

/** 택일에서 고른 날짜 */
export function dayItem(key, x, partnerName = '') {
  return {
    kind: 'day', memo: '', title: `${x.year}년 ${x.month}월 ${x.day}일 ${PURPOSES[key].ko}`,
    data: { purpose: key, year: x.year, month: x.month, day: x.day, score: x.score, officer: x.info.officer, partnerName, personal: !!x.total,
      items: x.items.map((i) => ({ label: i.label, detail: i.detail, delta: i.delta })) },
  };
}

/** 같은 날짜·목적·상대로 이미 저장했는가 */
export function hasDayItem(items, key, x, partnerName = '') {
  return items.some((i) => i.kind === 'day' && i.data.purpose === key && i.data.year === x.year && i.data.month === x.month && i.data.day === x.day && (i.data.partnerName || '') === partnerName);
}

/** 오늘로부터 며칠 뒤인가(지났으면 음수) */
export function daysUntil(y, m, d, today) {
  return jdn(y, m, d) - jdn(today.year, today.month, today.day);
}

/** 지난 n일(오늘 포함) 내 점수 흐름 */
export function scoreHistory(profile, today, n = 30) {
  if (!profile) return [];
  const out = [];
  for (let k = n - 1; k >= 0; k--) {
    const t = new Date(Date.UTC(today.year, today.month - 1, today.day - k));
    const y = t.getUTCFullYear(), m = t.getUTCMonth() + 1, d = t.getUTCDate();
    out.push({ year: y, month: m, day: d, total: dayTotal(profile, y, m, d).total });
  }
  return out;
}

/** 점수 흐름 요약: 평균, 가장 높은 날, 가장 낮은 날 */
export function summarize(hist) {
  if (!hist.length) return null;
  const avg = Math.round(hist.reduce((a, h) => a + h.total, 0) / hist.length);
  const best = hist.reduce((a, h) => (h.total > a.total ? h : a));
  const worst = hist.reduce((a, h) => (h.total < a.total ? h : a));
  return { avg, best, worst };
}

/** 연속 방문 일수. 오늘 기록이 아직 없으면 어제부터 센다. */
export function streak(visits, today) {
  const set = new Set(visits);
  const key = (k) => { const t = new Date(Date.UTC(today.year, today.month - 1, today.day - k)); return dateKey({ year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() }); };
  let k = set.has(key(0)) ? 0 : 1;
  let n = 0;
  while (set.has(key(k))) { n++; k++; }
  return n;
}

export function monthVisits(visits, year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  return visits.filter((k) => k.startsWith(prefix)).length;
}
