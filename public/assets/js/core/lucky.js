// 오늘의 행운 아이템 — 날짜(와 생년월일)로 정해지는 색·숫자·방향·시간·음식. 같은 날 같은 사람에게는 늘 같다.
import { getToday } from './fortune.js';
import { rng, pick } from './seed.js';
import { LUCKY_COLORS, LUCKY_DIRECTIONS, LUCKY_TIMES, LUCKY_FOODS } from '../data/lucky.js';

export function getLucky(profile, now = new Date()) {
  const key = getToday(now).key;
  const who = profile && profile.year ? `${profile.year}-${profile.month}-${profile.day}` : 'anon';
  const r = rng(`lucky|${key}|${who}`);
  const [colorName, colorHex] = pick(LUCKY_COLORS, r);
  const a = 1 + Math.floor(r() * 45);
  let b = 1 + Math.floor(r() * 45);
  if (b === a) b = (a % 45) + 1;
  const [timeName, timeRange] = pick(LUCKY_TIMES, r);
  return {
    color: { name: colorName, hex: colorHex },
    numbers: [a, b].sort((x, y) => x - y),
    direction: pick(LUCKY_DIRECTIONS, r),
    time: { name: timeName, range: timeRange },
    food: pick(LUCKY_FOODS, r),
  };
}
