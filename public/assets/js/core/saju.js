// 사주팔자(四柱八字) 계산.
// - 연주: 입춘 기준으로 해가 바뀜
// - 월주: 태양 황경(12절) 기준
// - 일주: 율리우스 일수로 60갑자 계산 (2000-01-01 = 戊午)
// - 시각 보정: 그 시절의 표준시(UTC+8:30 시기 포함)와 서머타임을 빼서 실제 시각을 구하고,
//   태어난 곳의 경도로 지방평균태양시를 구해 시주를 정한다(서울은 한국 표준시보다 약 32분 늦음).
// - 자시(子時, 태양시 23시~1시)부터 다음 날로 본다
import { jdn, julianDate, sunLongitude } from './astro.js';
import { koreaUtcOffset, placeOf } from './koreatime.js';

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

// 오행: 0 목, 1 화, 2 토, 3 금, 4 수
export const ELEMENTS = ['목', '화', '토', '금', '수'];
export const ELEMENTS_HANJA = ['木', '火', '土', '金', '水'];
export const STEM_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
export const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
// 지지의 본기(本氣) 천간 — 십신을 볼 때 사용
export const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

export const isYang = (stemIdx) => stemIdx % 2 === 0;

export function pillar(idx60) {
  const s = idx60 % 10;
  const b = idx60 % 12;
  return {
    index: idx60, stem: s, branch: b,
    hanja: STEMS[s] + BRANCHES[b],
    hangul: STEMS_KO[s] + BRANCHES_KO[b],
  };
}

const fromStemBranch = (s, b) => {
  for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return pillar(i);
  throw new Error('invalid stem/branch');
};

/** 해당 그레고리력 날짜의 일진 */
export function dayPillar(year, month, day) {
  return pillar(((jdn(year, month, day) + 49) % 60 + 60) % 60);
}

/** 태양시(분) → 시지 인덱스(0=子, 23시~1시) */
export function hourBranchFromSolar(solarMinutes) {
  return Math.floor((((solarMinutes + 60) % 1440) + 1440) % 1440 / 120);
}

const mod60 = (n) => ((n % 60) + 60) % 60;
const hhmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(Math.round(mins % 60)).padStart(2, '0')}`;

/**
 * 사주 계산
 * @param {{year:number, month:number, day:number, hour?:number|null, minute?:number, place?:string}} b
 */
export function computeSaju(b) {
  const hasTime = b.hour !== null && b.hour !== undefined && b.hour !== '';
  const hour = hasTime ? Number(b.hour) : 12;
  const minute = hasTime ? Number(b.minute || 0) : 0;
  const place = placeOf(b.place);
  const { offset, dst, standard } = koreaUtcOffset(b.year, b.month, b.day, hour, minute);

  // 월·연: 실제 순간(UTC)의 태양 황경으로 판단
  const jd = julianDate(b.year, b.month, b.day, hour, minute, offset);
  const lon = sunLongitude(jd);
  const monthIdx = Math.floor((((lon - 315) % 360) + 360) % 360 / 30); // 0 = 寅월
  let sajuYear = b.year;
  if (b.month <= 2 && monthIdx >= 10) sajuYear -= 1;
  const yearP = pillar(mod60(sajuYear - 4));
  const monthStem = (yearP.stem * 2 + 2 + monthIdx) % 10;
  const monthP = fromStemBranch(monthStem, (monthIdx + 2) % 12);

  let dayP = dayPillar(b.year, b.month, b.day);
  let hourP = null;
  let solarTime = null;
  if (hasTime) {
    // 지방평균태양시 = UTC + 경도/15시간
    let solar = hour * 60 + minute - offset * 60 + place.lon * 4;
    const shift = Math.floor(solar / 1440);
    solar -= shift * 1440;
    const hb = hourBranchFromSolar(solar);
    dayP = pillar(mod60(dayP.index + shift + (solar >= 23 * 60 ? 1 : 0)));
    hourP = fromStemBranch((dayP.stem * 2 + hb) % 10, hb);
    solarTime = { minutes: solar, text: hhmm(solar), dayShift: shift };
  }

  const pillars = { year: yearP, month: monthP, day: dayP, hour: hourP };
  const counts = [0, 0, 0, 0, 0];
  for (const p of Object.values(pillars)) {
    if (!p) continue;
    counts[STEM_ELEMENT[p.stem]]++;
    counts[BRANCH_ELEMENT[p.branch]]++;
  }
  return {
    pillars, counts, dayMaster: dayP.stem, zodiacAnimal: yearP.branch, hasTime,
    time: { offset, dst, standard, place, solarTime, sunLon: lon, jd },
  };
}

const TEN_GODS = [
  ['비견', '겁재'], // 같은 오행
  ['식신', '상관'], // 내가 생함
  ['편재', '정재'], // 내가 극함
  ['편관', '정관'], // 나를 극함
  ['편인', '정인'], // 나를 생함
];

/** 일간 기준으로 다른 천간의 십신 */
export function tenGod(dayStem, otherStem) {
  const e0 = STEM_ELEMENT[dayStem];
  const e1 = STEM_ELEMENT[otherStem];
  const rel = ((e1 - e0) % 5 + 5) % 5; // 0 같음, 1 내가 생, 2 내가 극, 3 나를 극, 4 나를 생
  const same = isYang(dayStem) === isYang(otherStem);
  return TEN_GODS[rel][same ? 0 : 1];
}

/** 두 지지의 관계 */
export function branchRelation(a, b) {
  if (a === b) return 'same';
  if ((a + b) % 12 === 1) return 'harmony';      // 육합
  if (a % 4 === b % 4) return 'trine';            // 삼합
  if (Math.abs(a - b) === 6) return 'clash';      // 충
  if ((a + b) % 12 === 7) return 'harm';          // 해
  return 'neutral';
}

/** 오늘 일진과 내 사주의 관계 */
export function dailySaju(saju, today) {
  const tp = dayPillar(today.year, today.month, today.day);
  return {
    todayPillar: tp,
    tenGod: tenGod(saju.dayMaster, tp.stem),
    branchTenGod: tenGod(saju.dayMaster, BRANCH_MAIN_STEM[tp.branch]),
    dayBranchRelation: branchRelation(saju.pillars.day.branch, tp.branch),
    zodiacRelation: branchRelation(saju.zodiacAnimal, tp.branch),
    todayElement: STEM_ELEMENT[tp.stem],
  };
}
