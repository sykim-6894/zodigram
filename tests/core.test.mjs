// node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayPillar, computeSaju, tenGod, branchRelation } from '../public/assets/js/core/saju.js';
import { solarTermsOfYear } from '../public/assets/js/core/astro.js';
import { HEXAGRAMS } from '../public/assets/js/data/iching.js';
import { readCast } from '../public/assets/js/core/iching.js';
import { sunSign, lifePath } from '../public/assets/js/core/western.js';
import { getToday, getEast, getWest, getScore } from '../public/assets/js/core/fortune.js';

test('일진: 알려진 날짜', () => {
  assert.equal(dayPillar(2000, 1, 1).hanja, '戊午');
  assert.equal(dayPillar(1900, 1, 1).hanja, '甲戌');
  assert.equal(dayPillar(2024, 2, 10).hanja, '甲辰'); // 2024 설날
});

test('연주는 입춘에 바뀐다', () => {
  assert.equal(computeSaju({ year: 2026, month: 2, day: 3, hour: 12 }).pillars.year.hanja, '乙巳');
  assert.equal(computeSaju({ year: 2026, month: 2, day: 5, hour: 12 }).pillars.year.hanja, '丙午');
  assert.equal(computeSaju({ year: 2026, month: 2, day: 5, hour: 12 }).pillars.month.hanja, '庚寅');
});

test('시주: 甲일 子시는 甲子, 23:30 이후는 다음 날', () => {
  // 2024-02-10 甲辰일 → 00:30 은 甲子시
  assert.equal(computeSaju({ year: 2024, month: 2, day: 10, hour: 0, minute: 30 }).pillars.hour.hanja, '甲子');
  const late = computeSaju({ year: 2024, month: 2, day: 9, hour: 23, minute: 45 });
  assert.equal(late.pillars.day.hanja, '甲辰');
  assert.equal(late.pillars.hour.hanja, '甲子');
});

test('2026년 절기 날짜(한국천문연구원 발표와 하루 이내)', () => {
  const t = Object.fromEntries(solarTermsOfYear(2026).map((x) => [x.name, `${x.month}/${x.day}`]));
  assert.equal(t['입춘'], '2/4');
  assert.equal(t['입하'], '5/5');
  assert.equal(t['입추'], '8/7');
  assert.equal(t['입동'], '11/7');
});

test('십신과 지지 관계', () => {
  assert.equal(tenGod(0, 0), '비견');
  assert.equal(tenGod(0, 3), '상관'); // 甲 → 丁
  assert.equal(tenGod(0, 7), '정관'); // 甲 ← 辛
  assert.equal(branchRelation(0, 1), 'harmony');
  assert.equal(branchRelation(0, 6), 'clash');
  assert.equal(branchRelation(8, 4), 'trine');
});

test('주역 64괘가 모두 다르고, 변효 계산이 맞다', () => {
  assert.equal(HEXAGRAMS.length, 64);
  assert.equal(new Set(HEXAGRAMS.map((h) => h.lines.join(''))).size, 64);
  const r = readCast([9, 7, 7, 7, 7, 7]); // 乾의 초효 변 → 姤
  assert.equal(r.primary.num, 1);
  assert.equal(r.relating.num, 44);
  assert.equal(readCast([8, 8, 8, 8, 8, 8]).primary.num, 2);
});

test('별자리 경계와 생명수', () => {
  assert.equal(sunSign({ year: 1990, month: 3, day: 25 }).en, 'Aries');
  assert.equal(sunSign({ year: 1990, month: 12, day: 25 }).en, 'Capricorn');
  assert.equal(lifePath({ year: 1990, month: 5, day: 15 }).number, 3); // 1+9+9+0=19→1, 5, 6 → 12 → 3
});

test('운세 API는 같은 날 같은 결과', () => {
  const p = { year: 1990, month: 5, day: 15, hour: 10, minute: 30 };
  const now = new Date('2026-11-13T03:00:00Z');
  assert.deepEqual(getWest(p, now).tarot, getWest(p, new Date('2026-11-13T10:00:00Z')).tarot);
  assert.ok(getEast(p, now).daily.title);
  assert.equal(getToday(now).pillar.hanja, '辛卯');
});

import { lunarToSolar, solarToLunar, leapMonthOf } from '../public/assets/js/core/lunar.js';

test('음력: 설날·추석·윤달 (한국천문연구원 발표값)', () => {
  const seol = { 1900: '1-31', 1970: '2-6', 1990: '1-27', 2000: '2-5', 2012: '1-23', 2020: '1-25', 2023: '1-22', 2024: '2-10', 2025: '1-29', 2026: '2-17', 2027: '2-7', 2030: '2-3' };
  for (const [y, v] of Object.entries(seol)) {
    const r = lunarToSolar(+y, 1, 1);
    assert.equal(`${r.month}-${r.day}`, v, `${y} 설날`);
  }
  const c = lunarToSolar(2025, 8, 15);
  assert.equal(`${c.month}-${c.day}`, '10-6');
  const leaps = { 1990: 5, 2012: 3, 2020: 4, 2023: 2, 2025: 6, 2028: 5, 2033: 11 };
  for (const [y, v] of Object.entries(leaps)) assert.equal(leapMonthOf(+y), v, `${y} 윤달`);
});

test('음력: 왕복 변환과 잘못된 날짜', () => {
  assert.deepEqual(solarToLunar(2026, 11, 13), { year: 2026, month: 10, day: 5, leap: false, monthDays: 30 });
  const s = lunarToSolar(2025, 6, 10, true);
  const back = solarToLunar(s.year, s.month, s.day);
  assert.equal(back.leap, true);
  assert.equal(back.month, 6);
  assert.ok(lunarToSolar(2026, 6, 1, true).error);
  assert.ok(lunarToSolar(1899, 1, 1).error);
});

