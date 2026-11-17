// 궁합: 두 사람의 사주(동양)와 출생 차트(서양)를 견준다.
// 동양: 일간의 천간합·오행 생극, 일지(배우자 자리)의 합·충·해, 띠의 합·충·원진, 서로 부족한 오행을 채워 주는지
// 서양: 태양 별자리 원소, 달끼리의 각, 금성-화성(끌림), 태양-달(정서적 이해)의 교차 각
// 점수는 기본 70에서 더하고 빼며 50~100 안에 둔다.
import { computeSaju, STEMS, BRANCHES, ANIMALS, STEM_ELEMENT, ELEMENTS, branchRelation } from './saju.js';
import { natalChart } from './natal.js';
import { clamp } from './score.js';
import { SIGNS } from '../data/western.js';
import { PLANETS, j } from '../data/astrology.js';

const BASE = 68;
const sum = (items) => clamp(BASE + items.reduce((a, i) => a + i.delta, 0));
const norm = (x) => ((x % 360) + 360) % 360;

// 천간합: 甲己 乙庚 丙辛 丁壬 戊癸 (두 천간의 차가 5)
const stemHarmony = (a, b) => Math.abs(a - b) === 5;
// 원진: 띠 차이가 5 또는 7 (子未·丑午·寅酉·卯申·辰亥·巳戌)
const wonjin = (a, b) => { const d = Math.abs(a - b); return d === 5 || d === 7; };

const DAY_REL = { harmony: 10, trine: 6, same: 2, neutral: 0, harm: -6, clash: -10 };
const DAY_REL_TEXT = {
  harmony: '배우자 자리끼리 육합 — 자연스럽게 맞물립니다', trine: '배우자 자리끼리 삼합 — 같은 방향을 봅니다',
  same: '배우자 자리가 같은 기운 — 서로를 잘 압니다', neutral: '배우자 자리가 무난한 관계입니다',
  harm: '배우자 자리끼리 해(害) — 사소한 서운함을 조심하세요', clash: '배우자 자리끼리 충(沖) — 부딪히지만 그만큼 자극이 됩니다',
};
const ANIMAL_REL = { harmony: 6, trine: 5, same: 1, neutral: 0, harm: -3, clash: -6 };

function eastMatch(a, b) {
  const sa = computeSaju(a), sb = computeSaju(b);
  const da = sa.dayMaster, db = sb.dayMaster;
  const ea = STEM_ELEMENT[da], eb = STEM_ELEMENT[db];
  const items = [];
  if (stemHarmony(da, db)) {
    items.push({ label: `일간 ${STEMS[da]}·${STEMS[db]} 천간합`, detail: '두 사람의 중심이 서로 끌어당기는 합', delta: 10 });
  } else {
    const d = ((eb - ea) % 5 + 5) % 5; // 0 같음, 1 a가 b를 생, 4 b가 a를 생, 2 a가 b를 극, 3 b가 a를 극
    const map = {
      0: ['같은 오행', '닮은 점이 많아 편하지만 고집도 닮을 수 있어요', 3],
      1: [`${j(ELEMENTS[ea], '이', '가')} ${j(ELEMENTS[eb], '을', '를')} 살림`, '한쪽이 다른 쪽을 북돋는 상생', 7],
      4: [`${j(ELEMENTS[eb], '이', '가')} ${j(ELEMENTS[ea], '을', '를')} 살림`, '한쪽이 다른 쪽을 북돋는 상생', 7],
      2: [`${j(ELEMENTS[ea], '이', '가')} ${j(ELEMENTS[eb], '을', '를')} 누름`, '한쪽이 이끌고 한쪽이 맞추는 상극, 배려가 필요해요', -5],
      3: [`${j(ELEMENTS[eb], '이', '가')} ${j(ELEMENTS[ea], '을', '를')} 누름`, '한쪽이 이끌고 한쪽이 맞추는 상극, 배려가 필요해요', -5],
    }[d];
    items.push({ label: `일간 ${STEMS[da]}·${STEMS[db]} · ${map[0]}`, detail: map[1], delta: map[2] });
  }
  const dr = branchRelation(sa.pillars.day.branch, sb.pillars.day.branch);
  items.push({ label: `일지 ${BRANCHES[sa.pillars.day.branch]}·${BRANCHES[sb.pillars.day.branch]}`, detail: DAY_REL_TEXT[dr], delta: DAY_REL[dr] });
  const za = sa.zodiacAnimal, zb = sb.zodiacAnimal;
  const ar = branchRelation(za, zb);
  if (ar === 'neutral' && wonjin(za, zb)) {
    items.push({ label: `${ANIMALS[za]}띠·${ANIMALS[zb]}띠 원진`, detail: '이유 없이 서운해지기 쉬운 사이, 표현을 아끼지 마세요', delta: -4 });
  } else {
    const t = { harmony: '육합', trine: '삼합', same: '같은 띠', neutral: '무난', harm: '해', clash: '충' }[ar];
    items.push({ label: `${ANIMALS[za]}띠·${ANIMALS[zb]}띠 ${t}`, detail: '띠로 본 기본 궁합', delta: ANIMAL_REL[ar] });
  }
  // 서로 부족한 오행을 채워 주는가
  const weak = (s) => s.counts.indexOf(Math.min(...s.counts));
  const strong = (s) => s.counts.indexOf(Math.max(...s.counts));
  const fills = [weak(sa) === strong(sb), weak(sb) === strong(sa)].filter(Boolean).length;
  if (fills) items.push({ label: fills === 2 ? '서로 부족한 오행을 채워 줌' : '한쪽의 부족한 오행을 채워 줌', detail: '한 사람에게 적은 기운을 다른 사람이 넉넉히 가졌어요', delta: fills * 4 });
  return { score: sum(items), base: BASE, items, saju: [sa, sb] };
}

