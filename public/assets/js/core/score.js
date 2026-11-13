// 오늘의 점수. 무작위가 아니라 실제로 계산된 요소들을 더하고 빼서 만든다.
// 각 항목은 { label, detail, delta } 로 남겨 "왜 이 점수인지"를 그대로 보여 준다.
import { SCORE_WORDS } from '../data/score-words.js';

// 동양·서양 모두 가장 나쁜 조합이 50점, 가장 좋은 조합이 100점이 되도록 맞춘 배점표.
const EAST_BASE = 70;
const WEST_BASE = 67;
export const MIN_SCORE = 50;
export const MAX_SCORE = 100;
const clamp = (n) => Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(n)));

// 오늘 일진 천간이 내 일간에게 주는 십신
const TEN_GOD = { 식신: 17, 정인: 15, 정재: 15, 정관: 14, 편재: 12, 비견: 7, 편인: 3, 상관: 0, 겁재: -5, 편관: -7 };
const TEN_GOD_WHY = {
  식신: '표현과 여유가 생기는 길한 기운', 정인: '도움과 배움이 들어오는 기운', 정재: '성실함이 보상받는 기운',
  정관: '신뢰와 질서가 서는 기운', 편재: '뜻밖의 기회가 오는 기운', 비견: '동료의 힘이 보태지는 기운',
  편인: '생각은 깊어지나 결정은 느린 기운', 상관: '재치는 늘지만 말이 앞서기 쉬운 기운',
  겁재: '경쟁과 지출이 늘기 쉬운 기운', 편관: '압박과 책임이 몰리기 쉬운 기운',
};
// 지지 관계(일지·띠)
const REL = { harmony: 7, trine: 5, same: 2, neutral: 0, harm: -4, clash: -7 };
const ANIMAL_REL = { harmony: 4, trine: 3, same: 1, neutral: 0, harm: -2, clash: -3 };
const REL_NAME = { harmony: '육합', trine: '삼합', same: '같은 기운', neutral: '무난', harm: '해(害)', clash: '충(沖)' };

// 달과 내 별자리의 각(사인 거리 0~6)
const ASPECT = { 0: 7, 1: 0, 2: 9, 3: -9, 4: 13, 5: -5, 6: -7 };
// 달이 머무는 하우스
const HOUSE = { 1: 5, 2: 3, 3: 3, 4: 0, 5: 7, 6: 0, 7: 1, 8: -4, 9: 4, 10: 5, 11: 5, 12: -5 };
// 개인일 수
const PERSONAL_DAY = { 1: 5, 2: 0, 3: 5, 4: 1, 5: 4, 6: 3, 7: -1, 8: 5, 9: -3 };
// 타로 정방향의 기운
const BRIGHT = new Set(['sun', 'star', 'world', 'wheel', 'empress', 'magician', 'chariot', 'strength', 'lovers', 'temperance']);
const HEAVY = new Set(['tower', 'death', 'devil', 'moon', 'hanged']);

const sum = (base, items) => base + items.reduce((a, i) => a + i.delta, 0);

/** 동양 점수: 일진 십신 + 일지 관계 + 띠 관계 + 오행 보완 */
export function eastScore(e) {
  const d = e.daily;
  const items = [
    { label: `일진 ${d.todayPillar.hanja} · ${d.tenGod}`, detail: TEN_GOD_WHY[d.tenGod], delta: TEN_GOD[d.tenGod] },
    { label: `내 일지와 ${REL_NAME[d.dayBranchRelation]}`, detail: '오늘의 지지와 내 일주 지지의 관계', delta: REL[d.dayBranchRelation] },
    { label: `${e.animal.name}띠와 ${REL_NAME[d.zodiacRelation]}`, detail: '오늘의 지지와 내 띠의 관계', delta: ANIMAL_REL[d.zodiacRelation] },
  ];
  const counts = e.saju.counts;
  const todayEl = e.todayElement.element;
  if (todayEl === e.complement.element) {
    items.push({ label: '부족한 오행이 채워짐', detail: `내게 가장 적은 ${'목화토금수'[todayEl]}의 기운이 오늘 들어옵니다`, delta: 2 });
  } else if (counts[todayEl] === Math.max(...counts) && counts[todayEl] >= 3) {
    items.push({ label: '넘치는 오행이 더해짐', detail: `이미 많은 ${'목화토금수'[todayEl]}의 기운이 오늘 더 들어옵니다`, delta: -3 });
  }
  return { score: clamp(sum(EAST_BASE, items)), base: EAST_BASE, items };
}

