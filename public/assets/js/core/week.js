// 이번 주 운세 흐름 — 오늘부터 7일의 점수. 홈의 점수와 같은 계산(동양·서양 평균)을 쓴다.
import { getToday, getEast, getWest } from './fortune.js';
import { totalScore } from './score.js';

export const WEEK_DAYS = 7;

/** 오늘부터 7일: [{ key, month, day, weekday, total, tier, tone, today }] 과 요약 */
export function getWeek(profile, now = new Date()) {
  const t0 = getToday(now).date;
  const days = [];
  for (let i = 0; i < WEEK_DAYS; i++) {
    // 오늘은 지금 시각, 나머지 날은 그날 낮 12시(한국 시간) 기준
    const at = i === 0 ? now : new Date(Date.UTC(t0.year, t0.month - 1, t0.day + i, 3, 0));
    const t = getToday(at);
    const s = totalScore(getEast(profile, at), getWest(profile, at));
    days.push({ key: t.key, year: t.date.year, month: t.date.month, day: t.date.day, weekday: t.weekday, total: s.total, tier: s.tier, tone: s.tone, today: i === 0 });
  }
  const best = days.reduce((a, d) => (d.total > a.total ? d : a));
  const worst = days.reduce((a, d) => (d.total < a.total ? d : a));
  const avg = Math.round(days.reduce((a, d) => a + d.total, 0) / days.length);
  return { days, best, worst, avg, flat: best.total - worst.total < 4 };
}
