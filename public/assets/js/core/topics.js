// 주제별 운세: 연애 · 재물 · 일·학업 · 건강 × 오늘 · 이달 · 올해.
// 동양: 그 기간 간지(일진·월운·세운)의 십신과 지지 관계, 도화, 오행 균형, 올해는 자미두수 유년 사화.
// 서양: 그 기간 하늘(오늘 정오·그달 15일·올해 목성/토성)이 출생 차트의 하우스와 행성에 주는 영향.
// 점수는 기본 70에서 항목을 더하고 빼며 50~100 안에 둔다.
import { julianDate, todayKst, dateKey } from './astro.js';
import { computeSaju, dayPillar, tenGod, branchRelation, STEM_ELEMENT, BRANCH_MAIN_STEM, ELEMENTS } from './saju.js';
import { planetLongitude, isRetrograde } from './planets.js';
import { natalChart } from './natal.js';
import { ziweiChart, ziweiYear } from './ziwei.js';
import { clamp, tierOf, REL_NAME } from './score.js';
import { rng } from './seed.js';
import { HOUSES, SIGNS } from '../data/western.js';
import { PLANETS } from '../data/astrology.js';
import { TOPICS, TOPIC_KEYS, TOPIC_HEAD, TOPIC_TIP } from '../data/topic-text.js';

const BASE = 70;
const norm = (x) => ((x % 360) + 360) % 360;
const sum = (items) => clamp(BASE + items.reduce((a, i) => a + i.delta, 0));
const SCALE = 1.4; // 항목이 적은 주제 점수가 한가운데로 몰리지 않게 키운다
const sc = (n) => Math.round(n * SCALE);
const half = (n) => Math.round(n / 2);

// ── 동양: 십신 배점(천간 기준, 지지 본기는 절반) ──
const GOD = {
  money: { 정재: 12, 편재: 12, 식신: 8, 상관: 4, 정관: 2, 편관: -2, 정인: 0, 편인: -3, 비견: -4, 겁재: -10 },
  work: { 정관: 12, 편관: 6, 정인: 8, 편인: 4, 식신: 4, 상관: -4, 정재: 4, 편재: 2, 비견: 2, 겁재: -4 },
  health: { 식신: 6, 정인: 6, 편인: 0, 정관: 2, 비견: 4, 겁재: -2, 상관: -2, 정재: 2, 편재: 0, 편관: -5 },
};
function loveGod(gender) {
  const base = { 식신: 4, 상관: 2, 비견: 0, 겁재: -6, 정인: 2, 편인: -3 };
  if (gender === 'm') return { ...base, 정재: 10, 편재: 8, 정관: 2, 편관: 0, 겁재: -8 }; // 남성: 재성이 배우자 별
  if (gender === 'f') return { ...base, 정관: 10, 편관: 7, 정재: 2, 편재: 0, 상관: -4 }; // 여성: 관성이 배우자 별
  return { ...base, 정재: 6, 정관: 6, 편재: 4, 편관: 4 }; // 성별을 모르면 둘 다 반영
}
const GOD_WHY = {
  love: { 정재: '이성과 인연의 기운', 편재: '설레는 만남의 기운', 정관: '믿음직한 인연의 기운', 편관: '강하게 끌리는 기운', 식신: '표현이 부드러워지는 기운', 상관: '매력은 늘지만 말이 앞서는 기운', 겁재: '경쟁자가 생기기 쉬운 기운', 비견: '친구 같은 편안한 기운', 정인: '보살핌을 받는 기운', 편인: '마음이 안으로 숨는 기운' },
  money: { 정재: '꾸준한 수입의 기운', 편재: '뜻밖의 재물 기운', 식신: '일한 만큼 돈이 되는 기운', 상관: '재주가 돈이 되는 기운', 정관: '안정된 자리의 기운', 편관: '부담이 커지는 기운', 정인: '도움은 오나 돈은 보통', 편인: '판단이 흐려지기 쉬운 기운', 비견: '나눠 쓸 일이 생기는 기운', 겁재: '지출과 경쟁이 늘어나는 기운' },
  work: { 정관: '인정과 승진의 기운', 편관: '책임이 커지는 기운', 정인: '배움과 자격의 기운', 편인: '깊이 파고드는 기운', 식신: '실력이 결과로 나오는 기운', 상관: '규칙과 부딪히기 쉬운 기운', 정재: '성실함이 보상받는 기운', 편재: '기회가 넓어지는 기운', 비견: '동료와 힘을 합치는 기운', 겁재: '경쟁이 치열해지는 기운' },
  health: { 식신: '잘 먹고 잘 쉬는 기운', 정인: '회복을 돕는 기운', 편인: '생각이 많아지는 기운', 정관: '규칙적인 생활의 기운', 비견: '체력이 버텨 주는 기운', 겁재: '무리하기 쉬운 기운', 상관: '신경이 날카로워지는 기운', 정재: '생활이 안정되는 기운', 편재: '바빠지기 쉬운 기운', 편관: '피로와 압박이 쌓이는 기운' },
};
const LOVE_REL = { harmony: 8, trine: 5, same: 2, neutral: 0, harm: -5, clash: -8 };
const HEALTH_REL = { harmony: 2, trine: 2, same: 0, neutral: 0, harm: -3, clash: -6 };
// 도화(桃花): 申子辰→酉, 寅午戌→卯, 巳酉丑→午, 亥卯未→子
const PEACH = [9, 6, 3, 0];
const ZW_POINTS = { 화록: 6, 화권: 4, 화과: 3, 화기: -6 };

