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

/* ───────── 오늘의 점수 ───────── */
const BLOCK = 64; // 64일 단위로 순번을 센다
const tierCache = new Map();
const jdnToNoonKst = (d) => new Date(((d - 0.5) - 2440587.5) * 86400000 + 3 * 3600000);

function tierOn(profile, d) {
  const key = `${birthKey(profile)}|${d}`;
  if (!tierCache.has(key)) {
    const at = jdnToNoonKst(d);
    tierCache.set(key, totalScore(getEast(profile, at), getWest(profile, at)).tier);
  }
  return tierCache.get(key);
}

/**
 * 오늘의 종합 점수와 한마디.
 * 한마디는 "이번 64일 안에서 같은 등급이 나온 몇 번째 날인지"를 순번으로 써서,
 * 같은 등급이 다시 나와도 목록을 다 돌기 전에는 같은 문장이 반복되지 않게 한다.
 */
export function getScore(profile, now = new Date()) {
  const today = getToday(now);
  const e = getEast(profile, now);
  const w = getWest(profile, now);
  const tier = totalScore(e, w).tier;
  const day = today.dayNumber;
  const block = Math.floor(day / BLOCK);
  let ordinal = 0;
  for (let d = block * BLOCK; d < day; d++) if (tierOn(profile, d) === tier) ordinal++;
  return { score: totalScore(e, w, [today.eastQuote.text, today.westQuote.text], ordinal + block * 3), east: e, west: w };
}
