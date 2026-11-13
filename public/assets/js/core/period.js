// 이달 · 이번 분기 · 올해 운세.
// 동양: 세운(그 해의 간지)·월운(그 달의 간지)을 내 일간·일지·띠와 견주고, 올해는 삼재를 함께 본다.
// 서양: 올해는 목성·토성이 지나는 솔라 하우스와 개인년, 이달은 태양이 비추는 하우스·금성·수성 역행·개인월.
// 점수는 하루 점수처럼 기본 점수에 항목을 더하고 빼며, 가장 나쁜 조합 50 · 가장 좋은 조합 100.
import { jdn, julianDate, todayKst } from './astro.js';
import { computeSaju, tenGod, branchRelation, STEM_ELEMENT, ANIMALS, ELEMENTS } from './saju.js';
import { sunSign, personalDay } from './western.js';
import { planetLongitude, isRetrograde } from './planets.js';
import { SIGNS, HOUSES } from '../data/western.js';
import { TEN_GOD_PERIOD, SAMJAE, PERSONAL_CYCLE, PERIOD_ADVICE } from '../data/period-text.js';
import { TEN_GOD, TEN_GOD_WHY, REL, ANIMAL_REL, REL_NAME, ASPECT, HOUSE, clamp, tierOf } from './score.js';

const sum = (base, items) => clamp(base + items.reduce((a, i) => a + i.delta, 0));
const noonJd = (y, m, d) => julianDate(y, m, d, 12, 0, 9);
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const signAt = (planet, y, m, d) => Math.floor(planetLongitude(planet, noonJd(y, m, d)) / 30);
const houseFrom = (sign, mySign) => ((sign - mySign) % 12 + 12) % 12 + 1;

function reduceNum(n) {
  while (n > 9) n = String(n).split('').reduce((a, c) => a + Number(c), 0);
  return n;
}

// ── 서양 기간 배점 ──
// 올해: 목성(-6~14) · 토성(-10~6) · 개인년(-5~9), 기본 71
const JUPITER = { 1: 12, 2: 8, 3: 2, 4: 4, 5: 12, 6: 0, 7: 8, 8: -2, 9: 14, 10: 12, 11: 10, 12: -6 };
const SATURN = { 1: -10, 2: -4, 3: 2, 4: -6, 5: -2, 6: 4, 7: -6, 8: -8, 9: 2, 10: 6, 11: 4, 12: -4 };
const CYCLE = { 1: 9, 2: 0, 3: 7, 4: 2, 5: 6, 6: 4, 7: -3, 8: 9, 9: -5 };
const VENUS_GOOD = new Set([0, 2, 4, 8, 10]);
const VENUS_HARD = new Set([3, 6, 9]);

/** 수성 역행 구간(그 기간과 겹치는 부분) */
export function mercuryRetrogrades(y1, m1, d1, y2, m2, d2) {
  const start = jdn(y1, m1, d1), end = jdn(y2, m2, d2);
  const out = [];
  let cur = null;
  for (let d = start; d <= end; d++) {
    const retro = isRetrograde('mercury', d);
    if (retro && !cur) cur = { from: d };
    if (!retro && cur) { cur.to = d - 1; out.push(cur); cur = null; }
  }
  if (cur) { cur.to = end; out.push(cur); }
  const md = (j) => { const t = new Date((j - 2440587.5) * 86400000); return `${t.getUTCMonth() + 1}.${t.getUTCDate()}`; };
  return out.map((r) => ({ ...r, text: `${md(r.from)}~${md(r.to)}` }));
}

/** 그 해(달)의 간지로 본 동양 항목 */
function eastItems(saju, p, kind) {
  const label = kind === 'year' ? '세운' : '월운';
  const god = tenGod(saju.dayMaster, p.stem);
  const rel = branchRelation(saju.pillars.day.branch, p.branch);
  const animalRel = branchRelation(saju.zodiacAnimal, p.branch);
  const items = [
    { label: `${label} ${p.hanja} · ${god}`, detail: TEN_GOD_WHY[god], delta: TEN_GOD[god] },
    { label: `내 일지와 ${REL_NAME[rel]}`, detail: `${kind === 'year' ? '올해' : '이달'}의 지지와 내 일주 지지의 관계`, delta: REL[rel] },
    { label: `${ANIMALS[saju.zodiacAnimal]}띠와 ${REL_NAME[animalRel]}`, detail: `${kind === 'year' ? '올해' : '이달'}의 지지와 내 띠의 관계`, delta: ANIMAL_REL[animalRel] },
  ];
  return { god, rel, items };
}