import { monthCalendar, dayInfo } from '../public/assets/js/core/almanac.js';

test('길일 달력: 절기·공휴일·손 없는 날', () => {
  const nov = monthCalendar(2026, 11).cells.filter(Boolean);
  assert.equal(nov.length, 30);
  assert.equal(monthCalendar(2026, 11).cells.length % 7, 0);
  assert.equal(nov.find((c) => c.term === '입동').day, 7);
  assert.equal(nov.find((c) => c.term === '소설').day, 22);
  assert.deepEqual(nov.filter((c) => c.sonEmpty).map((c) => c.day), [8, 17, 18, 27, 28]);
  assert.equal(dayInfo(2026, 2, 17).holiday, '설날');
  assert.equal(dayInfo(2026, 2, 16).holiday, '설날 연휴');
  assert.equal(dayInfo(2026, 9, 25).holiday, '추석');
  assert.equal(dayInfo(2026, 5, 24).holiday, '부처님오신날');
  assert.equal(dayInfo(2026, 12, 22).term, '동지'); // 2026-12-22 05시대(한국시)
  const mine = monthCalendar(2026, 11, { year: 1990, month: 5, day: 15, hour: 10, minute: 30 });
  assert.ok(mine.hasProfile);
  assert.equal(mine.cells.filter(Boolean).find((c) => c.day === 13).tenGod, '겁재');
});

import { totalScore } from '../public/assets/js/core/score.js';

test('오늘의 점수: 항목 합과 일치하고 하루 동안 같다', () => {
  const p = { year: 1990, month: 5, day: 15, hour: 10, minute: 30 };
  const now = new Date('2026-11-13T03:00:00Z');
  const s = totalScore(getEast(p, now), getWest(p, now));
  for (const part of [s.east, s.west]) {
    const raw = part.base + part.items.reduce((a, i) => a + i.delta, 0);
    assert.equal(part.score, Math.max(50, Math.min(100, raw)));
  }
  assert.equal(s.total, Math.round((s.east.score + s.west.score) / 2));
  const later = new Date('2026-11-13T12:00:00Z');
  assert.equal(totalScore(getEast(p, later), getWest(p, later)).total, s.total);
  assert.ok(s.tier && s.advice);
});

test('오늘의 점수: 50~100 범위', () => {
  for (let y = 1970; y < 2005; y += 7) {
    for (let k = 0; k < 20; k += 4) {
      const now = new Date(Date.UTC(2026, 10, 1 + k, 3));
      const p = { year: y, month: (y % 12) + 1, day: (y % 27) + 1 };
      const s = totalScore(getEast(p, now), getWest(p, now));
      for (const v of [s.total, s.east.score, s.west.score]) assert.ok(v >= 50 && v <= 100, String(v));
    }
  }
});

test('서양 풀이는 하루 동안 같은 달 위치를 쓴다', () => {
  const p = { year: 1990, month: 5, day: 15 };
  // 2026-11-14 한국시 0시 1분과 23시 59분
  const a = getWest(p, new Date('2026-11-13T15:01:00Z'));
  const b = getWest(p, new Date('2026-11-14T14:59:00Z'));
  assert.equal(a.moon.moonSign, b.moon.moonSign);
  assert.equal(a.moon.house, b.moon.house);
});

import { EAST_QUOTES, WEST_QUOTES } from '../public/assets/js/data/quotes.js';
import { OPENERS, ACTIONS } from '../public/assets/js/data/advice.js';

test('한마디 목록: 중복 없음, 분위기 표시, 동서양 겹침 없음', () => {
  for (const list of [EAST_QUOTES, WEST_QUOTES]) {
    assert.equal(new Set(list.map((q) => q.text)).size, list.length);
    for (const q of list) assert.ok(q.text && q.src && 'gsc'.includes(q.tone), q.text);
  }
  const east = new Set(EAST_QUOTES.map((q) => q.text));
  assert.deepEqual(WEST_QUOTES.filter((q) => east.has(q.text)).map((q) => q.text), []);
  assert.ok(EAST_QUOTES.length >= 330 && WEST_QUOTES.length >= 300);
  for (const t of 'gsc') assert.equal(OPENERS[t].length * ACTIONS[t].length, 400);
});

test('생년월일 없이 보는 오늘의 한마디는 목록을 다 돌 때까지 반복되지 않는다', () => {
  const at = (k) => new Date(Date.UTC(2026, 0, 1 + k, 3));
  const e = new Set(), w = new Set();
  for (let k = 0; k < WEST_QUOTES.length; k++) { e.add(getToday(at(k)).eastQuote.text); w.add(getToday(at(k)).westQuote.text); }
  assert.equal(e.size, WEST_QUOTES.length);
  assert.equal(w.size, WEST_QUOTES.length);
});

test('점수 한마디·조언: 1년 단위 안에서 겹치지 않고 분위기를 따른다', () => {
  const p = { year: 1990, month: 5, day: 15, hour: 10, minute: 30 };
  const first = getToday(new Date(Date.UTC(2026, 0, 1, 3))).dayNumber;
  const start = Math.ceil(first / 365) * 365; // 1년 단위의 첫날
  const at = (d) => new Date(((d - 0.5) - 2440587.5) * 86400000 + 3 * 3600000);
  const east = [], west = [], advice = [];
  let matched = 0;
  for (let d = start; d < start + 365; d++) {
    const s = getScore(p, at(d)).score;
    east.push(s.message.east.text);
    west.push(s.message.west.text);
    advice.push(s.message.advice);
    if (s.message.east.tone === s.tone) matched++;
  }
  assert.equal(new Set(east.slice(0, EAST_QUOTES.length)).size, Math.min(365, EAST_QUOTES.length));
  assert.equal(new Set(west.slice(0, WEST_QUOTES.length)).size, WEST_QUOTES.length);
  assert.equal(new Set(advice).size, 365);
  assert.ok(matched / 365 > 0.6, `분위기 일치 ${matched}/365`);
});

