// 화면과 분리된 "운세 API". 웹·앱 어디서든 이 모듈만 호출하면 된다.
import { todayKst, dateKey, julianDate, moonPhase, jdn } from './astro.js';
import { computeSaju, dailySaju, dayPillar, ANIMALS, STEM_ELEMENT } from './saju.js';
import { sunSign, dailyMoon, lifePath, personalDay, birthstone } from './western.js';
import { rng, pick } from './seed.js';
import { solarToLunar } from './lunar.js';
import { MAJOR_ARCANA } from '../data/tarot.js';
import { HEXAGRAMS } from '../data/iching.js';
import { EAST_QUOTES, WEST_QUOTES } from '../data/quotes.js';
import { totalScore } from './score.js';
import { OPENERS, ACTIONS } from '../data/advice.js';
import { DAY_MASTER, TEN_GOD_DAY, RELATION_TEXT, ELEMENT_INFO, ZODIAC_ANIMAL_DAY, ANIMAL_TRAIT } from '../data/saju-text.js';

const birthKey = (p) => `${p.year}-${p.month}-${p.day}-${p.hour ?? 'x'}`;

/** 누구에게나 같은 오늘의 공통 정보 */
export function getToday(now = new Date()) {
  const t = todayKst(now);
  const key = dateKey(t);
  const jdNow = now.getTime() / 86400000 + 2440587.5;
  // 날마다 다음 문장으로 넘어가 목록을 다 돌기 전까지 같은 한마디가 다시 나오지 않는다
  const dayNumber = jdn(t.year, t.month, t.day);
  return {
    date: t,
    key,
    weekday: ['일', '월', '화', '수', '목', '금', '토'][new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay()],
    pillar: dayPillar(t.year, t.month, t.day),
    lunar: solarToLunar(t.year, t.month, t.day),
    moon: moonPhase(jdNow),
    dayNumber,
    eastQuote: EAST_QUOTES[dayNumber % EAST_QUOTES.length],
    westQuote: WEST_QUOTES[(dayNumber * 7) % WEST_QUOTES.length],
  };
}

/** 동양: 사주 원국 + 오늘의 일진 + 띠 */
export function getEast(profile, now = new Date()) {
  const today = todayKst(now);
  const saju = computeSaju(profile);
  const daily = dailySaju(saju, today);
  const weakest = saju.counts.indexOf(Math.min(...saju.counts));
  return {
    saju,
    dayMaster: DAY_MASTER[saju.dayMaster],
    daily: { ...daily, ...TEN_GOD_DAY[daily.tenGod], relationText: RELATION_TEXT[daily.dayBranchRelation], dayNumber: jdn(today.year, today.month, today.day) },
    animal: {
      index: saju.zodiacAnimal,
      name: ANIMALS[saju.zodiacAnimal],
      trait: ANIMAL_TRAIT[saju.zodiacAnimal],
      today: ZODIAC_ANIMAL_DAY[daily.zodiacRelation],
    },
    complement: { element: weakest, ...ELEMENT_INFO[weakest] },
    todayElement: { element: STEM_ELEMENT[daily.todayPillar.stem], ...ELEMENT_INFO[STEM_ELEMENT[daily.todayPillar.stem]] },
  };
}

/** 오늘의 괘: 하루 동안 고정. 직접 던지는 점은 core/iching.js 사용 */
export function getDailyHexagram(profile, now = new Date()) {
  const r = rng(`hex|${dateKey(todayKst(now))}|${profile ? birthKey(profile) : ''}`);
  return pick(HEXAGRAMS, r);
}

