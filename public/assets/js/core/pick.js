// 택일(擇日): 목적에 맞는 날을 점수로 고른다.
// 항목: 건제십이신 · 손 없는 날 · 요일(주말·공휴일) · 내 일지/띠와의 충합 · 함께하는 사람과의 충합 ·
//       수성 역행 · 차오르는 달 · 내 그날 운세 점수. 기본 64점에서 더하고 빼며 50~100 안에 둔다.
// 일지가 충하거나 파(破)일이면 '피할 날'로 표시하고 추천에서 뺀다.
import { getEast, getWest } from './fortune.js';
import { totalScore, tierOf } from './score.js';
import { dayInfo } from './almanac.js';
import { computeSaju, branchRelation, ANIMALS } from './saju.js';
import { isRetrograde } from './planets.js';
import { julianDate, todayKst, jdn } from './astro.js';
import { PURPOSES, PURPOSE_KEYS, OFFICERS } from '../data/pick-text.js';
import { clamp } from './score.js';

const BASE = 64;
const noon = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 3));

/** 그날 정오 기준 내 운세 점수 {total, tier} */
export function dayTotal(profile, y, m, d) {
  const at = noon(y, m, d);
  const s = totalScore(getEast(profile, at), getWest(profile, at));
  return { total: s.total, tier: s.tier };
}

/** 한 달의 날짜별 점수(1일부터). 생년월일이 없으면 null */
export function monthScores(profile, y, m) {
  if (!profile) return null;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out = [null];
  for (let d = 1; d <= days; d++) out.push(dayTotal(profile, y, m, d));
  return out;
}

const REL_NAME = { harmony: '육합', trine: '삼합', same: '같은 기운', neutral: '무난', harm: '해(害)', clash: '충(沖)' };

/** 사람 한 명과 그날 지지의 관계에서 나오는 항목 */
function personItems(P, key, saju, who, branch, items, flags) {
  const dayRel = branchRelation(saju.pillars.day.branch, branch);
  const zRel = branchRelation(saju.zodiacAnimal, branch);
  if (dayRel === 'clash') {
    items.push({ label: `${who} 일지와 충(沖)`, detail: '배우자 자리끼리 부딪히는 날', delta: -P.clash });
    if (P.avoidClash) flags.push(`${who} 일지와 충하는 날`);
  } else if (dayRel === 'harmony' || dayRel === 'trine') {
    items.push({ label: `${who} 일지와 ${REL_NAME[dayRel]}`, detail: '자리가 서로 맞물리는 날', delta: dayRel === 'harmony' ? 6 : 4 });
  } else if (dayRel === 'harm') {
    items.push({ label: `${who} 일지와 해(害)`, detail: '사소한 서운함을 조심하는 날', delta: -4 });
  }
  if (zRel === 'clash') {
    items.push({ label: `${who} ${ANIMALS[saju.zodiacAnimal]}띠와 충`, detail: '띠로 보면 부딪히는 날', delta: -P.zclash });
    if (P.avoidClash && dayRel !== 'clash') flags.push(`${who} 띠와 충하는 날`);
  } else if (zRel === 'harmony') {
    items.push({ label: `${who} ${ANIMALS[saju.zodiacAnimal]}띠와 육합`, detail: '띠로 보면 맞는 날', delta: 4 });
  }
}

function weekdayItem(key, info) {
  const wk = info.weekday;
  const off = wk === 0 || wk === 6 || !!info.holiday;
  if (key === 'wedding') return off ? { label: '주말·공휴일', detail: '하객이 오기 쉬운 날', delta: 6 } : { label: '평일', detail: '하객이 오기 어려울 수 있어요', delta: -3 };
  if (key === 'move') return off ? { label: '주말·공휴일', detail: '짐 옮길 사람과 시간을 구하기 쉬운 날', delta: 3 } : null;
  if (key === 'contract') {
    if (wk === 0 || info.holiday) return { label: '일요일·공휴일', detail: '관공서와 은행이 쉬는 날', delta: -6 };
    if (wk === 6) return { label: '토요일', detail: '업무가 닫힌 곳이 많은 날', delta: -3 };
    return { label: '평일', detail: '서류와 상대를 구하기 쉬운 날', delta: 2 };
  }
  return null;
}

