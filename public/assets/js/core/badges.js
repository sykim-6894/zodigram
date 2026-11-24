// 출석 배지 — 방문·뽑기·보관 기록으로 정해지고, 따로 저장하지 않는다(기록이 있으면 늘 다시 계산된다).
import { collection } from './draw.js';

/** 날짜 문자열(YYYY-MM-DD) 목록에서 가장 길게 이어진 날 수 */
export function longestRun(keys) {
  const days = [...new Set(keys || [])].filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .map((k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; })
    .sort((a, b) => a - b);
  let best = 0, run = 0;
  days.forEach((d, i) => { run = i && d === days[i - 1] + 1 ? run + 1 : 1; if (run > best) best = run; });
  return best;
}

/** 배지 계산에 쓰는 수치 */
export function badgeStats({ visits = [], draws = {}, vault = [], people = [] } = {}) {
  const col = collection(draws);
  return {
    visitDays: new Set(visits).size,
    visitRun: longestRun(visits),
    drawRun: longestRun(Object.keys(draws)),
    owned: col.owned,
    size: col.size,
    saved: vault.length,
    matches: vault.filter((x) => x.kind === 'match').length,
    people: people.length,
  };
}

// [id, 한자, 이름, 설명, 수치 이름, 목표]
const DEFS = [
  ['first', '初', '첫걸음', '처음으로 찾아왔어요', 'visitDays', 1],
  ['run3', '三', '사흘 연속', '3일 연속으로 찾아왔어요', 'visitRun', 3],
  ['run7', '七', '이레 연속', '7일 연속으로 찾아왔어요', 'visitRun', 7],
  ['run30', '月', '한 달 연속', '30일 연속으로 찾아왔어요', 'visitRun', 30],
  ['days30', '常', '단골', '서른 날을 찾아왔어요', 'visitDays', 30],
  ['days100', '友', '오랜 벗', '백 날을 찾아왔어요', 'visitDays', 100],
  ['draw1', '牌', '첫 한 장', '오늘의 한 장을 처음 뽑았어요', 'owned', 1],
  ['drawRun7', '運', '이레의 한 장', '7일 연속으로 한 장을 뽑았어요', 'drawRun', 7],
  ['dex11', '半', '도감 절반', '카드 11장을 모았어요', 'owned', 11],
  ['dex22', '全', '도감 완성', '카드 22장을 모두 모았어요', 'owned', 22],
  ['save1', '藏', '첫 저장', '결과를 처음 보관함에 담았어요', 'saved', 1],
  ['save10', '庫', '기록가', '보관함에 열 개를 담았어요', 'saved', 10],
  ['people1', '緣', '첫 인연', '함께 볼 사람을 저장했어요', 'people', 1],
  ['match1', '合', '궁합 보관', '궁합 결과를 보관함에 담았어요', 'matches', 1],
];

/** 배지 목록: { id, mark, name, desc, got, now, goal } */
export function badgeList(stats) {
  return DEFS.map(([id, mark, name, desc, key, goal]) => {
    const now = Math.min(stats[key] || 0, goal);
    return { id, mark, name, desc, got: now >= goal, now, goal };
  });
}
