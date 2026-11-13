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
