// 택일(擇日) 데이터. 건제십이신의 뜻과 목적별 점수는 옛 택일서의 일반적인 설명을 바탕으로 새로 정리했다.
// 책마다 다르게 적힌 부분이 있어, 화면에서도 참고용이라고 안내한다.

export const PURPOSES = {
  move: { ko: '이사', desc: '새 집에 들어가는 날', son: 10, merc: 0, waxing: 0, clash: 12, zclash: 8, avoidClash: true,
    note: '손이 있는 방향으로의 이사는 예부터 피했어요. 손 없는 날은 방향 걱정이 없어서 가장 많이 고릅니다.' },
  wedding: { ko: '결혼', desc: '예식을 올리는 날', son: 6, merc: 0, waxing: 0, clash: 12, zclash: 8, avoidClash: true,
    note: '예식은 주말이 현실적이에요. 두 사람의 일지가 충하는 날은 추천에서 빼 두었어요.' },
  open: { ko: '개업', desc: '가게나 사업을 여는 날', son: 4, merc: -3, waxing: 3, clash: 12, zclash: 8, avoidClash: true,
    note: '문을 여는 일이라 "열리는 날(개)"과 "이루는 날(성)"을 높게 봤어요. 차오르는 달(음력 1~15일)에 시작하면 더 좋다고 여겨요.' },
  contract: { ko: '계약', desc: '큰 계약을 맺는 날', son: 0, merc: -6, waxing: 2, clash: 12, zclash: 8, avoidClash: true,
    note: '수성 역행 기간은 서류와 말이 꼬이기 쉬워 점수를 낮췄어요. 정(定)일과 집(執)일이 맺는 일에 좋아요.' },
  trip: { ko: '여행', desc: '먼 길을 떠나는 날', son: 0, merc: -3, waxing: 0, clash: 8, zclash: 5, avoidClash: false,
    note: '"정(定)일"은 머무는 날이라 여행에는 덜 맞고, "건"과 "개"일이 길을 떠나기 좋아요.' },
  start: { ko: '새 출발', desc: '새 일·공부·운동을 시작하는 날', son: 0, merc: -2, waxing: 3, clash: 8, zclash: 5, avoidClash: false,
    note: '새로 시작하는 일에는 "건"과 "개"일이 좋고, 차오르는 달에 시작하면 기운이 붙는다고 여겨요.' },
};
export const PURPOSE_KEYS = ['move', 'wedding', 'open', 'contract', 'trip', 'start'];

// 건제십이신: 건·제·만·평·정·집·파·위·성·수·개·폐. 월건 지지와 같은 지지의 날이 '건'이고 차례로 이어진다.
// delta: 목적별 점수 [move, wedding, open, contract, trip, start]
const D = (a) => ({ move: a[0], wedding: a[1], open: a[2], contract: a[3], trip: a[4], start: a[5] });
export const OFFICERS = [
  { ko: '건', hanja: '建', note: '시작과 출발의 기운이 서는 날', delta: D([4, 4, 4, 2, 6, 8]) },
  { ko: '제', hanja: '除', note: '묵은 것을 덜어내는 날', delta: D([4, -2, 0, 0, 2, 4]) },
  { ko: '만', hanja: '滿', note: '가득 차 풍요로운 날', delta: D([6, 8, 10, 6, 0, 4]) },
  { ko: '평', hanja: '平', note: '평평하고 무난한 날', delta: D([4, 2, 0, 2, 4, 2]) },
  { ko: '정', hanja: '定', note: '자리를 정하고 약속하는 날', delta: D([8, 10, 6, 10, -4, 6]) },
  { ko: '집', hanja: '執', note: '붙잡고 맺는 날', delta: D([0, 4, 2, 8, -6, 2]) },
  { ko: '파', hanja: '破', note: '깨지는 기운의 날, 시작하는 일은 피하는 날', delta: D([-16, -16, -16, -16, -16, -16]) },
  { ko: '위', hanja: '危', note: '위태로운 기운이 있어 조심하는 날', delta: D([-6, -4, -6, -4, -10, -4]) },
  { ko: '성', hanja: '成', note: '이루어지는 날, 큰일에 가장 좋은 날', delta: D([10, 10, 12, 10, 4, 10]) },
  { ko: '수', hanja: '收', note: '거두고 마무리하기 좋은 날', delta: D([2, 4, 4, 8, -2, 2]) },
  { ko: '개', hanja: '開', note: '열리는 날, 새 출발에 좋은 날', delta: D([8, 6, 12, 6, 8, 10]) },
  { ko: '폐', hanja: '閉', note: '닫히는 날, 시작보다 마무리에 맞는 날', delta: D([-8, -10, -12, -6, -8, -8]) },
];
