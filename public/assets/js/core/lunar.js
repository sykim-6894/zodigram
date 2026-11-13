// 한국 음력(태음태양력) ↔ 양력 변환. 표 대신 천문 계산으로 만든다.
// - 합삭(새달) 시각: Meeus 『Astronomical Algorithms』 49장 (오차 수십 초 이내)
// - 중기(태양 황경 30°의 배수)가 없는 첫 달을 윤달로 둔다 (동지가 든 달 = 11월)
// - 날짜 경계는 한국 표준시. 1912년 이전과 1954-03-21 ~ 1961-08-09 는 UTC+8:30
// 지원 범위: 음력 1900 ~ 2100년
import { jdn, sunLongitude, findSunLongitude, julianDate } from './astro.js';

const RAD = Math.PI / 180;
const SYNODIC = 29.530588861;

/** 지구 자전 보정 ΔT(초), Espenak·Meeus 근사식 */
function deltaT(y) {
  let t;
  if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (y < 1941) { t = y - 1920; return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3; }
  if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547; }
  if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718; }
  if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t ** 2; }
  return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
}

/** k번째 합삭의 율리우스 날짜(UT). k=0 은 2000-01-06 */
export function newMoon(k) {
  const T = k / 1236.85;
  const jde = 2451550.09766 + SYNODIC * k + 0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3) * RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4) * RAD;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4) * RAD;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3) * RAD;
  const s = Math.sin;
  let c = -0.4072 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * F)
    + 0.00739 * E * s(Mp - M) - 0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M)
    - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M)
    - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F)
    - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O) - 0.00007 * s(Mp + 2 * M)
    + 0.00004 * s(2 * Mp - 2 * F) + 0.00004 * s(3 * M) + 0.00003 * s(Mp + M - 2 * F)
    + 0.00003 * s(2 * Mp + 2 * F) - 0.00003 * s(Mp + M + 2 * F) + 0.00003 * s(Mp - M + 2 * F)
    - 0.00002 * s(Mp - M - 2 * F) - 0.00002 * s(3 * Mp + M) + 0.00002 * s(4 * Mp);
  // 행성 섭동
  const A = [
    [299.77 + 0.107408 * k - 0.009173 * T ** 2, 0.000325], [251.88 + 0.016321 * k, 0.000165],
    [251.83 + 26.651886 * k, 0.000164], [349.42 + 36.412478 * k, 0.000126], [84.66 + 18.206239 * k, 0.00011],
    [141.74 + 53.303771 * k, 0.000062], [207.14 + 2.453732 * k, 0.00006], [154.84 + 7.30686 * k, 0.000056],
    [34.52 + 27.261239 * k, 0.000047], [207.19 + 0.121824 * k, 0.000042], [291.34 + 1.844379 * k, 0.00004],
    [161.72 + 24.198154 * k, 0.000037], [239.56 + 25.513099 * k, 0.000035], [331.55 + 3.592518 * k, 0.000023],
  ];
  for (const [a, coef] of A) c += coef * s(a * RAD);
  const year = 2000 + k / 12.3685;
  return jde + c - deltaT(year) / 86400;
}

const JDN_1912 = jdn(1912, 1, 1);
const JDN_1954 = jdn(1954, 3, 21);
const JDN_1961 = jdn(1961, 8, 10);

/** 한국 표준시 오프셋(시간) */
function koreaOffset(jd) {
  const d = Math.floor(jd + 0.5);
  if (d < JDN_1912 || (d >= JDN_1954 && d < JDN_1961)) return 8.5;
  return 9;
}

/** 율리우스 날짜 → 한국 날짜의 JDN */
const localDay = (jd) => Math.floor(jd + 0.5 + koreaOffset(jd) / 24);

/** 한국 날짜 dayJdn 이전(당일 포함)에 시작하는 마지막 합삭의 k */
function newMoonKOnOrBefore(dayJdn) {
  let k = Math.floor((dayJdn - 2451550.1) / SYNODIC) + 1;
  while (localDay(newMoon(k)) > dayJdn) k--;
  while (localDay(newMoon(k + 1)) <= dayJdn) k++;
  return k;
}

