// 자미두수(紫微斗數) 명반 계산 — 동양 점성술.
// 음력 생년·생월·생일과 태어난 시진(時辰)으로 12궁에 14주성과 보좌성, 사화를 배치한다.
// - 명궁: 寅에서 생월만큼 나아가고 시진만큼 되돌아온 자리, 신궁: 생월만큼 나아가고 시진만큼 더 나아간 자리
// - 오행국: 명궁 간지의 납음(納音) 오행 (수2 · 목3 · 금4 · 토5 · 화6)
// - 자미성: 생일을 국수로 나누는 전통 공식, 천부성은 寅-申 축으로 자미의 대칭
// - 연간(年干)은 음력 해(설날 기준)의 간지를 쓴다
// - 윤달은 15일까지 그달, 16일부터 다음 달로 본다
import { solarToLunar } from './lunar.js';
import { computeSaju, STEMS, BRANCHES, pillar } from './saju.js';
import { jdn } from './astro.js';

const mod12 = (n) => ((n % 12) + 12) % 12;
const mod10 = (n) => ((n % 10) + 10) % 10;

export const PALACE_NAMES = ['명궁', '형제궁', '부처궁', '자녀궁', '재백궁', '질액궁', '천이궁', '노복궁', '관록궁', '전택궁', '복덕궁', '부모궁'];

// 납음 오행: 60갑자 두 개씩 30쌍 → 0 수, 1 목, 2 금, 3 토, 4 화
const NAYIN = '금화목토금화수토금목수토화목수금화목토금화수토금목수토화목수';
const NAYIN_EL = { 수: 0, 목: 1, 금: 2, 토: 3, 화: 4 };
const BUREAU = [2, 3, 4, 5, 6]; // 수2국 목3국 금4국 토5국 화6국
export const BUREAU_NAME = ['수이국', '목삼국', '금사국', '토오국', '화육국'];

// 14주성 키
export const MAIN_STARS = ['ziwei', 'tianji', 'taiyang', 'wuqu', 'tiantong', 'lianzhen', 'tianfu', 'taiyin', 'tanlang', 'jumen', 'tianxiang', 'tianliang', 'qisha', 'pojun'];

// 사화: 연간별 [화록, 화권, 화과, 화기]
const SIHUA = [
  ['lianzhen', 'pojun', 'wuqu', 'taiyang'], // 甲
  ['tianji', 'tianliang', 'ziwei', 'taiyin'], // 乙
  ['tiantong', 'tianji', 'wenchang', 'lianzhen'], // 丙
  ['taiyin', 'tiantong', 'tianji', 'jumen'], // 丁
  ['tanlang', 'taiyin', 'youbi', 'tianji'], // 戊
  ['wuqu', 'tanlang', 'tianliang', 'wenqu'], // 己
  ['taiyang', 'wuqu', 'taiyin', 'tiantong'], // 庚
  ['jumen', 'taiyang', 'wenqu', 'wenchang'], // 辛
  ['tianliang', 'ziwei', 'zuofu', 'wuqu'], // 壬
  ['pojun', 'jumen', 'taiyin', 'tanlang'], // 癸
];
export const SIHUA_NAMES = ['화록', '화권', '화과', '화기'];

/** 자미성 자리: 생일 d, 국수 n */
export function ziweiPosition(d, n) {
  let k = 0;
  while ((d + k) % n !== 0) k++;
  const q = (d + k) / n;
  return mod12(2 + q - 1 + (k % 2 ? -k : k));
}

/** 시진 인덱스(0=子)와 실제 날짜 이동을 사주 계산의 태양시에서 가져온다 */
function birthHour(profile) {
  const s = computeSaju(profile);
  if (!s.hasTime) return null;
  const solar = s.time.solarTime;
  const h = Math.floor(((solar.minutes + 60) % 1440) / 120);
  const shift = solar.dayShift + (solar.minutes >= 23 * 60 ? 1 : 0); // 자시부터 다음 날
  return { h, shift };
}

function addDays(y, m, d, n) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