/** 서양: 별자리 + 오늘의 달 + 수비학 + 오늘의 타로 */
export function getWest(profile, now = new Date()) {
  const today = todayKst(now);
  const sign = sunSign(profile);
  const r = rng(`tarot|${dateKey(today)}|${birthKey(profile)}`);
  const card = pick(MAJOR_ARCANA, r);
  return {
    sign,
    // 하루 동안 결과가 바뀌지 않도록 오늘 정오(한국시) 달의 위치로 본다
    moon: dailyMoon(sign.index, new Date(Date.UTC(today.year, today.month - 1, today.day, 3))),
    lifePath: lifePath(profile),
    personalDay: personalDay(profile, today),
    birthstone: birthstone(profile.month),
    tarot: { card, reversed: r() < 0.3 },
  };
}

export { julianDate };

/* ───────── 오늘의 점수와 한마디 ───────── */
const YEAR = 365;
const toneCache = new Map();
const jdnToNoonKst = (d) => new Date(((d - 0.5) - 2440587.5) * 86400000 + 3 * 3600000);
const FALLBACK = { g: ['g', 's', 'c'], s: ['s', 'c', 'g'], c: ['c', 's', 'g'] };

function toneOn(profile, d) {
  const key = `${birthKey(profile)}|${d}`;
  if (!toneCache.has(key)) {
    const at = jdnToNoonKst(d);
    toneCache.set(key, totalScore(getEast(profile, at), getWest(profile, at)).tone);
  }
  return toneCache.get(key);
}

/**
 * 1년(365일) 단위로 날마다 한마디를 하나씩 배정한다.
 * - 그날 점수의 분위기에 맞는 문장 가운데 아직 안 쓴 것을 차례로 쓴다.
 * - 그 분위기의 문장을 다 쓰면 가까운 분위기의 안 쓴 문장을 빌려 쓴다.
 * 그래서 목록 전체를 다 쓰기 전에는 같은 문장이 다시 나오지 않는다.
 */
function assignYear(list, tones, offset) {
  const byTone = { g: [], s: [], c: [] };
  list.forEach((q) => byTone[q.tone].push(q));
  for (const t of 'gsc') {
    const arr = byTone[t];
    const k = arr.length ? offset % arr.length : 0;
    byTone[t] = arr.slice(k).concat(arr.slice(0, k)); // 사람마다 시작 위치를 다르게
  }
  const next = { g: 0, s: 0, c: 0 };
  return tones.map((tone) => {
    for (let round = 0; round < 2; round++) {
      for (const t of FALLBACK[tone]) {
        if (next[t] < byTone[t].length) return byTone[t][next[t]++];
      }
      next.g = next.s = next.c = 0; // 목록을 다 썼으면 처음부터
    }
    return list[0];
  });
}

/**
 * 오늘의 점수, 그 점수에 어울리는 동양·서양 한마디와 조언.
 * 같은 분위기의 날이 올 때마다 다음 문장·다음 조언으로 넘어가 1년 안에는 겹치지 않는다.
 */
export function getScore(profile, now = new Date()) {
  const today = getToday(now);
  const e = getEast(profile, now);
  const w = getWest(profile, now);
  const score = totalScore(e, w);
  const day = today.dayNumber;
  const start = Math.floor(day / YEAR) * YEAR;
  const tones = [];
  for (let d = start; d < day; d++) tones.push(toneOn(profile, d));
  tones.push(score.tone);
  const offset = e.saju.pillars.day.index * 7 + w.sign.index * 13;
  const east = assignYear(EAST_QUOTES, tones, offset).at(-1);
  const west = assignYear(WEST_QUOTES, tones, offset * 3 + 5).at(-1);
  // 조언: 같은 분위기 날의 순번 i 로 (여는 말, 해 볼 일) 400가지 조합을 차례로 쓴다
  const i = tones.filter((t) => t === score.tone).length - 1 + offset;
  const op = OPENERS[score.tone];
  const ac = ACTIONS[score.tone];
  const advice = `${op[i % op.length]} ${ac[(i + Math.floor(i / op.length)) % ac.length]}`;
  return { score: { ...score, message: { east, west, advice } }, east: e, west: w };
}