/** 서양 점수: 달의 각 + 하우스 + 개인일 수 + 오늘의 카드 */
export function westScore(w) {
  const dist = w.moon.house - 1;
  const aspectKey = Math.min(dist, 12 - dist);
  const card = w.tarot.card;
  const cardDelta = w.tarot.reversed ? -5 : BRIGHT.has(card.symbol) ? 8 : HEAVY.has(card.symbol) ? -3 : 3;
  const items = [
    { label: `달과 ${w.moon.aspect.name}`, detail: `달(${w.moon.moonSignName})과 내 별자리(${w.sign.ko}) — ${w.moon.aspect.tone}`, delta: ASPECT[aspectKey] },
    { label: `제${w.moon.house}하우스 · ${w.moon.houseInfo.area}`, detail: '달이 비추는 생활 영역', delta: HOUSE[w.moon.house] },
    { label: `개인일 수 ${w.personalDay.number}`, detail: '수비학으로 본 오늘의 리듬', delta: PERSONAL_DAY[w.personalDay.number] },
    { label: `오늘의 카드 ${card.ko}${w.tarot.reversed ? ' (역)' : ''}`, detail: (w.tarot.reversed ? card.rev : card.up).join(', '), delta: cardDelta },
  ];
  return { score: clamp(sum(WEST_BASE, items)), base: WEST_BASE, items };
}

const TIERS = [
  // 여러 생년월일·날짜로 본 분포: 90+ 약 5%, 80+ 약 35%, 70+ 약 80%, 62 미만 약 3%
  [90, '아주 좋음', '하고 싶었던 일을 밀어붙여도 좋은 날'],
  [80, '좋음', '흐름이 순한 편이니 한 걸음 더 나가 보세요'],
  [70, '무난', '평소처럼 지내면 충분히 괜찮은 날'],
  [62, '천천히', '서두르지만 않으면 괜찮은 날'],
  [0, '쉬어 가기', '나를 돌보는 데 마음을 쓰기 좋은 날'],
];

/**
 * 동서양 종합.
 * @param avoid 같은 화면에 이미 보이는 문장들(오늘의 한마디 등). 겹치면 다음 문장을 쓴다.
 * @param seq   한마디 순번. fortune.getScore 가 "같은 등급이 나온 날의 순서"를 넘겨 등급 안에서 차례로 쓰게 한다.
 */
export function totalScore(e, w, avoid = [], seq = e.daily.dayNumber) {
  const east = eastScore(e);
  const west = westScore(w);
  const total = Math.round((east.score + west.score) / 2);
  const [, tier, advice] = TIERS.find(([min]) => total >= min);
  // 같은 등급의 날마다 다음 문장으로 넘어가므로 목록을 다 돌기 전엔 겹치지 않는다.
  // 사람마다 시작 위치를 달리해 같은 날 다른 사람과도 덜 겹치게 한다.
  const words = SCORE_WORDS[tier];
  const offset = e.saju.pillars.day.index * 7 + w.sign.index * 5;
  let idx = (seq + offset) % words.length;
  for (let i = 0; i < words.length && avoid.includes(words[idx].q); i++) idx = (idx + 1) % words.length;
  return { total, tier, advice, message: words[idx], east, west };
}
