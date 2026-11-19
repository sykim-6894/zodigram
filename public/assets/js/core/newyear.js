// 신년운세 — 한 해를 월별 흐름과 주제로 한눈에 보는 리포트.
// 새로 계산하지 않고 연운·월운·주제별 운세를 그 해 기준으로 모아서 정리한다.
import { getYear, getMonth } from './period.js';
import { getTopics } from './topics.js';
import { todayKst } from './astro.js';

/** 지금 보여 줄 신년운세의 해: 11월부터는 다음 해, 그 전에는 올해 */
export function defaultNewYear(now = new Date()) {
  const t = todayKst(now);
  return t.month >= 11 ? t.year + 1 : t.year;
}

/** 해를 정수로 고르고 지원 범위(1901~2099) 안으로 맞춘다 */
export function clampYear(y, now = new Date()) {
  const n = Number.parseInt(y, 10);
  return Number.isInteger(n) && n >= 1901 && n <= 2099 ? n : defaultNewYear(now);
}

export function getNewYear(profile, year) {
  const at = new Date(Date.UTC(year, 5, 15, 3)); // 그 해 6월 중순(한국 낮 12시)
  const yr = getYear(profile, at);
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const r = getMonth(profile, at, year, m);
    months.push({ month: m, total: r.total, tier: r.tier, tone: r.tone });
  }
  const ranked = [...months].sort((a, b) => b.total - a.total || a.month - b.month);
  const best = ranked.slice(0, 3).sort((a, b) => a.month - b.month);
  const careful = ranked.slice(-2).sort((a, b) => a.month - b.month);
  const topics = getTopics(profile, 'year', at);
  const topicList = Object.entries(topics).map(([key, t]) => ({ key, ko: t.ko, hanja: t.hanja, total: t.total, head: t.head }));
  const topTopic = [...topicList].sort((a, b) => b.total - a.total)[0];
  const keywords = [yr.eastView.title, yr.westView.cycle.title, `${topTopic.ko}운이 가장 좋은 해`].filter(Boolean);
  return { year, yr, months, best, careful, topics: topicList, topTopic, keywords };
}