const ASPECTS = [[0, '합', 'close'], [60, '육분', 'good'], [90, '사각', 'hard'], [120, '삼각', 'good'], [180, '대립', 'pull']];
function aspect(l1, l2, orb = 8) {
  const sep = Math.abs(norm(l1 - l2 + 180) - 180);
  for (const [ang, name, tone] of ASPECTS) if (Math.abs(sep - ang) <= orb) return { name, tone };
  return null;
}
const COMPAT_EL = { 불: '공기', 공기: '불', 흙: '물', 물: '흙' };

function westMatch(a, b) {
  const na = natalChart(a), nb = natalChart(b);
  const P = (n, k) => n.planets.find((p) => p.key === k);
  const items = [];
  const sa = P(na, 'sun'), sb = P(nb, 'sun');
  const ela = SIGNS[sa.sign].element, elb = SIGNS[sb.sign].element;
  const dist = Math.min(((sa.sign - sb.sign) % 12 + 12) % 12, ((sb.sign - sa.sign) % 12 + 12) % 12);
  if (ela === elb) items.push({ label: `${SIGNS[sa.sign].ko}·${SIGNS[sb.sign].ko} · 같은 ${ela} 원소`, detail: '기질이 비슷해 말이 잘 통합니다', delta: 8 });
  else if (COMPAT_EL[ela] === elb) items.push({ label: `${SIGNS[sa.sign].ko}·${SIGNS[sb.sign].ko} · ${j(ela, '과', '와')} ${elb}`, detail: '서로의 기운을 살려 주는 원소', delta: 6 });
  else if (dist === 3) items.push({ label: `${SIGNS[sa.sign].ko}·${SIGNS[sb.sign].ko} · 사각`, detail: '방식이 달라 부딪히지만 함께 성장합니다', delta: -6 });
  else if (dist === 6) items.push({ label: `${SIGNS[sa.sign].ko}·${SIGNS[sb.sign].ko} · 마주 보는 자리`, detail: '정반대라 끌리고, 서로를 채웁니다', delta: 3 });
  else items.push({ label: `${SIGNS[sa.sign].ko}·${SIGNS[sb.sign].ko}`, detail: '서로 다른 리듬을 맞춰 가는 사이', delta: -2 });

  const pairs = [
    ['moon', 'moon', '감정의 박자', { close: 6, good: 6, hard: -4, pull: -2 }],
    ['venus', 'mars', '끌림', { close: 6, good: 5, hard: -3, pull: 3 }],
    ['mars', 'venus', '끌림', { close: 6, good: 5, hard: -3, pull: 3 }],
    ['sun', 'moon', '서로를 이해함', { close: 6, good: 5, hard: -4, pull: 0 }],
    ['moon', 'sun', '서로를 이해함', { close: 6, good: 5, hard: -4, pull: 0 }],
  ];
  const found = [];
  for (const [k1, k2, theme, pts] of pairs) {
    const x = aspect(P(na, k1).lon, P(nb, k2).lon);
    if (!x) continue;
    found.push({ label: `${a.name || '나'}의 ${PLANETS[k1].ko} ${x.name} ${b.name || '상대'}의 ${PLANETS[k2].ko}`, detail: `${theme} — ${pts[x.tone] > 0 ? '잘 맞물립니다' : pts[x.tone] < 0 ? '조율이 필요합니다' : '서로를 의식합니다'}`, delta: pts[x.tone] });
  }
  found.sort((p, q) => Math.abs(q.delta) - Math.abs(p.delta));
  items.push(...found.slice(0, 3));
  return { score: sum(items), base: BASE, items, natal: [na, nb], uncertain: !na.hasTime || !nb.hasTime };
}

const LEVELS = [
  [88, '천생연분', '말하지 않아도 통하는 사이예요. 서로를 당연하게 여기지 않는 것만 기억하세요.'],
  [80, '잘 맞는 사이', '함께 있으면 편하고 서로를 북돋아요. 작은 고마움을 자주 표현하면 더 단단해져요.'],
  [70, '무난한 사이', '큰 부딪힘 없이 맞춰 갈 수 있어요. 서로의 다른 점을 재미로 받아들이면 좋아요.'],
  [62, '노력이 빛나는 사이', '다른 점이 분명하지만, 그만큼 서로에게 배울 것이 많아요. 대화의 속도를 맞춰 보세요.'],
  [0, '서로 배우는 사이', '방식이 많이 달라요. 다름을 고칠 대상이 아니라 각자의 색으로 인정할 때 편해져요.'],
];

/** 두 사람의 궁합 */
export function computeMatch(a, b) {
  const east = eastMatch(a, b);
  const west = westMatch(a, b);
  const total = Math.round((east.score + west.score) / 2);
  const [, level, text] = LEVELS.find(([min]) => total >= min);
  return { total, level, text, east, west };
}
