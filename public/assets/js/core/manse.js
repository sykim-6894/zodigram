// 만세력 조회: 양력/음력 날짜 + 시각 + 장소 → 사주 네 기둥, 음력, 절기 구간
import { findSunLongitude, jdToKst, SOLAR_TERMS, jdn } from './astro.js';
import { computeSaju } from './saju.js';
import { solarToLunar, lunarToSolar } from './lunar.js';

const TERM_BY_LON = Object.fromEntries(SOLAR_TERMS.map(([name, lon]) => [lon, name]));

function termAt(jd) {
  const t = jdToKst(jd);
  return `${t.month}.${t.day} ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

/**
 * @param {{calendar:'solar'|'lunar', date?:string, ly?:number, lm?:number, ld?:number, leap?:boolean, time?:string, place?:string}} q
 */
export function manseLookup(q) {
  let solar;
  if (q.calendar === 'lunar') {
    const s = lunarToSolar(Number(q.ly), Number(q.lm), Number(q.ld), !!q.leap);
    if (s.error) return { error: s.error };
    solar = s;
  } else {
    const [y, m, d] = String(q.date || '').split('-').map(Number);
    if (!y || !m || !d) return { error: '날짜를 입력해 주세요.' };
    if (y < 1900 || y > 2100) return { error: '1900~2100년 사이로 입력해 주세요.' };
    solar = { year: y, month: m, day: d };
  }
  let hour = null, minute = null;
  if (q.time) [hour, minute] = q.time.split(':').map(Number);
  const saju = computeSaju({ ...solar, hour, minute, place: q.place });

  // 지금 속한 절(節) 구간: 월주가 바뀌는 시각
  const lon = saju.time.sunLon;
  const startLon = Math.floor(((lon - 315 + 360) % 360) / 30) * 30 + 315;
  const from = findSunLongitude(startLon % 360, saju.time.jd - (((lon - startLon) % 360 + 360) % 360) / 0.98565);
  const to = findSunLongitude((startLon + 30) % 360, from + 30.4);

  return {
    solar,
    lunar: solarToLunar(solar.year, solar.month, solar.day),
    weekday: (jdn(solar.year, solar.month, solar.day) + 1) % 7,
    timeText: q.time || '',
    saju,
    term: {
      from: { name: TERM_BY_LON[startLon % 360], text: termAt(from), jd: from },
      to: { name: TERM_BY_LON[(startLon + 30) % 360], text: termAt(to), jd: to },
    },
  };
}