/**
 * 하루를 평가한다.
 * @param ctx {{ profile?, saju?, partner?, partnerSaju? }}
 */
export function evaluateDay(key, y, m, d, ctx = {}) {
  const P = PURPOSES[key];
  const info = dayInfo(y, m, d);
  const off = OFFICERS[info.officer];
  const items = [];
  const flags = [];

  items.push({ label: `건제 ${off.ko}일(${off.hanja})`, detail: off.note, delta: off.delta[key] });
  if (info.officer === 6) flags.push('파(破)일 — 깨지는 기운의 날');

  if (info.sonEmpty && P.son) items.push({ label: '손 없는 날', detail: '움직이는 일에 걸림이 없다고 여겨 온 날', delta: P.son });
  if (key === 'move' && !info.sonEmpty) items.push({ label: `손이 ${info.sonDir}쪽`, detail: `이날은 ${info.sonDir}쪽으로의 이사를 피하세요`, delta: 0 });

  const wk = weekdayItem(key, info);
  if (wk) items.push(wk);

  if (P.waxing && info.lunar.day <= 15) items.push({ label: '차오르는 달', detail: '음력 1~15일, 시작하는 일에 기운이 붙는다고 여겨요', delta: P.waxing });

  if (P.merc && isRetrograde('mercury', julianDate(y, m, d, 12, 0, 9))) {
    items.push({ label: '수성 역행 중', detail: '서류·연락·일정이 꼬이기 쉬운 기간', delta: P.merc });
  }

  if (ctx.saju) personItems(P, key, ctx.saju, '내', info.pillar.branch, items, flags);
  if (ctx.partnerSaju) personItems(P, key, ctx.partnerSaju, `${ctx.partner?.name || '상대'}님`, info.pillar.branch, items, flags);

  let total = null;
  if (ctx.profile) {
    const mine = dayTotal(ctx.profile, y, m, d).total;
    const theirs = ctx.partner ? dayTotal(ctx.partner, y, m, d).total : null;
    total = theirs === null ? mine : Math.round((mine + theirs) / 2);
    items.push({ label: theirs === null ? `내 그날 운세 ${total}점` : `두 사람의 그날 운세 평균 ${total}점`, detail: '그날의 일진과 하늘이 사주·출생 차트에 주는 영향', delta: Math.round((total - 75) * 0.5) });
  }

  const score = clamp(BASE + items.reduce((a, i) => a + i.delta, 0));
  const highlights = items.filter((i) => i.delta >= 4).sort((a, b) => b.delta - a.delta).map((i) => i.label);
  return { year: y, month: m, day: d, key, score, items, flags, avoid: flags.length > 0, highlights, info, total };
}

/** 오늘부터 days일 동안 가장 좋은 날과 피할 날 */
export function findDays(key, { profile = null, partner = null, days = 90, from = null } = {}) {
  const start = from || todayKst();
  const ctx = {};
  if (profile) { ctx.profile = profile; ctx.saju = computeSaju(profile); }
  if (partner) { ctx.partner = partner; ctx.partnerSaju = computeSaju(partner); }
  const base = jdn(start.year, start.month, start.day);
  const all = [];
  for (let k = 0; k < days; k++) {
    const t = new Date(Date.UTC(start.year, start.month - 1, start.day + k));
    all.push(evaluateDay(key, t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), ctx));
  }
  const good = all.filter((x) => !x.avoid).sort((a, b) => b.score - a.score || (a.year * 400 + a.month * 31 + a.day) - (b.year * 400 + b.month * 31 + b.day));
  const avoid = all.filter((x) => x.avoid);
  return { key, from: start, days, base, partnerName: partner ? partner.name : '', all, best: good.slice(0, 5), more: good.slice(5, 15), avoid, personal: !!profile, withPartner: !!partner };
}

export { PURPOSES, PURPOSE_KEYS, tierOf };
