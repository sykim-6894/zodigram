// 화면과 분리된 "운세 API". 웹·앱 어디서든 이 모듈만 호출하면 된다.
import { todayKst, dateKey, julianDate, moonPhase } from './astro.js';
import { computeSaju, dailySaju, dayPillar, ANIMALS, STEM_ELEMENT } from './saju.js';
import { sunSign, dailyMoon, lifePath, personalDay, birthstone } from './western.js';
import { rng, pick } from './seed.js';
import { MAJOR_ARCANA } from '../data/tarot.js';
import { HEXAGRAMS } from '../data/iching.js';
import { EAST_QUOTES, WEST_QUOTES } from '../data/quotes.js';
import { DAY_MASTER, TEN_GOD_DAY, RELATION_TEXT, ELEMENT_INFO, ZODIAC_ANIMAL_DAY, ANIMAL_TRAIT } from '../data/saju-text.js';

const birthKey = (p) => `${p.year}-${p.month}-${p.day}-${p.hour ?? 'x'}`;

/** 누구에게나 같은 오늘의 공통 정보 */
export function getToday(now = new Date()) {
  const t = todayKst(now);
  const key = dateKey(t);
  const jdNow = now.getTime() / 86400000 + 2440587.5;
  const r = rng(`quote|${key}`);
  return {
    date: t,
    key,
    weekday: ['일', '월', '화', '수', '목', '금', '토'][new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay()],
    pillar: dayPillar(t.year, t.month, t.day),
    moon: moonPhase(jdNow),
    eastQuote: pick(EAST_QUOTES, r),
    westQuote: pick(WEST_QUOTES, r),
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
    daily: { ...daily, ...TEN_GOD_DAY[daily.tenGod], relationText: RELATION_TEXT[daily.dayBranchRelation] },
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
    moon: dailyMoon(sign.index, now),
    lifePath: lifePath(profile),
    personalDay: personalDay(profile, today),
    birthstone: birthstone(profile.month),
    tarot: { card, reversed: r() < 0.3 },
  };
}

export { julianDate };
