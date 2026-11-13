// node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayPillar, computeSaju, tenGod, branchRelation } from '../public/assets/js/core/saju.js';
import { solarTermsOfYear } from '../public/assets/js/core/astro.js';
import { HEXAGRAMS } from '../public/assets/js/data/iching.js';
import { readCast } from '../public/assets/js/core/iching.js';
import { sunSign, lifePath } from '../public/assets/js/core/western.js';
import { getToday, getEast, getWest } from '../public/assets/js/core/fortune.js';

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
    const raw = s.base + part.items.reduce((a, i) => a + i.delta, 0);
    assert.equal(part.score, Math.max(30, Math.min(96, raw)));
  }
  assert.equal(s.total, Math.round((s.east.score + s.west.score) / 2));
  const later = new Date('2026-11-13T12:00:00Z');
  assert.equal(totalScore(getEast(p, later), getWest(p, later)).total, s.total);
  assert.ok(s.tier && s.advice);
});