import { planetLongitude, angles, isRetrograde } from '../public/assets/js/core/planets.js';
import { natalChart, dailyTransits, koreaBirthOffset } from '../public/assets/js/core/natal.js';
import { julianDate as jdate } from '../public/assets/js/core/astro.js';

test('행성 위치: J2000 기준값과 0.3° 이내, 목성-토성 대합, 수성 역행', () => {
  const ref = { mercury: 271.9, venus: 241.6, mars: 327.9, jupiter: 25.25, saturn: 40.4, uranus: 314.8, neptune: 303.2, pluto: 251.45 };
  for (const [k, v] of Object.entries(ref)) assert.ok(Math.abs(planetLongitude(k, 2451545.0) - v) < 0.3, k);
  const gc = jdate(2020, 12, 21, 18, 0, 0);
  assert.ok(Math.abs(planetLongitude('jupiter', gc) - planetLongitude('saturn', gc)) < 0.5);
  assert.equal(isRetrograde('mercury', jdate(2024, 4, 10, 12, 0, 0)), true);
  assert.equal(isRetrograde('mercury', jdate(2024, 5, 10, 12, 0, 0)), false);
});

test('상승궁: 서울 해 뜰 무렵 상승궁 ≈ 태양 황경, 정오 MC ≈ 태양', () => {
  const sr = jdate(2026, 6, 21, 5, 11, 9);
  assert.ok(Math.abs(angles(sr, 37.5665, 126.978).asc - planetLongitude('sun', sr)) < 2);
  const noon = jdate(2026, 6, 21, 12, 33, 9);
  assert.ok(Math.abs(angles(noon, 37.5665, 126.978).mc - planetLongitude('sun', noon)) < 1);
});