/** 삼재: 띠 무리(申子辰·巳酉丑·寅午戌·亥卯未)마다 정해진 세 해 */
export function samjae(animalBranch, yearBranch) {
  const start = [2, 11, 8, 5][animalBranch % 4];
  const k = ((yearBranch - start) % 12 + 12) % 12;
  return k < 3 ? { stage: k, ...SAMJAE[k] } : null;
}

/** 올해 운세 */
export function getYear(profile, now = new Date()) {
  const { year } = todayKst(now);
  const saju = computeSaju(profile);
  const yp = computeSaju({ year, month: 6, day: 15 }).pillars.year;
  const e = eastItems(saju, yp, 'year');
  const sj = samjae(saju.zodiacAnimal, yp.branch);
  e.items.push(sj
    ? { label: `${sj.name}`, detail: `${ANIMALS[saju.zodiacAnimal]}띠의 삼재 해(옛 풍속)`, delta: -5 }
    : { label: '삼재 없음', detail: '올해는 내 띠의 삼재 해가 아닙니다', delta: 0 });
  const eastScore = sum(72, e.items);

  // 서양: 한 해 중 더 오래 머무는 별자리로 본다
  const my = sunSign(profile).index;
  // 한 해 중 더 오래 머무는 별자리(같으면 뒤쪽)
  const majority = (planet) => {
    const counts = {}, last = {};
    for (let m = 1; m <= 12; m++) { const s = signAt(planet, year, m, 15); counts[s] = (counts[s] || 0) + 1; last[s] = m; }
    return Number(Object.keys(counts).sort((a, b) => counts[b] - counts[a] || last[b] - last[a])[0]);
  };
  // 한 해 동안 지나는 별자리 순서: 게자리 → 사자자리(7.1~)
  const path = (planet) => {
    let prev = signAt(planet, year, 1, 1);
    const parts = [SIGNS[prev].ko];
    for (let d = 2; d <= 365; d++) {
      const t = new Date(Date.UTC(year, 0, d));
      const s = signAt(planet, year, t.getUTCMonth() + 1, t.getUTCDate());
      if (s !== prev) { parts.push(`${SIGNS[s].ko}(${t.getUTCMonth() + 1}.${t.getUTCDate()}~)`); prev = s; }
    }
    return parts.join(' → ');
  };
  const jSign = majority('jupiter'), sSign = majority('saturn');
  const jH = houseFrom(jSign, my), sH = houseFrom(sSign, my);
  const py = personalDay(profile, { year, month: 1, day: 1 }).personalYear;
  const w = [
    { label: `목성 · 제${jH}하우스`, detail: `${SIGNS[jSign].ko}의 목성이 ${HOUSES[jH - 1].area} 영역을 넓혀 줍니다`, delta: JUPITER[jH] },
    { label: `토성 · 제${sH}하우스`, detail: `${SIGNS[sSign].ko}의 토성이 ${HOUSES[sH - 1].area} 영역을 단단히 다지게 합니다`, delta: SATURN[sH] },
    { label: `개인년 ${py}`, detail: PERSONAL_CYCLE[py].title, delta: CYCLE[py] },
  ];
  const westScore = sum(71, w);
  return finish('year', {
    title: `${year}년`, east: { score: eastScore, base: 72, items: e.items }, west: { score: westScore, base: 71, items: w },
    eastView: { pillar: yp, god: e.god, ...TEN_GOD_PERIOD[e.god], samjae: sj, note: '세운은 입춘(2월 4일 무렵)부터 바뀝니다' },
    westView: {
      jupiter: { sign: SIGNS[jSign].ko, house: jH, area: HOUSES[jH - 1].area, path: path('jupiter') },
      saturn: { sign: SIGNS[sSign].ko, house: sH, area: HOUSES[sH - 1].area, path: path('saturn') },
      cycle: { number: py, ...PERSONAL_CYCLE[py] },
    },
  });
}