/**
 * 명반 계산. 태어난 시각이 없으면 null.
 * @returns {{ palaces: Array, ming, shen, bureau, lunar, yearPillar, sihua }}
 */
export function ziweiChart(profile) {
  const bh = birthHour(profile);
  if (!bh) return null;
  const date = addDays(profile.year, profile.month, profile.day, bh.shift);
  const lunar = solarToLunar(date.year, date.month, date.day);
  let month = lunar.month;
  if (lunar.leap && lunar.day > 15) month = month % 12 + 1;
  const day = lunar.day;
  const yp = pillar(((lunar.year - 4) % 60 + 60) % 60); // 음력 해의 간지
  const h = bh.h;

  const ming = mod12(2 + (month - 1) - h);
  const shen = mod12(2 + (month - 1) + h);

  // 궁의 천간: 寅궁부터 오호둔(五虎遁)
  const yinStem = mod10((yp.stem % 5) * 2 + 2);
  const stemOf = (b) => mod10(yinStem + mod12(b - 2));

  // 오행국: 명궁 간지의 납음
  const mingIdx = (() => { for (let i = 0; i < 60; i++) if (i % 10 === stemOf(ming) && i % 12 === ming) return i; return 0; })();
  const bureauEl = NAYIN_EL[NAYIN[Math.floor(mingIdx / 2)]];
  const n = BUREAU[bureauEl];

  const Z = ziweiPosition(day, n);
  const F = mod12(4 - Z);
  const pos = {
    ziwei: Z, tianji: mod12(Z - 1), taiyang: mod12(Z - 3), wuqu: mod12(Z - 4), tiantong: mod12(Z - 5), lianzhen: mod12(Z - 8),
    tianfu: F, taiyin: mod12(F + 1), tanlang: mod12(F + 2), jumen: mod12(F + 3), tianxiang: mod12(F + 4), tianliang: mod12(F + 5), qisha: mod12(F + 6), pojun: mod12(F + 10),
  };
  // 보좌성
  const lucun = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][yp.stem];
  const kuiyue = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [6, 2], [3, 5], [3, 5]][yp.stem];
  const aux = {
    zuofu: mod12(4 + month - 1), youbi: mod12(10 - (month - 1)),
    wenchang: mod12(10 - h), wenqu: mod12(4 + h),
    tiankui: kuiyue[0], tianyue: kuiyue[1],
    lucun, qingyang: mod12(lucun + 1), tuoluo: mod12(lucun - 1),
    dikong: mod12(11 - h), dijie: mod12(11 + h),
  };
  const sihua = SIHUA[yp.stem].map((star, i) => ({ star, name: SIHUA_NAMES[i], branch: pos[star] ?? aux[star] }));

  const palaces = Array.from({ length: 12 }, (_, b) => {
    const order = mod12(ming - b); // 명궁에서 거꾸로 셈
    return {
      branch: b, stem: stemOf(b), gz: STEMS[stemOf(b)] + BRANCHES[b],
      name: PALACE_NAMES[order], order,
      main: MAIN_STARS.filter((s) => pos[s] === b),
      aux: Object.keys(aux).filter((s) => aux[s] === b),
      sihua: sihua.filter((x) => x.branch === b),
      isShen: b === shen,
    };
  });

  return {
    palaces, ming, shen, bureau: { element: bureauEl, number: n, name: BUREAU_NAME[bureauEl] },
    lunar: { ...lunar, month }, yearPillar: yp, hourBranch: h, sihua, positions: { ...pos, ...aux },
  };
}

/** 유년(流年): 올해 지지의 궁이 그해의 명궁, 올해 천간의 사화 */
export function ziweiYear(chart, year) {
  const yp = pillar(((year - 4) % 60 + 60) % 60);
  const palace = chart.palaces[yp.branch];
  const sihua = SIHUA[yp.stem].map((star, i) => ({ star, name: SIHUA_NAMES[i], branch: chart.positions[star] }));
  return { year, pillar: yp, palace, sihua };
}

export { jdn };
