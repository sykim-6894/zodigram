// 별자리(태양궁)·오늘의 달·수비학 계산.
import { julianDate, sunLongitude, moonLongitude } from './astro.js';
import { SIGNS, HOUSES, ASPECTS, LIFE_PATH, PERSONAL_DAY, BIRTHSTONES } from '../data/western.js';

/** 생일의 실제 태양 황경으로 별자리를 판정한다(경계일도 정확). */
export function sunSign(b) {
  const hasTime = b.hour !== null && b.hour !== undefined && b.hour !== '';
  const jd = julianDate(b.year, b.month, b.day, hasTime ? Number(b.hour) : 12, hasTime ? Number(b.minute || 0) : 0, 9);
  const lon = sunLongitude(jd);
  const idx = Math.floor(lon / 30);
  const degree = lon - idx * 30;
  const cusp = !hasTime && (degree < 0.6 || degree > 29.4); // 시간을 모르면 경계일일 수 있음
  return { index: idx, ...SIGNS[idx], degree, cusp };
}

/** 오늘 달의 위치와 내 별자리의 관계 */
export function dailyMoon(signIndex, now = new Date()) {
  const jd = now.getTime() / 86400000 + 2440587.5;
  const moonLon = moonLongitude(jd);
  const moonSign = Math.floor(moonLon / 30);
  const dist = ((moonSign - signIndex) % 12 + 12) % 12;
  const aspectKey = Math.min(dist, 12 - dist);
  // 달이 다음 별자리로 넘어가기까지 남은 시간(달은 하루 약 13.2도 이동)
  const hoursLeft = ((moonSign + 1) * 30 - moonLon) / 13.18 * 24;
  return {
    moonSign, moonSignName: SIGNS[moonSign].ko, moonDegree: moonLon - moonSign * 30,
    house: dist + 1, houseInfo: HOUSES[dist],
    aspect: ASPECTS[aspectKey],
    hoursLeft,
  };
}

const digitSum = (n) => String(n).split('').reduce((a, c) => a + Number(c), 0);

function reduce(n, keepMaster = true) {
  while (n > 9 && !(keepMaster && (n === 11 || n === 22 || n === 33))) n = digitSum(n);
  return n;
}

/** 생명수(Life Path): 연·월·일을 각각 줄인 뒤 합산하는 방식 */
export function lifePath(b) {
  const n = reduce(reduce(b.year) + reduce(b.month) + reduce(b.day));
  return { number: n, ...LIFE_PATH[n] };
}

/** 개인일 수: 개인년(생월+생일+올해) + 오늘 월 + 오늘 일 */
export function personalDay(b, today) {
  const personalYear = reduce(reduce(b.month) + reduce(b.day) + reduce(today.year), false);
  const n = reduce(personalYear + reduce(today.month) + reduce(today.day), false);
  return { number: n, personalYear, text: PERSONAL_DAY[n] };
}

export function birthstone(month) {
  const [name, meaning] = BIRTHSTONES[month - 1];
  return { name, meaning };
}
