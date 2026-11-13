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