test('출생 차트: 하우스·원소·서머타임', () => {
  const c = natalChart({ year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울' });
  assert.equal(c.planets[0].signName, '황소자리');
  assert.ok(c.asc && c.asc.sign >= 0);
  assert.equal(c.planets[0].house, ((c.planets[0].sign - c.asc.sign + 12) % 12) + 1);
  assert.equal(Object.values(c.elements).reduce((a, b) => a + b, 0), 8);
  assert.equal(natalChart({ year: 1990, month: 5, day: 15 }).asc, null);
  assert.equal(koreaBirthOffset(1988, 7, 1, 10, 0), 10);
  assert.equal(koreaBirthOffset(1988, 11, 1, 10, 0), 9);
  assert.equal(koreaBirthOffset(1960, 1, 1), 8.5);
  const t = dailyTransits(c, new Date('2026-11-13T03:00:00Z'));
  assert.ok(t.aspects.length <= 4 && t.today.length === 7);
  for (let i = 1; i < t.aspects.length; i++) assert.ok(t.aspects[i - 1].orb <= t.aspects[i].orb);
});

import { koreaUtcOffset } from '../public/assets/js/core/koreatime.js';
import { manseLookup } from '../public/assets/js/core/manse.js';

test('한국 표준시·서머타임 역사', () => {
  assert.equal(koreaUtcOffset(1988, 7, 1, 10, 0).offset, 10);
  assert.equal(koreaUtcOffset(1988, 5, 8, 1, 59).dst, false);
  assert.equal(koreaUtcOffset(1987, 10, 11, 2, 30).dst, true);
  assert.equal(koreaUtcOffset(1987, 10, 11, 3, 30).dst, false);
  assert.equal(koreaUtcOffset(1958, 7, 1).offset, 9.5);
  assert.equal(koreaUtcOffset(1950, 8, 1).offset, 10);
  assert.equal(koreaUtcOffset(1930, 6, 1).offset, 9);
  assert.equal(koreaUtcOffset(2026, 7, 1).offset, 9);
});

test('사주 시각 보정: 서머타임과 출생지 태양시', () => {
  // 1988-07-01 10:00(서머타임) → 실제 09:00 → 서울 태양시 08:28 → 辰시
  const a = computeSaju({ year: 1988, month: 7, day: 1, hour: 10, minute: 0, place: '서울' });
  assert.equal(a.pillars.hour.branch, 4);
  assert.equal(a.time.dst, true);
  // 1988-07-01 00:20(서머타임) → 전날 22:48 亥시
  const b = computeSaju({ year: 1988, month: 7, day: 1, hour: 0, minute: 20, place: '서울' });
  assert.equal(b.pillars.hour.branch, 11);
  assert.equal(b.pillars.day.hanja, '丙辰');
  // 평상시 서울은 한국 표준시보다 약 32분 늦다
  assert.equal(computeSaju({ year: 2000, month: 3, day: 1, hour: 7, minute: 20, place: '서울' }).time.solarTime.text, '06:48');
});

test('만세력 조회: 입춘 직전·직후, 음력 입력, 절기 구간', () => {
  const before = manseLookup({ calendar: 'solar', date: '2026-02-04', time: '04:00' });
  const after = manseLookup({ calendar: 'solar', date: '2026-02-04', time: '06:00' });
  assert.equal(before.saju.pillars.year.hanja, '乙巳');
  assert.equal(after.saju.pillars.year.hanja, '丙午');
  assert.equal(after.saju.pillars.month.hanja, '庚寅');
  const l = manseLookup({ calendar: 'lunar', ly: 1990, lm: 4, ld: 21, time: '10:30' });
  assert.deepEqual([l.solar.year, l.solar.month, l.solar.day], [1990, 5, 15]);
  const n = manseLookup({ calendar: 'solar', date: '2026-11-13', time: '14:30' });
  assert.equal(n.term.from.name, '입동');
  assert.equal(n.term.to.name, '대설');
  assert.ok(manseLookup({ calendar: 'lunar', ly: 2026, lm: 6, ld: 1, leap: true }).error);
});

import { westScore, transitDelta } from '../public/assets/js/core/score.js';

test('서양 점수: 행성 각 항목 포함, 어떤 조합도 50~100', () => {
  const p = { year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울' };
  const w = getWest(p, new Date('2026-11-13T03:00:00Z'));
  assert.ok(w.transits && Array.isArray(w.transits.aspects));
  const s = westScore(w);
  assert.ok(s.items.some((i) => i.label === '오늘의 행성 각'));
  assert.equal(transitDelta([]), 0);
  assert.equal(transitDelta([{ tone: 'good' }, { tone: 'good' }, { tone: 'good' }]), 6);
  assert.equal(transitDelta([{ tone: 'hard' }, { tone: 'hard' }, { tone: 'hard' }]), -5);
  // 장소가 바뀌면 다른 사람으로 계산(캐시 분리), 같은 사람·같은 날의 카드는 그대로
  const busan = getWest({ ...p, place: '부산' }, new Date('2026-11-13T03:00:00Z'));
  assert.deepEqual(busan.tarot, w.tarot);
});

import { getYear, getMonth, getQuarter, samjae, mercuryRetrogrades } from '../public/assets/js/core/period.js';

test('기간 운세: 삼재·수성 역행·점수 범위', () => {
  // 2026 丙午년: 亥卯未(돼지·토끼·양)띠 눌삼재, 말띠는 해당 없음
  assert.equal(samjae(11, 6).name, '눌삼재');
  assert.equal(samjae(5, 5), null);
  assert.equal(samjae(3, 5).name, '들삼재');
  // 2024년 수성 역행(실제: 4.1~4.25, 8.5~8.28, 11.26~12.15 무렵)
  const r = mercuryRetrogrades(2024, 3, 1, 2024, 12, 31).map((x) => x.text);
  assert.equal(r.length, 3);
  assert.ok(r[0].startsWith('4.'));
  const now = new Date('2026-11-13T03:00:00Z');
  for (let y = 1965; y < 2010; y += 4) {
    const p = { year: y, month: (y % 12) + 1, day: (y % 27) + 1, hour: y % 24, minute: 0 };
    for (const res of [getYear(p, now), getMonth(p, now), getQuarter(p, now)]) {
      for (const v of [res.total, res.east.score, res.west.score]) assert.ok(v >= 50 && v <= 100, `${res.kind} ${v}`);
      assert.ok(res.tier && res.advice);
    }
  }
  const p = { year: 1990, month: 5, day: 15, hour: 10, minute: 30 };
  const y = getYear(p, now);
  assert.equal(y.eastView.pillar.hanja, '丙午');
  assert.equal(y.east.score, Math.max(50, Math.min(100, y.east.base + y.east.items.reduce((a, i) => a + i.delta, 0))));
  const q = getQuarter(p, now);
  assert.equal(q.months.map((m) => m.month).join(','), '10,11,12');
  assert.equal(q.east.score, Math.round(q.months.reduce((a, m) => a + m.east.score, 0) / 3));
});

import { ziweiPosition, ziweiChart, ziweiYear } from '../public/assets/js/core/ziwei.js';

test('자미두수: 자미성 안성표와 명반 배치', () => {
  const B = '子丑寅卯辰巳午未申酉戌亥';
  const row = (n) => Array.from({ length: 10 }, (_, i) => B[ziweiPosition(i + 1, n)]).join('');
  // 전통 안성표(1~10일)
  assert.equal(row(2), '丑寅寅卯卯辰辰巳巳午');
  assert.equal(row(3), '辰丑寅巳寅卯午卯辰未');
  assert.equal(row(4), '亥辰丑寅子巳寅卯丑午');
  assert.equal(row(5), '午亥辰丑寅未子巳寅卯');
  assert.equal(row(6), '酉午亥辰丑寅戌未子巳');
  const c = ziweiChart({ year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울' });
  // 음력 1990-4-21 巳시, 庚午년 → 명궁 子, 신궁 戌
  assert.equal(B[c.ming], '子');
  assert.equal(B[c.shen], '戌');
  // 14주성이 모두 한 번씩, 자미 寅이면 천부도 寅(紫府同宮)
  assert.equal(c.palaces.reduce((a, p) => a + p.main.length, 0), 14);
  assert.equal(B[c.positions.ziwei], '寅');
  assert.equal(c.positions.tianfu, c.positions.ziwei);
  // 庚년 사화: 태양 祿, 무곡 權, 태음 科, 천동 忌
  assert.deepEqual(c.sihua.map((x) => x.star), ['taiyang', 'wuqu', 'taiyin', 'tiantong']);
  // 열두 궁 이름이 모두 다르고 명궁에서 거꾸로 이어진다
  assert.equal(new Set(c.palaces.map((p) => p.name)).size, 12);
  assert.equal(c.palaces[(c.ming + 11) % 12].name, '형제궁');
  assert.equal(ziweiYear(c, 2026).palace.branch, 6);
  assert.equal(ziweiChart({ year: 1990, month: 5, day: 15 }), null);
});

import { sunSign as sunSign2 } from '../public/assets/js/core/western.js';

test('서머타임·표준시 변천: 별자리·출생 차트·사주가 같은 순간을 쓴다', () => {
  // 서머타임 기간의 별자리 경계일 출생(보정 전에는 별자리가 어긋났던 사례)
  for (const p of [
    { year: 1950, month: 5, day: 22, hour: 0, minute: 50 },
    { year: 1955, month: 7, day: 24, hour: 0, minute: 50 },
    { year: 1957, month: 6, day: 22, hour: 1, minute: 20 },
    { year: 1959, month: 7, day: 24, hour: 0, minute: 10 },
  ]) {
    assert.equal(sunSign2(p).index, natalChart(p).planets[0].sign, JSON.stringify(p));
    assert.equal(getWest(p).sign.index, natalChart(p).planets[0].sign);
  }
  // 1988 서머타임 자정 무렵: 메인(getEast)과 사주·만세력이 같은 네 기둥
  const p = { year: 1988, month: 7, day: 1, hour: 0, minute: 20, place: '서울' };
  const main = getEast(p).saju.pillars;
  const manse = manseLookup({ calendar: 'solar', date: '1988-07-01', time: '00:20', place: '서울' }).saju.pillars;
  for (const k of ['year', 'month', 'day', 'hour']) assert.equal(main[k].hanja, manse[k].hanja);
  assert.equal(main.day.hanja, '丙辰'); // 전날
});

import { getTopics } from '../public/assets/js/core/topics.js';

test('주제별 운세: 네 주제 × 세 기간, 50~100, 근거 합계, 성별 반영', () => {
  const now = new Date('2026-11-16T03:00:00Z');
  for (const gender of ['', 'f', 'm']) {
    const p = { year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울', gender };
    for (const kind of ['day', 'month', 'year']) {
      const r = getTopics(p, kind, now);
      assert.deepEqual(Object.keys(r), ['love', 'money', 'work', 'health']);
      for (const t of Object.values(r)) {
        for (const part of [t.east, t.west]) {
          assert.ok(part.score >= 50 && part.score <= 100);
          assert.equal(part.score, Math.max(50, Math.min(100, part.base + part.items.reduce((a, i) => a + i.delta, 0))));
        }
        assert.equal(t.total, Math.round((t.east.score + t.west.score) / 2));
        assert.ok(t.head && t.tip);
      }
    }
  }
  // 같은 날 정관이 드는 사람: 여성은 배우자 별로 크게, 남성은 작게 반영
  const base = { year: 1990, month: 5, day: 15, hour: 10, minute: 30 };
  const f = getTopics({ ...base, gender: 'f' }, 'day', now).love.east.items[0].delta;
  const m = getTopics({ ...base, gender: 'm' }, 'day', now).love.east.items[0].delta;
  assert.notEqual(f, m);
  // 시각이 없어도 계산된다(자미두수·상승궁 없이)
  assert.ok(getTopics({ year: 1990, month: 5, day: 15 }, 'year', now).love.total >= 50);
});

import { computeMatch } from '../public/assets/js/core/match.js';

test('궁합: 50~100, 근거 합계, 대칭에 가까움, 천간합·충 반영', () => {
  const a = { name: '가', year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울' };
  const b = { name: '나', year: 1988, month: 11, day: 3, hour: 7, minute: 0, place: '부산' };
  const r = computeMatch(a, b);
  for (const part of [r.east, r.west]) {
    assert.ok(part.score >= 50 && part.score <= 100);
    assert.equal(part.score, Math.max(50, Math.min(100, part.base + part.items.reduce((x, i) => x + i.delta, 0))));
  }
  assert.equal(r.total, Math.round((r.east.score + r.west.score) / 2));
  assert.ok(r.level && r.text);
  // 동양 점수는 순서를 바꿔도 같다
  assert.equal(computeMatch(b, a).east.score, r.east.score);
  // 일지 辰·戌 충이 들어간다
  assert.ok(r.east.items.some((i) => i.label.startsWith('일지 辰·戌') && i.delta < 0));
  // 시각이 없는 사람과도 계산된다
  assert.ok(computeMatch(a, { name: '다', year: 1995, month: 1, day: 1 }).west.uncertain);
});

import { officerOf } from '../public/assets/js/core/almanac.js';
import { findDays, evaluateDay } from '../public/assets/js/core/pick.js';
import { OFFICERS, PURPOSE_KEYS } from '../public/assets/js/data/pick-text.js';

test('건제십이신: 건일은 일지=월건, 절입일 반복, 1년에 고르게', () => {
  // 2026-11-09 丁亥일은 월건(亥월)과 같은 지지 → 건
  assert.equal(OFFICERS[officerOf(2026, 11, 9)].ko, '건');
  assert.equal(OFFICERS[officerOf(2026, 11, 13)].ko, '정');
  for (const t of solarTermsOfYear(2026)) {
    if (t.day > 1) assert.equal(officerOf(2026, t.month, t.day), officerOf(2026, t.month, t.day - 1), `${t.name} 절입일`);
  }
  const cnt = {};
  for (let k = 0; k < 365; k++) { const t = new Date(Date.UTC(2026, 0, 1 + k)); const n = officerOf(2026, t.getUTCMonth() + 1, t.getUTCDate()); cnt[n] = (cnt[n] || 0) + 1; }
  assert.equal(Object.keys(cnt).length, 12);
  for (const v of Object.values(cnt)) assert.ok(v >= 25 && v <= 36);
});

test('택일: 점수 범위·근거 합계·피할 날·정렬', () => {
  const me = { name: '나', year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울' };
  const mate = { name: '민수', year: 1988, month: 11, day: 3, hour: 7, minute: 0, place: '부산' };
  const from = { year: 2026, month: 11, day: 18 };
  for (const key of PURPOSE_KEYS) {
    const r = findDays(key, { profile: me, partner: mate, days: 60, from });
    assert.equal(r.all.length, 60);
    for (const x of r.all) {
      assert.ok(x.score >= 50 && x.score <= 100);
      assert.equal(x.score, Math.max(50, Math.min(100, 64 + x.items.reduce((a, i) => a + i.delta, 0))));
      if (x.info.officer === 6) assert.ok(x.avoid, '파일은 피할 날');
    }
    for (let i = 1; i < r.best.length; i++) assert.ok(r.best[i - 1].score >= r.best[i].score);
    assert.ok(r.best.every((x) => !x.avoid));
  }
  // 내 일지(辰)와 충하는 戌일은 이사에서 피할 날
  const day = evaluateDay('move', 2026, 11, 20, { profile: me, saju: undefined });
  assert.equal(day.avoid, false); // saju 없이는 개인 충을 따지지 않는다
  const full = findDays('move', { profile: me, days: 30, from });
  assert.ok(full.avoid.some((x) => x.flags.some((f) => f.includes('일지와 충'))));
  // 생년월일이 없어도 동작
  const g = findDays('wedding', { days: 30, from });
  assert.equal(g.personal, false);
  assert.ok(g.best.length > 0);
  // 손 없는 날은 이사에서 가점
  const son = g.all.find((x) => x.info.sonEmpty);
  assert.ok(son.items.some((i) => i.label === '손 없는 날' && i.delta === 10) || son.key !== 'move');
});

// ── 보관함 ──
// Node에는 localStorage가 없으므로 메모리로 흉내 낸다
globalThis.localStorage = (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() };
})();

const storage = await import('../public/assets/js/core/storage.js');
const vault = await import('../public/assets/js/core/vault.js');

test('보관함: 저장·조회·메모·삭제와 개수 제한', () => {
  localStorage.clear();
  const a = storage.addVaultItem(vault.ichingItem([9, 7, 7, 7, 7, 7], '  이직해도 될까?  '));
  assert.ok(a.ok);
  assert.equal(a.item.title, '1. 중천건 → 44. 천풍구'); // 초효가 변하는 건괘 → 구괘
  assert.equal(a.item.data.question, '이직해도 될까?');
  const b = storage.addVaultItem(vault.tarotItem([{ card: { n: 0, ko: '바보' }, reversed: false }, { card: { n: 6, ko: '연인' }, reversed: true }, { card: { n: 17, ko: '별' }, reversed: false }]));
  assert.equal(b.item.title, '바보 · 연인(역) · 별');
  const list = storage.loadVault();
  assert.equal(list.length, 2);
  assert.ok(list[0].created >= list[1].created); // 최신순
  storage.updateVaultItem(a.item.id, { memo: '다음 달에 다시 보기' });
  assert.equal(storage.getVaultItem(a.item.id).memo, '다음 달에 다시 보기');
  storage.deleteVaultItem(a.item.id);
  assert.equal(storage.getVaultItem(a.item.id), null);
  assert.equal(storage.loadVault().length, 1);
  // 가득 차면 거절한다
  localStorage.clear();
  for (let i = 0; i < storage.VAULT_LIMIT; i++) assert.ok(storage.addVaultItem({ kind: 'tarot', title: `t${i}`, memo: '', data: {} }).ok);
  const full = storage.addVaultItem({ kind: 'tarot', title: 'x', memo: '', data: {} });
  assert.deepEqual([full.ok, full.reason], [false, 'full']);
  // 손상된 저장값은 무시한다
  localStorage.setItem('zodigram.vault.v1', '{깨진 값');
  assert.deepEqual(storage.loadVault(), []);
});

test('보관함: 궁합·택일 항목, 중복 확인, D-day', () => {
  const me = { name: '나', year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울' };
  const other = { id: 'p1', name: '민수', relation: '친구', year: 1988, month: 11, day: 3, hour: 7, minute: 0, place: '부산' };
  const r = computeMatch(me, other);
  const m = vault.matchItem(me, other, r);
  assert.equal(m.title, '나 × 민수');
  assert.equal(m.data.total, r.total);
  assert.ok(m.data.east.items.length <= 4 && m.data.west.items.length <= 4);
  const found = findDays('move', { profile: me, days: 30, from: { year: 2026, month: 11, day: 18 } });
  const x = found.best[0];
  const d = vault.dayItem('move', x, '');
  assert.equal(d.data.score, x.score);
  assert.ok(d.title.includes('이사'));
  assert.equal(vault.hasDayItem([d], 'move', x, ''), true);
  assert.equal(vault.hasDayItem([d], 'wedding', x, ''), false);
  assert.equal(vault.hasDayItem([d], 'move', x, '민수'), false);
  const today = { year: 2026, month: 11, day: 18 };
  assert.equal(vault.daysUntil(2026, 11, 18, today), 0);
  assert.equal(vault.daysUntil(2026, 12, 1, today), 13);
  assert.equal(vault.daysUntil(2026, 11, 10, today), -8);
});

test('내 기록: 연속 방문, 점수 흐름', () => {
  localStorage.clear();
  const today = { year: 2026, month: 11, day: 18 };
  for (const k of ['2026-11-14', '2026-11-16', '2026-11-17', '2026-11-18']) storage.recordVisit(k);
  storage.recordVisit('2026-11-18'); // 같은 날 두 번 기록해도 한 번
  const visits = storage.loadVisits();
  assert.equal(visits.length, 4);
  assert.equal(vault.streak(visits, today), 3); // 16·17·18일 (15일이 비어 끊김)
  assert.equal(vault.streak(['2026-11-16', '2026-11-17'], today), 2); // 오늘 기록 전이면 어제부터
  assert.equal(vault.streak([], today), 0);
  assert.equal(vault.monthVisits(visits, 2026, 11), 4);
  const me = { year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울' };
  const hist = vault.scoreHistory(me, today, 30);
  assert.equal(hist.length, 30);
  assert.equal(`${hist[29].month}-${hist[29].day}`, '11-18');
  assert.equal(`${hist[0].month}-${hist[0].day}`, '10-20');
  for (const h of hist) assert.ok(h.total >= 50 && h.total <= 100);
  const s = vault.summarize(hist);
  assert.ok(s.best.total >= s.avg && s.worst.total <= s.avg);
  assert.deepEqual(vault.scoreHistory(null, today), []);
  assert.equal(vault.summarize([]), null);
});

import { isNative, publicUrl, apiBase, isShareCancel, shareData, SITE_ORIGIN } from '../public/assets/js/core/env.js';
import worker from '../worker/index.js';

test('앱 환경: 웹과 앱에서 공유 주소·서버 주소가 달라진다', async () => {
  globalThis.location = { origin: 'https://example.test', pathname: '/zodigram/' };
  assert.equal(isNative(), false);
  assert.equal(publicUrl(), 'https://example.test/zodigram/');
  assert.equal(apiBase(), '');
  const calls = [];
  globalThis.Capacitor = { isNativePlatform: () => true, Plugins: { Share: { share: async (d) => { calls.push(d); return {}; } } } };
  assert.equal(isNative(), true);
  assert.equal(publicUrl(), `${SITE_ORIGIN}/`);
  assert.equal(apiBase(), `${SITE_ORIGIN}/`);
  await shareData({ title: 't', text: 'x', url: 'https://u' });
  assert.deepEqual(calls[0], { title: 't', text: 'x', url: 'https://u', dialogTitle: 't' });
  delete globalThis.Capacitor;
  assert.equal(shareData({ title: 't' }), null); // 공유 수단이 없으면 null
  assert.ok(isShareCancel(new Error('Share canceled')));
  assert.ok(isShareCancel({ name: 'AbortError' }));
  assert.ok(!isShareCancel(new Error('boom')));
});

test('서버 CORS: 앱 출처에서만 카드 업로드를 허용한다', async () => {
  const env = { ASSETS: { fetch: async () => new Response('asset') } };
  const pre = (origin) => worker.fetch(new Request('https://x/api/card', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST' } }), env);
  const ios = await pre('capacitor://localhost');
  assert.equal(ios.status, 204);
  assert.equal(ios.headers.get('access-control-allow-origin'), 'capacitor://localhost');
  assert.match(ios.headers.get('access-control-allow-headers'), /x-card-kind/);
  assert.equal((await pre('https://localhost')).headers.get('access-control-allow-origin'), 'https://localhost');
  assert.equal((await pre('https://evil.example')).headers.get('access-control-allow-origin'), null);
  // 업로드 응답에도 붙는다(저장소가 없어 503이어도)
  const post = (origin) => worker.fetch(new Request('https://x/api/card', { method: 'POST', headers: { origin }, body: 'x' }), env);
  assert.equal((await post('https://localhost')).headers.get('access-control-allow-origin'), 'https://localhost');
  assert.equal((await post('https://evil.example')).headers.get('access-control-allow-origin'), null);
  assert.equal((await worker.fetch(new Request('https://x/api/card'), env)).status, 405);
});

test('아침 알림: 설정 정리와 예약 목록', async () => {
  const { normalizeNotify, parseTime, buildSchedule, NOTIFY_DAYS } = await import('../public/assets/js/core/notify.js');
  assert.deepEqual(normalizeNotify(null), { on: false, hour: 8, minute: 0 });
  assert.deepEqual(normalizeNotify({ on: true, hour: 25, minute: 7 }), { on: true, hour: 8, minute: 7 });
  assert.deepEqual(parseTime('07:30'), { hour: 7, minute: 30 });
  assert.equal(parseTime('24:00'), null);
  const profile = { year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울' };
  const on = { on: true, hour: 8, minute: 0 };
  assert.deepEqual(buildSchedule(profile, { ...on, on: false }), []);
  assert.deepEqual(buildSchedule(null, on), []);
  // 오전 7시에 켜면 오늘 8시부터, 9시에 켜면 내일부터 시작한다
  const early = buildSchedule(profile, on, new Date(2026, 5, 10, 7, 0));
  const late = buildSchedule(profile, on, new Date(2026, 5, 10, 9, 0));
  assert.equal(early.length, NOTIFY_DAYS);
  assert.equal(late.length, NOTIFY_DAYS - 1);
  assert.equal(new Date(early[0].at).getDate(), 10);
  assert.equal(new Date(late[0].at).getDate(), 11);
  assert.deepEqual(early.map((n) => n.id), early.map((_, i) => i + 1));
  for (const n of early) {
    assert.match(n.title, /^오늘의 운세 (\d+)점$/);
    const score = +n.title.match(/\d+/)[0];
    assert.ok(score >= 50 && score <= 100);
    assert.ok(n.body.length > 10);
    assert.ok(!n.body.includes('[object'), '인용구가 글자로 바뀌어야 한다');
    assert.ok(!n.body.includes('undefined'));
  }
  // 날마다 한마디가 겹치지 않는다
  assert.equal(new Set(early.map((n) => n.body)).size, early.length);
});

test('백업·복원: 내보내고 되가져오며 잘못된 내용은 거부한다', async () => {
  const { createBackup, parseBackup, restoreBackup } = await import('../public/assets/js/core/backup.js');
  const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
  const a = mem();
  a.setItem('zodigram.profile.v1', JSON.stringify({ year: 1990, month: 5, day: 15, name: '나' }));
  a.setItem('zodigram.people.v1', JSON.stringify([{ id: 'p1', name: '친구', year: 1992, month: 1, day: 2 }]));
  a.setItem('zodigram.vault.v1', JSON.stringify([{ id: 'v1' }, { id: 'v2' }]));
  a.setItem('zodigram.visits.v1', 'not json'); // 망가진 항목은 건너뛴다
  const code = createBackup(a, new Date('2026-11-19T00:00:00Z'));
  const parsed = parseBackup(code);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.counts, { profile: 1, people: 1, vault: 2 });
  assert.equal(parsed.data.visits, undefined);
  const b = mem();
  assert.ok(restoreBackup(code, b).ok);
  assert.deepEqual(JSON.parse(b.getItem('zodigram.vault.v1')), [{ id: 'v1' }, { id: 'v2' }]);
  assert.equal(b.getItem('zodigram.visits.v1'), null);
  for (const bad of ['', 'abc', '{}', JSON.stringify({ app: 'other', version: 1, data: {} }), JSON.stringify({ app: 'zodigram', version: 9, data: { vault: [] } }), JSON.stringify({ app: 'zodigram', version: 1, data: { vault: 'x' } })]) {
    assert.equal(parseBackup(bad).ok, false, bad);
  }
  assert.equal(parseBackup(JSON.stringify({ app: 'zodigram', version: 9, data: { vault: [] } })).reason, 'version');
});

test('신년운세: 월별 12개, 좋은 달·조심할 달, 주제', async () => {
  const { getNewYear, defaultNewYear, clampYear } = await import('../public/assets/js/core/newyear.js');
  assert.equal(defaultNewYear(new Date('2026-11-19T03:00:00Z')), 2027);
  assert.equal(defaultNewYear(new Date('2026-03-01T03:00:00Z')), 2026);
  assert.equal(clampYear('2030'), 2030);
  assert.equal(clampYear('abc', new Date('2026-03-01T03:00:00Z')), 2026);
  const r = getNewYear({ year: 1990, month: 5, day: 15, hour: 10, minute: 30, place: '서울', gender: 'f' }, 2027);
  assert.equal(r.year, 2027);
  assert.equal(r.months.length, 12);
  assert.ok(r.months.every((m) => m.total >= 50 && m.total <= 100));
  assert.equal(r.best.length, 3);
  assert.equal(r.careful.length, 2);
  const min = Math.min(...r.months.map((m) => m.total)), max = Math.max(...r.months.map((m) => m.total));
  assert.ok(r.best.some((m) => m.total === max));
  assert.ok(r.careful.some((m) => m.total === min));
  assert.equal(r.topics.length, 4);
  assert.ok(r.keywords.length >= 2 && r.keywords.every((k) => k && !k.includes('undefined')));
  assert.ok(r.yr.total >= 50 && r.yr.total <= 100);
});

test('오늘의 행운: 같은 날·같은 사람은 같고 값이 올바르다', async () => {
  const { getLucky } = await import('../public/assets/js/core/lucky.js');
  const p = { year: 1990, month: 5, day: 15 };
  const t = new Date('2026-11-19T03:00:00Z');
  const a = getLucky(p, t), b = getLucky(p, t);
  assert.deepEqual(a, b);
  assert.ok(a.numbers.length === 2 && a.numbers[0] < a.numbers[1] && a.numbers.every((n) => n >= 1 && n <= 45));
  assert.match(a.color.hex, /^#[0-9A-F]{6}$/i);
  assert.ok(a.direction && a.time.name && a.food);
  const days = new Set();
  for (let i = 0; i < 20; i++) days.add(JSON.stringify(getLucky(p, new Date(t.getTime() + i * 86400000))));
  assert.ok(days.size >= 15, '날마다 달라야 한다');
  assert.ok(getLucky(null, t).color.name); // 생년월일이 없어도 동작
});

test('한 장 뽑기: 도감 집계와 연속 일수, 하루 한 장 저장', async () => {
  const { collection, drawStreak } = await import('../public/assets/js/core/draw.js');
  const draws = { '2026-11-17': { n: 3 }, '2026-11-18': { n: 3 }, '2026-11-19': { n: 21 }, '2026-11-01': { n: 99 } };
  const c = collection(draws);
  assert.equal(c.size, 22);
  assert.equal(c.owned, 2);
  assert.equal(c.counts[3], 2);
  assert.equal(c.total, 3); // 범위 밖 번호는 세지 않는다
  assert.equal(drawStreak(draws, '2026-11-19'), 3);
  assert.equal(drawStreak(draws, '2026-11-20'), 3); // 오늘 아직 안 뽑았으면 어제까지
  assert.equal(drawStreak({}, '2026-11-19'), 0);
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const { saveDraw, loadDraws } = await import('../public/assets/js/core/storage.js');
  saveDraw('2026-11-19', { n: 5, reversed: true });
  const again = saveDraw('2026-11-19', { n: 9, reversed: false });
  assert.deepEqual(again, { n: 5, reversed: true }); // 같은 날 다시 뽑아도 바뀌지 않는다
  assert.deepEqual(loadDraws()['2026-11-19'], { n: 5, reversed: true });
});
