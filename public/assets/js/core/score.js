// 오늘의 점수. 무작위가 아니라 실제로 계산된 요소들을 더하고 빼서 만든다.
// 각 항목은 { label, detail, delta } 로 남겨 "왜 이 점수인지"를 그대로 보여 준다.

const BASE = 55;
const clamp = (n) => Math.max(30, Math.min(96, Math.round(n)));

// 오늘 일진 천간이 내 일간에게 주는 십신
const TEN_GOD = { 식신: 20, 정인: 18, 정재: 18, 정관: 16, 편재: 14, 비견: 8, 편인: 4, 상관: 0, 겁재: -6, 편관: -8 };
const TEN_GOD_WHY = {
  식신: '표현과 여유가 생기는 길한 기운', 정인: '도움과 배움이 들어오는 기운', 정재: '성실함이 보상받는 기운',
  정관: '신뢰와 질서가 서는 기운', 편재: '뜻밖의 기회가 오는 기운', 비견: '동료의 힘이 보태지는 기운',
  편인: '생각은 깊어지나 결정은 느린 기운', 상관: '재치는 늘지만 말이 앞서기 쉬운 기운',
  겁재: '경쟁과 지출이 늘기 쉬운 기운', 편관: '압박과 책임이 몰리기 쉬운 기운',
};
// 지지 관계(일지·띠)
const REL = { harmony: 8, trine: 6, same: 2, neutral: 0, harm: -5, clash: -8 };
const REL_NAME = { harmony: '육합', trine: '삼합', same: '같은 기운', neutral: '무난', harm: '해(害)', clash: '충(沖)' };

// 달과 내 별자리의 각(사인 거리 0~6)
const ASPECT = { 0: 5, 1: 0, 2: 7, 3: -7, 4: 10, 5: -4, 6: -5 };
// 달이 머무는 하우스
const HOUSE = { 1: 4, 2: 2, 3: 2, 4: 0, 5: 5, 6: 0, 7: 1, 8: -3, 9: 3, 10: 4, 11: 4, 12: -4 };
// 개인일 수
const PERSONAL_DAY = { 1: 4, 2: 0, 3: 4, 4: 1, 5: 3, 6: 2, 7: -1, 8: 4, 9: -2 };
// 타로 정방향의 기운
const BRIGHT = new Set(['sun', 'star', 'world', 'wheel', 'empress', 'magician', 'chariot', 'strength', 'lovers', 'temperance']);
const HEAVY = new Set(['tower', 'death', 'devil', 'moon', 'hanged']);

function sum(items) {
  return BASE + items.reduce((a, i) => a + i.delta, 0);
}

/** 동양 점수: 일진 십신 + 일지 관계 + 띠 관계 + 오행 보완 */
export function eastScore(e) {
  const d = e.daily;
  const items = [
    { label: `일진 ${d.todayPillar.hanja} · ${d.tenGod}`, detail: TEN_GOD_WHY[d.tenGod], delta: TEN_GOD[d.tenGod] },
    { label: `내 일지와 ${REL_NAME[d.dayBranchRelation]}`, detail: '오늘의 지지와 내 일주 지지의 관계', delta: REL[d.dayBranchRelation] },
    { label: `${e.animal.name}띠와 ${REL_NAME[d.zodiacRelation]}`, detail: '오늘의 지지와 내 띠의 관계', delta: Math.round(REL[d.zodiacRelation] / 2) },
  ];
  const counts = e.saju.counts;
  const todayEl = e.todayElement.element;
  if (todayEl === e.complement.element) {
    items.push({ label: '부족한 오행이 채워짐', detail: `내게 가장 적은 ${'목화토금수'[todayEl]}의 기운이 오늘 들어옵니다`, delta: 4 });
  } else if (counts[todayEl] === Math.max(...counts) && counts[todayEl] >= 3) {
    items.push({ label: '넘치는 오행이 더해짐', detail: `이미 많은 ${'목화토금수'[todayEl]}의 기운이 오늘 더 들어옵니다`, delta: -3 });
  }
  return { score: clamp(sum(items)), items };
}

/** 서양 점수: 달의 각 + 하우스 + 개인일 수 + 오늘의 카드 */
export function westScore(w) {
  const dist = w.moon.house - 1;
  const aspectKey = Math.min(dist, 12 - dist);
  const card = w.tarot.card;
  const cardDelta = w.tarot.reversed ? -4 : BRIGHT.has(card.symbol) ? 6 : HEAVY.has(card.symbol) ? -2 : 2;
  const items = [
    { label: `달과 ${w.moon.aspect.name}`, detail: `달(${w.moon.moonSignName})과 내 별자리(${w.sign.ko}) — ${w.moon.aspect.tone}`, delta: ASPECT[aspectKey] },
    { label: `제${w.moon.house}하우스 · ${w.moon.houseInfo.area}`, detail: '달이 비추는 생활 영역', delta: HOUSE[w.moon.house] },
    { label: `개인일 수 ${w.personalDay.number}`, detail: '수비학으로 본 오늘의 리듬', delta: PERSONAL_DAY[w.personalDay.number] },
    { label: `오늘의 카드 ${card.ko}${w.tarot.reversed ? ' (역)' : ''}`, detail: (w.tarot.reversed ? card.rev : card.up).join(', '), delta: cardDelta },
  ];
  return { score: clamp(sum(items)), items };
}

const TIERS = [
  [78, '아주 좋음', '하고 싶었던 일을 밀어붙여도 좋은 날'],
  [68, '좋음', '흐름이 순한 편이니 한 걸음 더 나가 보세요'],
  [56, '보통', '무리하지 않으면 무난하게 지나가는 날'],
  [46, '조심', '서두르지 말고 한 번 더 확인하는 날'],
  [0, '쉬어 가기', '큰일은 미루고 컨디션을 챙기는 날'],
];

/** 동서양 종합 */
export function totalScore(e, w) {
  const east = eastScore(e);
  const west = westScore(w);
  const total = Math.round((east.score + west.score) / 2);
  const [, tier, advice] = TIERS.find(([min]) => total >= min);
  return { total, tier, advice, east, west, base: BASE };
}