function eastTopic(topic, saju, p, kind, gender, zw, year) {
  const label = { day: '일진', month: '월운', year: '세운' }[kind];
  const god = tenGod(saju.dayMaster, p.stem);
  const godB = tenGod(saju.dayMaster, BRANCH_MAIN_STEM[p.branch]);
  const table = topic === 'love' ? loveGod(gender) : GOD[topic];
  let why = GOD_WHY[topic][god];
  // 성별에 따라 배우자 별이 아닌 쪽은 연애보다 다른 일에 마음이 가는 기운으로 읽는다
  if (topic === 'love' && gender === 'f' && (god === '정재' || god === '편재')) why = '연애보다 현실의 일에 마음이 가는 기운';
  if (topic === 'love' && gender === 'm' && (god === '정관' || god === '편관')) why = '책임과 일에 마음이 쏠리는 기운';
  const items = [{ label: `${label} ${p.hanja} · ${god}`, detail: why, delta: sc(table[god]) }];
  if (topic === 'money' || topic === 'work') {
    items.push({ label: `지지 ${'子丑寅卯辰巳午未申酉戌亥'[p.branch]} · ${godB}`, detail: GOD_WHY[topic][godB], delta: sc(half(table[godB])) });
  }
  if (topic === 'love') {
    const rel = branchRelation(saju.pillars.day.branch, p.branch);
    items.push({ label: `배우자 자리(일지)와 ${REL_NAME[rel]}`, detail: '일지는 사주에서 배우자와 연인의 자리', delta: LOVE_REL[rel] });
    const peach = PEACH[saju.pillars.day.branch % 4];
    if (p.branch === peach) items.push({ label: '도화가 든다', detail: '이성의 눈길을 끄는 복숭아꽃 기운', delta: 6 });
  }
  if (topic === 'health') {
    const el = STEM_ELEMENT[p.stem];
    const weakest = saju.counts.indexOf(Math.min(...saju.counts));
    const strongest = saju.counts.indexOf(Math.max(...saju.counts));
    if (el === weakest) items.push({ label: `부족한 ${ELEMENTS[el]} 기운이 채워짐`, detail: '오행 균형이 나아짐', delta: 8 });
    else if (el === strongest && saju.counts[el] >= 3) items.push({ label: `넘치는 ${ELEMENTS[el]} 기운이 더해짐`, detail: '한쪽으로 치우치기 쉬움', delta: -6 });
    const rel = branchRelation(saju.pillars.day.branch, p.branch);
    if (HEALTH_REL[rel]) items.push({ label: `내 일지와 ${REL_NAME[rel]}`, detail: '몸의 리듬이 흔들리거나 맞물림', delta: HEALTH_REL[rel] });
  }
  if (kind === 'year' && zw) {
    const yr = ziweiYear(zw, year);
    const palace = zw.palaces.find((x) => x.name === TOPICS[topic].palace);
    for (const s of yr.sihua) {
      if (s.branch === palace.branch) items.push({ label: `자미두수 유년 ${s.name}`, detail: `올해 ${TOPICS[topic].palace}에 ${s.name}이 듭니다`, delta: ZW_POINTS[s.name] });
    }
  }
  return { score: sum(items), base: BASE, items };
}

