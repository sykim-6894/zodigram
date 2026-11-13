// 주역 점: 동전 세 개를 여섯 번 던지는 척전법(擲錢法).
// 앞면 3, 뒷면 2 → 합 6 노음(변효), 7 소양, 8 소음, 9 노양(변효)
import { hexagramByLines } from '../data/iching.js';

export function tossLine(random) {
  const coins = [0, 1, 2].map(() => (random() < 0.5 ? 3 : 2));
  return { coins, value: coins.reduce((a, b) => a + b, 0) };
}

/** 여섯 번 던진 값(아래→위)으로 본괘·지괘 계산 */
export function readCast(values) {
  const primary = values.map((v) => (v === 7 || v === 9 ? 1 : 0));
  const changing = values.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0);
  const relating = values.map((v, i) => (changing.includes(i) ? 1 - primary[i] : primary[i]));
  return {
    values,
    changing,
    primary: hexagramByLines(primary),
    relating: changing.length ? hexagramByLines(relating) : null,
  };
}

export const LINE_NAMES = ['초효', '이효', '삼효', '사효', '오효', '상효'];
