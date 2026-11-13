// 행성 위치와 상승궁(ASC) 계산.
// 행성: JPL "Approximate Positions of the Planets"(Standish) 케플러 궤도 요소. 1800~2050년 기준 오차가
// 내행성 수 분각, 외행성 1° 안팎이라 별자리(30° 칸) 판정에는 충분하다. 2050년 이후는 오차가 조금 커진다.
// 태양·달은 astro.js 의 더 정밀한 식을 쓴다.
import { sunLongitude, moonLongitude } from './astro.js';

const RAD = Math.PI / 180;
const norm = (x) => ((x % 360) + 360) % 360;

// [a, e, I, L, ϖ(근일점 경도), Ω(승교점 경도)] J2000 값과 세기당 변화율
const ELEMENTS = {
  mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
    [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  venus: [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
    [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  earth: [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0]],
  mars: [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  saturn: [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  uranus: [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
    [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
  pluto: [[39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684],
    [-0.00031596, 0.00005170, 0.00004818, 145.20780515, -0.04062942, -0.01183482]],
};

/** 태양 중심 황도 좌표(J2000) */
function helio(name, T) {
  const [base, rate] = ELEMENTS[name];
  const [a, e, I, L, wbar, O] = base.map((v, i) => v + rate[i] * T);
  const M = norm(L - wbar) * RAD;
  const w = (wbar - O) * RAD;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cO = Math.cos(O * RAD), sO = Math.sin(O * RAD), cI = Math.cos(I * RAD), sI = Math.sin(I * RAD);
  const cw = Math.cos(w), sw = Math.sin(w);
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    (sw * sI) * xp + (cw * sI) * yp,
  ];
}

/** 지구에서 본 행성의 황경(그날의 춘분점 기준, 도) */
export function planetLongitude(name, jd) {
  if (name === 'sun') return sunLongitude(jd);
  if (name === 'moon') return moonLongitude(jd);
  const T = (jd - 2451545.0) / 36525;
  const p = helio(name, T);
  const ea = helio('earth', T);
  const lon = Math.atan2(p[1] - ea[1], p[0] - ea[0]) / RAD;
  return norm(lon + 1.396971 * T); // J2000 → 그날의 분점(세차)
}

/** 역행 여부: 하루 전보다 황경이 줄었는가 */
export function isRetrograde(name, jd) {
  if (name === 'sun' || name === 'moon') return false;
  const d = norm(planetLongitude(name, jd) - planetLongitude(name, jd - 1) + 180) - 180;
  return d < 0;
}

export const PLANET_ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

/** 그리니치 평균항성시(도) */
function gmst(jd) {
  const T = (jd - 2451545.0) / 36525;
  return norm(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000);
}

/** 상승궁(ASC)과 천정(MC)의 황경. lat/lon 은 도(동경 +) */
export function angles(jd, lat, lon) {
  const T = (jd - 2451545.0) / 36525;
  const eps = (23.439291 - 0.0130042 * T) * RAD;
  const ramc = norm(gmst(jd) + lon) * RAD;
  const asc = norm(Math.atan2(-Math.cos(ramc), Math.sin(eps) * Math.tan(lat * RAD) + Math.cos(eps) * Math.sin(ramc)) / RAD + 180);
  const mc = norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / RAD);
  return { asc, mc };
}
