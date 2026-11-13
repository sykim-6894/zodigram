// 날짜·천문 계산. DOM에 의존하지 않으므로 앱(Capacitor 등)에서도 그대로 재사용한다.
// 정밀도: 태양 황경 ±0.01°, 달 황경 ±0.3° 수준(Meeus 저정밀 식). 운세 용도로는 충분하다.

const RAD = Math.PI / 180;
const norm360 = (x) => ((x % 360) + 360) % 360;

/** 그레고리력 날짜 → 율리우스 일수(정수, 정오 기준) */
export function jdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4)
    - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/** 현지 시각(UTC 오프셋 시간 단위) → 율리우스 날짜(실수) */
export function julianDate(year, month, day, hour = 12, minute = 0, utcOffset = 9) {
  const ut = hour + minute / 60 - utcOffset;
  return jdn(year, month, day) - 0.5 + ut / 24;
}

/** 태양의 겉보기 황경(도) */
export function sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
    + 0.000289 * Math.sin(3 * M);
  const omega = (125.04 - 1934.136 * T) * RAD;
  return norm360(L0 + C - 0.00569 - 0.00478 * Math.sin(omega));
}

/** 달의 황경(도) */
export function moonLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = (297.8501921 + 445267.1114034 * T) * RAD;
  const M = (357.5291092 + 35999.0502909 * T) * RAD;
  const Mp = (134.9633964 + 477198.8675055 * T) * RAD;
  const F = (93.2720950 + 483202.0175233 * T) * RAD;
  const lon = Lp
    + 6.288774 * Math.sin(Mp)
    + 1.274027 * Math.sin(2 * D - Mp)
    + 0.658314 * Math.sin(2 * D)
    + 0.213618 * Math.sin(2 * Mp)
    - 0.185116 * Math.sin(M)
    - 0.114332 * Math.sin(2 * F)
    + 0.058793 * Math.sin(2 * D - 2 * Mp)
    + 0.057066 * Math.sin(2 * D - M - Mp)
    + 0.053322 * Math.sin(2 * D + Mp)
    + 0.045758 * Math.sin(2 * D - M)
    - 0.040923 * Math.sin(M - Mp)
    - 0.034720 * Math.sin(D)
    - 0.030383 * Math.sin(M + Mp);
  return norm360(lon);
}

/** 태양 황경이 target(도)이 되는 율리우스 날짜. guess 근처에서 찾는다. */
export function findSunLongitude(target, guessJd) {
  let jd = guessJd;
  for (let i = 0; i < 8; i++) {
    let diff = norm360(target - sunLongitude(jd));
    if (diff > 180) diff -= 360;
    jd += diff / 0.98565;
  }
  return jd;
}

export const SOLAR_TERMS = [
  // [이름, 황경] — 절(節)만. 사주의 월 경계로 쓴다.
  ['소한', 285], ['입춘', 315], ['경칩', 345], ['청명', 15], ['입하', 45], ['망종', 75],
  ['소서', 105], ['입추', 135], ['백로', 165], ['한로', 195], ['입동', 225], ['대설', 255],
];

/** 율리우스 날짜 → 한국 표준시 기준 {year, month, day, hour, minute} */
export function jdToKst(jd) {
  const z = Math.floor(jd + 0.5 + 9 / 24);
  const frac = jd + 0.5 + 9 / 24 - z;
  const a = z + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  const mins = Math.round(frac * 1440);
  return { year, month, day, hour: Math.floor(mins / 60), minute: mins % 60 };
}

/** 해당 연도의 12절 날짜 목록(한국시) */
export function solarTermsOfYear(year) {
  return SOLAR_TERMS.map(([name, lon], i) => {
    const guess = julianDate(year, i + 1, 6);
    return { name, lon, ...jdToKst(findSunLongitude(lon, guess)) };
  });
}

const PHASES = ['삭(그믐달)', '초승달', '상현달', '차오르는 달', '보름달', '기우는 달', '하현달', '그믐달'];
const PHASES_EN = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];

/** 달의 위상 */
export function moonPhase(jd) {
  const elong = norm360(moonLongitude(jd) - sunLongitude(jd));
  const idx = Math.floor(norm360(elong + 22.5) / 45) % 8;
  return {
    elongation: elong,
    illumination: (1 - Math.cos(elong * RAD)) / 2,
    index: idx,
    name: PHASES[idx],
    nameEn: PHASES_EN[idx],
    age: elong / 360 * 29.530589,
  };
}

/** 오늘(한국시) 날짜 객체 */
export function todayKst(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600 * 1000);
  return { year: k.getUTCFullYear(), month: k.getUTCMonth() + 1, day: k.getUTCDate(), hour: k.getUTCHours(), minute: k.getUTCMinutes() };
}

export function dateKey(d) {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}