// ── 서양: 기간의 하늘 ──
const TOPIC_HOUSES = { love: { 5: 8, 7: 7 }, money: { 2: 8, 8: 4 }, work: { 10: 8, 6: 4 }, health: { 1: 6, 5: 4, 6: -4, 12: -3 } };
const TRANSIT_TARGETS = {
  love: { movers: ['venus', 'moon', 'mars'], natal: ['venus', 'moon', 'sun'] },
  money: { movers: ['venus', 'jupiter', 'moon'], natal: ['venus', 'jupiter', 'sun'] },
  work: { movers: ['sun', 'mars', 'saturn', 'mercury'], natal: ['sun', 'saturn', 'mercury'] },
  health: { movers: ['mars', 'saturn', 'moon'], natal: ['sun', 'moon', 'mars'] },
};
const ASPECTS = [[0, 'strong', '합'], [60, 'good', '육분'], [90, 'hard', '사각'], [120, 'good', '삼각'], [180, 'hard', '대립']];
const HEAVY = new Set(['mars', 'saturn']);

function aspectOf(a, b, orb) {
  const sep = Math.abs(norm(a - b + 180) - 180);
  for (const [ang, tone, name] of ASPECTS) if (Math.abs(sep - ang) <= orb) return { tone, name, orb: Math.abs(sep - ang) };
  return null;
}

function houseOf(sign, ref) { return ((sign - ref) % 12 + 12) % 12 + 1; }

function westTopic(topic, natal, kind, jd, yearly) {
  const ref = natal.asc ? natal.asc.sign : natal.planets[0].sign;
  const houseNote = natal.asc ? '' : '(태양 별자리 기준)';
  const items = [];
  const tH = TOPIC_HOUSES[topic];
  if (kind === 'year') {
    for (const [pl, sign] of [['jupiter', yearly.jupiter], ['saturn', yearly.saturn]]) {
      const h = houseOf(sign, ref);
      if (tH[h] !== undefined || (topic === 'health' && pl === 'saturn' && h === 1)) {
        const good = pl === 'jupiter';
        const d = good ? (tH[h] >= 0 ? 14 : 6) : (tH[h] >= 0 ? -8 : -10);
        items.push({ label: `${PLANETS[pl].ko} · 제${h}하우스${houseNote}`, detail: `${SIGNS[sign].ko}의 ${PLANETS[pl].ko}이 ${HOUSES[h - 1].area} 영역에 ${good ? '기회를 넓혀 줍니다' : '시험과 숙제를 줍니다'}`, delta: d });
      }
    }
    if (!items.length) items.push({ label: '큰 행성의 영향은 보통', detail: '목성·토성이 이 주제의 하우스를 지나지 않습니다', delta: 0 });
    return { score: sum(items), base: BASE, items };
  }
  // 하루·한 달: 그때의 하늘
  const sky = Object.fromEntries(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].map((k) => [k, planetLongitude(k, jd)]));
  const focus = kind === 'day' ? 'moon' : 'sun';
  const fh = houseOf(Math.floor(sky[focus] / 30), ref);
  if (tH[fh] !== undefined) {
    items.push({ label: `${PLANETS[focus].ko} · 제${fh}하우스${houseNote}`, detail: `${kind === 'day' ? '오늘' : '이달'} ${HOUSES[fh - 1].area}에 빛이 듭니다`, delta: tH[fh] });
  }
  const { movers, natal: targets } = TRANSIT_TARGETS[topic];
  const found = [];
  for (const m of movers) {
    if (kind === 'month' && m === 'moon') continue;
    for (const t of targets) {
      const np = natal.planets.find((x) => x.key === t);
      const a = aspectOf(sky[m], np.lon, m === 'moon' ? 5 : 4);
      if (!a) continue;
      let d = a.tone === 'good' ? 6 : a.tone === 'hard' ? -5 : HEAVY.has(m) ? -4 : 6;
      if (topic === 'health' && a.tone === 'hard' && !HEAVY.has(m)) d = -3;
      found.push({ label: `${PLANETS[m].ko} ${a.name} 내 ${PLANETS[t].ko}`, detail: d > 0 ? '서로 돕는 각' : '긴장이 생기는 각', delta: d, orb: a.orb });
    }
  }
  found.sort((a, b) => a.orb - b.orb);
  for (const f of found.slice(0, 2)) items.push({ label: f.label, detail: f.detail, delta: f.delta });
  if (topic === 'work' && isRetrograde('mercury', jd)) items.push({ label: '수성 역행 중', detail: '연락·계약·서류는 한 번 더 확인', delta: -3 });
  if (!items.length) items.push({ label: '하늘의 영향은 보통', detail: '이 주제와 크게 맞물리는 행성이 없습니다', delta: 0 });
  return { score: sum(items), base: BASE, items };
}

