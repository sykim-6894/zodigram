// 출생 차트(네이탈 차트)와 오늘의 행성 각.
// - 하우스: 상승궁이 든 별자리를 1하우스로 두는 홀 사인(Whole Sign) 방식
// - 태어난 시각: 한국 표준시. 1912년 이전과 1954-03-21 ~ 1961-08-09 는 UTC+8:30,
//   서머타임(1948~51, 1955~60, 1987~88)은 보정한다(core/koreatime.js).
import { julianDate } from './astro.js';
import { koreaUtcOffset, placeOf } from './koreatime.js';
import { planetLongitude, isRetrograde, angles, PLANET_ORDER } from './planets.js';
import { SIGNS, HOUSES } from '../data/western.js';
import { PLANETS, SIGN_STYLE, ELEMENT_TEXT, ASPECT_KINDS, j } from '../data/astrology.js';

const norm = (x) => ((x % 360) + 360) % 360;

/** 한국에서 태어난 시각의 UTC 오프셋(시간). 표준시 변천과 서머타임 반영 */
export function koreaBirthOffset(y, m, d, h = 12, min = 0) {
  return koreaUtcOffset(y, m, d, h, min).offset;
}

function position(key, lon, retro = false) {
  const sign = Math.floor(lon / 30);
  return { key, ...PLANETS[key], lon, sign, signName: SIGNS[sign].ko, signGlyph: SIGNS[sign].glyph, degree: lon - sign * 30, retro };
}

/** 출생 차트 */
export function natalChart(profile) {
  const hasTime = profile.hour !== null && profile.hour !== undefined && profile.hour !== '';
  const h = hasTime ? Number(profile.hour) : 12;
  const mi = hasTime ? Number(profile.minute || 0) : 0;
  const { offset, dst } = koreaUtcOffset(profile.year, profile.month, profile.day, h, mi);
  const jd = julianDate(profile.year, profile.month, profile.day, h, mi, offset);
  const place = placeOf(profile.place);

  const planets = PLANET_ORDER.map((k) => position(k, planetLongitude(k, jd), isRetrograde(k, jd)));
  let asc = null, mc = null;
  if (hasTime) {
    const a = angles(jd, place.lat, place.lon);
    asc = position('asc', a.asc);
    mc = a.mc;
    for (const p of planets) p.house = ((p.sign - asc.sign) % 12 + 12) % 12 + 1;
  }

  // 원소 균형: 개인 행성 7개 + 상승궁
  const counted = planets.slice(0, 7).concat(asc ? [asc] : []);
  const elements = { 불: 0, 흙: 0, 공기: 0, 물: 0 };
  for (const p of counted) elements[SIGNS[p.sign].element]++;
  const order = Object.entries(elements).sort((a, b) => b[1] - a[1]);
  const dominant = order[0][0];
  const lacking = order[order.length - 1][1] === 0 ? order[order.length - 1][0] : null;

  // 시각을 모르면 달의 별자리가 하루 중에 바뀔 수 있다(달은 하루에 약 13° 이동)
  const moon = planets[1];
  const moonUncertain = !hasTime && (moon.degree < 6.6 || moon.degree > 23.4);

  return {
    hasTime, place, offset, dst, jd, planets, asc, mc, elements, dominant, lacking, moonUncertain,
    summary: ELEMENT_TEXT[dominant].strong,
    lackText: lacking ? ELEMENT_TEXT[lacking].weak : null,
  };
}

/** 행성 한 줄 풀이 */
export function readPlacement(p) {
  const house = p.house ? ` 제${p.house}하우스(${HOUSES[p.house - 1].area})에 있어 그 영역에서 특히 두드러집니다.` : '';
  return `${j(PLANETS[p.key].subject, '은', '는')} ${SIGN_STYLE[p.sign]}${house}`;
}

/**
 * 오늘(한국시 정오) 행성들이 내 출생 차트와 이루는 주요 각. 오차(orb)가 작은 순으로.
 */
export function dailyTransits(natal, now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600 * 1000);
  const jd = julianDate(k.getUTCFullYear(), k.getUTCMonth() + 1, k.getUTCDate(), 12, 0, 9);
  const movers = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const targets = natal.planets.slice(0, 5).concat(natal.asc ? [natal.asc] : []);
  const list = [];
  for (const t of movers) {
    const lon = planetLongitude(t, jd);
    for (const n of targets) {
      const sep = Math.abs(norm(lon - n.lon + 180) - 180);
      for (const a of ASPECT_KINDS) {
        const orb = Math.abs(sep - a.angle);
        const limit = t === 'moon' ? 5 : 3;
        if (orb <= limit) {
          list.push({
            transit: t, natal: n.key, aspect: a.name, tone: a.tone, orb,
            label: `${PLANETS[t].ko} ${a.name} 내 ${PLANETS[n.key].ko}`,
            text: a.text(PLANETS[t].energy, PLANETS[n.key].area),
          });
        }
      }
    }
  }
  list.sort((a, b) => a.orb - b.orb);
  const today = movers.map((t) => position(t, planetLongitude(t, jd), isRetrograde(t, jd)));
  return { aspects: list.slice(0, 4), today };
}
