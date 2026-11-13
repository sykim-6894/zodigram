// 한국의 표준시·서머타임 역사(IANA tz 데이터베이스 Asia/Seoul 기준).
//   ~1908-03-31  서울 지방평균시 UTC+8:27:52
//   1908-04-01~  UTC+8:30
//   1912-01-01~  UTC+9
//   1954-03-21~  UTC+8:30
//   1961-08-10~  UTC+9
// 서머타임(시계를 한 시간 앞당김): 1948~1951, 1955~1960, 1987~1988
import { jdn } from './astro.js';
import { PLACES } from '../data/astrology.js';

/** 태어난 곳 이름 → {name, lat, lon}. 없으면 서울 */
export function placeOf(name) {
  const p = PLACES.find(([n]) => n === name) || PLACES[0];
  return { name: p[0], lat: p[1], lon: p[2] };
}

/** y년 m월에서 day일 이후(당일 포함) 처음 오는 요일(0=일)의 날짜 */
function weekdayOnOrAfter(y, m, day, weekday) {
  const w = (jdn(y, m, day) + 1) % 7; // JDN+1 의 7 나머지: 0=일요일
  return day + ((weekday - w + 7) % 7);
}

// [연도, 시작(월, 일, 시), 끝(월, 일, 시)] — 시각은 그날의 벽시계 시각, 24 는 다음 날 0시
function dstPeriod(y) {
  switch (y) {
    case 1948: return [[6, 1, 0], [9, 12, 24]];
    case 1949: return [[4, 3, 0], [9, weekdayOnOrAfter(1949, 9, 7, 6), 24]];
    case 1950: return [[4, 1, 0], [9, weekdayOnOrAfter(1950, 9, 7, 6), 24]];
    case 1951: return [[5, 6, 0], [9, weekdayOnOrAfter(1951, 9, 7, 6), 24]];
    case 1955: return [[5, 5, 0], [9, 8, 24]];
    case 1956: return [[5, 20, 0], [9, 29, 24]];
    case 1957: case 1958: case 1959: case 1960:
      return [[5, weekdayOnOrAfter(y, 5, 1, 0), 0], [9, weekdayOnOrAfter(y, 9, 17, 6), 24]];
    case 1987: case 1988:
      return [[5, weekdayOnOrAfter(y, 5, 8, 0), 2], [10, weekdayOnOrAfter(y, 10, 8, 0), 3]];
    default: return null;
  }
}

function standardOffset(y, m, d) {
  const day = jdn(y, m, d);
  if (day < jdn(1908, 4, 1)) return 8 + 27 / 60 + 52 / 3600;
  if (day < jdn(1912, 1, 1)) return 8.5;
  if (day < jdn(1954, 3, 21)) return 9;
  if (day < jdn(1961, 8, 10)) return 8.5;
  return 9;
}

/**
 * 한국의 벽시계 시각 → UTC 오프셋(시간)과 서머타임 여부
 * @returns {{ offset:number, dst:boolean, standard:number }}
 */
export function koreaUtcOffset(y, m, d, h = 12, min = 0) {
  const standard = standardOffset(y, m, d);
  const p = dstPeriod(y);
  let dst = false;
  if (p) {
    const t = jdn(y, m, d) + (h * 60 + min) / 1440;
    const [[sm, sd, sh], [em, ed, eh]] = p;
    const start = jdn(y, sm, sd) + sh / 24;
    const end = jdn(y, em, ed) + eh / 24;
    dst = t >= start && t < end;
  }
  return { offset: standard + (dst ? 1 : 0), dst, standard };
}

/** 서머타임 기간 목록(화면 안내용) */
export function dstRanges() {
  const years = [1948, 1949, 1950, 1951, 1955, 1956, 1957, 1958, 1959, 1960, 1987, 1988];
  return years.map((y) => {
    const [[sm, sd], [em, ed]] = dstPeriod(y);
    return `${y}.${sm}.${sd}~${em}.${ed}`;
  });
}