/** k번째 합삭으로 시작하는 달에 중기가 드는가 */
function hasZhongqi(k) {
  const startDay = localDay(newMoon(k));
  const endDay = localDay(newMoon(k + 1));
  const dayStartJd = startDay - 0.5 - koreaOffset(startDay) / 24; // 그날 0시(한국)
  const lon = sunLongitude(dayStartJd);
  const target = (Math.floor(lon / 30) + 1) * 30 % 360;
  const gap = ((target - lon) % 360 + 360) % 360;
  const zq = findSunLongitude(target, dayStartJd + gap / 0.98565);
  return localDay(zq) < endDay;
}

const suiCache = new Map();

/** 세(歲): Y-1년 동지가 든 달(11월)부터 Y년 동지가 든 달 직전까지 */
function sui(Y) {
  if (suiCache.has(Y)) return suiCache.get(Y);
  const ws1 = findSunLongitude(270, julianDate(Y - 1, 12, 22));
  const ws2 = findSunLongitude(270, julianDate(Y, 12, 22));
  const k1 = newMoonKOnOrBefore(localDay(ws1));
  const k2 = newMoonKOnOrBefore(localDay(ws2));
  const n = k2 - k1;
  let leapAt = -1;
  if (n === 13) {
    for (let i = 1; i < n; i++) if (!hasZhongqi(k1 + i)) { leapAt = i; break; }
  }
  const months = [];
  let num = 11;
  for (let i = 0; i < n; i++) {
    const leap = i === leapAt;
    if (i > 0 && !leap) num = num % 12 + 1;
    const start = localDay(newMoon(k1 + i));
    const end = localDay(newMoon(k1 + i + 1));
    // 동지가 든 11월과 그 뒤 12월(윤달 포함)은 전년도 음력에 속한다
    const lunarYear = num >= 11 && i < 3 ? Y - 1 : Y;
    months.push({ lunarYear, month: num, leap, start, days: end - start });
  }
  suiCache.set(Y, months);
  return months;
}

export const LUNAR_MIN_YEAR = 1900;
export const LUNAR_MAX_YEAR = 2100;

/** 음력 Y년의 달 목록(정월~섣달, 윤달 포함) */
export function lunarYearMonths(Y) {
  return [...sui(Y), ...sui(Y + 1)].filter((m) => m.lunarYear === Y);
}

/** 양력 → 음력 {year, month, day, leap} */
export function solarToLunar(y, m, d) {
  const day = jdn(y, m, d);
  const ws = localDay(findSunLongitude(270, julianDate(y, 12, 22)));
  const list = day >= ws ? sui(y + 1) : sui(y);
  const hit = list.find((mo) => day >= mo.start && day < mo.start + mo.days)
    || [...sui(y), ...sui(y + 1)].find((mo) => day >= mo.start && day < mo.start + mo.days);
  return { year: hit.lunarYear, month: hit.month, day: day - hit.start + 1, leap: hit.leap, monthDays: hit.days };
}

function jdnToDate(j) {
  const a = j + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    year: 100 * b + d - 4800 + Math.floor(m / 10),
    month: m + 3 - 12 * Math.floor(m / 10),
    day: e - Math.floor((153 * m + 2) / 5) + 1,
  };
}

/**
 * 음력 → 양력. 존재하지 않는 날짜면 {error} 를 돌려준다.
 */
export function lunarToSolar(year, month, day, leap = false) {
  if (year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR) return { error: `음력 ${LUNAR_MIN_YEAR}~${LUNAR_MAX_YEAR}년만 지원합니다.` };
  const months = lunarYearMonths(year);
  const mo = months.find((x) => x.month === month && x.leap === !!leap);
  if (!mo) return { error: leap ? `음력 ${year}년에는 윤${month}월이 없습니다.` : '존재하지 않는 달입니다.' };
  if (day < 1 || day > mo.days) return { error: `음력 ${year}년 ${leap ? '윤' : ''}${month}월은 ${mo.days}일까지 있습니다.` };
  return jdnToDate(mo.start + day - 1);
}

/** 음력 Y년의 윤달 번호(없으면 0) */
export function leapMonthOf(Y) {
  return lunarYearMonths(Y).find((m) => m.leap)?.month || 0;
}

export function formatLunar(l) {
  return `음력 ${l.year}년 ${l.leap ? '윤' : ''}${l.month}월 ${l.day}일`;
}