// ── 한 주제의 결과 ──
function seedKey(p) { return `${p.year}-${p.month}-${p.day}-${p.hour ?? 'x'}`; }

function periodSetup(profile, kind, now) {
  const t = todayKst(now);
  if (kind === 'day') return { p: dayPillar(t.year, t.month, t.day), jd: julianDate(t.year, t.month, t.day, 12, 0, 9), key: dateKey(t), year: t.year };
  if (kind === 'month') return { p: computeSaju({ year: t.year, month: t.month, day: 15 }).pillars.month, jd: julianDate(t.year, t.month, 15, 12, 0, 9), key: `${t.year}-${t.month}`, year: t.year };
  const majority = (pl) => {
    const c = {}, last = {};
    for (let m = 1; m <= 12; m++) { const s = Math.floor(planetLongitude(pl, julianDate(t.year, m, 15, 12, 0, 9)) / 30); c[s] = (c[s] || 0) + 1; last[s] = m; }
    return Number(Object.keys(c).sort((a, b) => c[b] - c[a] || last[b] - last[a])[0]);
  };
  return { p: computeSaju({ year: t.year, month: 6, day: 15 }).pillars.year, yearly: { jupiter: majority('jupiter'), saturn: majority('saturn') }, key: `${t.year}`, year: t.year };
}

/**
 * 주제별 운세 전부(연애·재물·일·건강)를 한 기간에 대해 계산
 * @param {'day'|'month'|'year'} kind
 */
export function getTopics(profile, kind = 'day', now = new Date()) {
  const saju = computeSaju(profile);
  const natal = natalChart(profile);
  const zw = ziweiChart(profile);
  const setup = periodSetup(profile, kind, now);
  const out = {};
  for (const topic of TOPIC_KEYS) {
    const east = eastTopic(topic, saju, setup.p, kind, profile.gender, zw, setup.year);
    const west = westTopic(topic, natal, kind, setup.jd, setup.yearly);
    const total = Math.round((east.score + west.score) / 2);
    const tone = total >= 80 ? 'g' : total >= 68 ? 's' : 'c';
    const r = rng(`topic|${topic}|${kind}|${setup.key}|${seedKey(profile)}`);
    const pickOne = (arr) => arr[Math.floor(r() * arr.length)];
    out[topic] = {
      topic, ...TOPICS[topic], kind, total, tier: tierOf(total).tier, tone, east, west,
      head: pickOne(TOPIC_HEAD[topic][tone]), tip: pickOne(TOPIC_TIP[topic][tone]),
      genderUsed: topic === 'love' && !!profile.gender,
    };
  }
  return out;
}