/** 한 달 운세(y, m 을 주면 그 달) */
export function getMonth(profile, now = new Date(), y, m) {
  const t = todayKst(now);
  const year = y ?? t.year, month = m ?? t.month;
  const saju = computeSaju(profile);
  const mp = computeSaju({ year, month, day: 15 }).pillars.month;
  const e = eastItems(saju, mp, 'month');
  const weakest = saju.counts.indexOf(Math.min(...saju.counts));
  const strongest = saju.counts.indexOf(Math.max(...saju.counts));
  const el = STEM_ELEMENT[mp.stem];
  if (el === weakest) e.items.push({ label: '부족한 오행이 채워짐', detail: `내게 가장 적은 ${ELEMENTS[el]}의 기운이 이달에 들어옵니다`, delta: 2 });
  else if (el === strongest && saju.counts[el] >= 3) e.items.push({ label: '넘치는 오행이 더해짐', detail: `이미 많은 ${ELEMENTS[el]}의 기운이 이달에 더 들어옵니다`, delta: -3 });
  const eastScore = sum(70, e.items);

  const my = sunSign(profile).index;
  const sunH = houseFrom(signAt('sun', year, month, 15), my);
  const dist = sunH - 1;
  const aspectKey = Math.min(dist, 12 - dist);
  const vSign = signAt('venus', year, month, 15);
  const vDist = ((vSign - my) % 12 + 12) % 12;
  const vDelta = VENUS_GOOD.has(vDist) ? 4 : VENUS_HARD.has(vDist) ? -4 : 0;
  const retro = mercuryRetrogrades(year, month, 1, year, month, daysIn(year, month));
  const pm = reduceNum(personalDay(profile, { year, month: 1, day: 1 }).personalYear + month);
  const w = [
    { label: `태양 · 제${sunH}하우스`, detail: `이달은 ${HOUSES[sunH - 1].area}에 빛이 듭니다`, delta: ASPECT[aspectKey] + HOUSE[sunH] },
    { label: `금성 · ${SIGNS[vSign].ko}`, detail: vDelta > 0 ? '관계와 즐거움이 부드럽게 흐릅니다' : vDelta < 0 ? '관계에서 작은 조율이 필요합니다' : '관계는 평소처럼 흐릅니다', delta: vDelta },
    { label: retro.length ? `수성 역행 ${retro.map((r) => r.text).join(', ')}` : '수성 역행 없음', detail: retro.length ? '연락·계약·이동은 한 번 더 확인하세요' : '말과 연락이 순조로운 달', delta: retro.length ? -5 : 0 },
    { label: `개인월 ${pm}`, detail: PERSONAL_CYCLE[pm].title, delta: CYCLE[pm] },
  ];
  const westScore = sum(71, w);
  return finish('month', {
    title: `${year}년 ${month}월`, year, month,
    east: { score: eastScore, base: 70, items: e.items }, west: { score: westScore, base: 71, items: w },
    eastView: { pillar: mp, god: e.god, ...TEN_GOD_PERIOD[e.god], note: '월운은 그달의 절입(4~8일 무렵)부터 바뀝니다' },
    westView: { sunHouse: sunH, area: HOUSES[sunH - 1].area, venus: SIGNS[vSign].ko, retro, cycle: { number: pm, ...PERSONAL_CYCLE[pm] } },
  });
}

/** 이번 분기: 세 달의 흐름 */
export function getQuarter(profile, now = new Date()) {
  const t = todayKst(now);
  const q = Math.floor((t.month - 1) / 3);
  const months = [1, 2, 3].map((k) => getMonth(profile, now, t.year, q * 3 + k));
  const avg = (f) => Math.round(months.reduce((a, m) => a + f(m), 0) / 3);
  const retro = mercuryRetrogrades(t.year, q * 3 + 1, 1, t.year, q * 3 + 3, daysIn(t.year, q * 3 + 3));
  const asItems = (side) => months.map((m) => ({ label: `${m.month}월`, detail: side === 'east' ? m.eastView.title : `태양 제${m.westView.sunHouse}하우스 · ${m.westView.area}`, delta: m[side].score }));
  return finish('quarter', {
    title: `${t.year}년 ${q + 1}분기`, quarter: q + 1, months, retro,
    east: { score: avg((m) => m.east.score), items: asItems('east'), average: true },
    west: { score: avg((m) => m.west.score), items: asItems('west'), average: true },
  });
}

function finish(kind, r) {
  const total = Math.round((r.east.score + r.west.score) / 2);
  const t = tierOf(total);
  const p = { year: '해', month: '달', quarter: '분기' }[kind];
  return { kind, ...r, total, tier: t.tier, tone: t.tone, advice: PERIOD_ADVICE[t.tier].replace('{p}', p) };
}
