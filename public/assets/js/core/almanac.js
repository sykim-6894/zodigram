// 길일 달력(책력) 계산: 음력, 일진, 24절기, 손 없는 날, 공휴일, 내 사주와의 관계.
import { julianDate, sunLongitude } from './astro.js';
import { solarToLunar } from './lunar.js';
import { dayPillar, branchRelation, tenGod, computeSaju } from './saju.js';

// 태양 황경 15°마다의 절기 이름 (index = 황경 / 15)
const TERMS24 = ['춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로',
  '추분', '한로', '상강', '입동', '소설', '대설', '동지', '소한', '대한', '입춘', '우수', '경칩'];

/** 그날(한국시 0시~24시) 안에 절기가 드는가 */
export function solarTermOnDay(y, m, d) {
  const s = julianDate(y, m, d, 0, 0, 9);
  const ls = sunLongitude(s);
  const le = sunLongitude(s + 1);
  const k = Math.floor(le / 15) % 24;
  const span = ((le - ls) % 360 + 360) % 360;
  const offset = ((k * 15 - ls) % 360 + 360) % 360;
  return offset > 0 && offset <= span ? TERMS24[k] : null;
}

const SOLAR_HOLIDAYS = {
  '1-1': '신정', '3-1': '삼일절', '5-5': '어린이날', '6-6': '현충일',
  '8-15': '광복절', '10-3': '개천절', '10-9': '한글날', '12-25': '성탄절',
};

function holidayOf(m, d, lunar) {
  if (SOLAR_HOLIDAYS[`${m}-${d}`]) return SOLAR_HOLIDAYS[`${m}-${d}`];
  if (lunar.leap) return null;
  const { month: lm, day: ld, monthDays } = lunar;
  if (lm === 1 && ld === 1) return '설날';
  if (lm === 1 && ld === 2) return '설날 연휴';
  if (lm === 12 && ld === monthDays) return '설날 연휴';
  if (lm === 4 && ld === 8) return '부처님오신날';
  if (lm === 8 && ld === 15) return '추석';
  if (lm === 8 && (ld === 14 || ld === 16)) return '추석 연휴';
  return null;
}

// 음력 날짜 끝자리로 보는 '손'(이동하며 해를 끼친다는 귀신)의 방향
const SON_DIR = ['없음', '동', '동', '남', '남', '서', '서', '북', '북', '없음'];

/** 하루 정보 */
export function dayInfo(y, m, d, saju = null) {
  const lunar = solarToLunar(y, m, d);
  const pillar = dayPillar(y, m, d);
  const sonDir = SON_DIR[lunar.day % 10];
  const info = {
    year: y, month: m, day: d,
    weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay(),
    lunar, pillar,
    term: solarTermOnDay(y, m, d),
    holiday: holidayOf(m, d, lunar),
    sonEmpty: sonDir === '없음',
    sonDir,
  };
  if (saju) {
    info.relation = branchRelation(saju.pillars.day.branch, pillar.branch);
    info.tenGod = tenGod(saju.dayMaster, pillar.stem);
  }
  return info;
}

/** 한 달 달력. 앞뒤 빈칸은 null 로 채워 7의 배수로 맞춘다(일요일 시작). */
export function monthCalendar(y, m, profile = null) {
  const saju = profile ? computeSaju(profile) : null;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const cells = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(dayInfo(y, m, d, saju));
  while (cells.length % 7) cells.push(null);
  return { year: y, month: m, cells, hasProfile: !!saju };
}
