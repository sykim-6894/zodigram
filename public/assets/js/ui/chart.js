// 출생 차트 휠(SVG). 상승궁을 왼쪽(9시)에 두고 황경이 시계 반대 방향으로 커지는 전통 배치.
import { SIGNS } from '../data/western.js';

const EL = { 불: 'fire', 흙: 'earth', 공기: 'air', 물: 'water' };

export function chartWheel(natal) {
  const S = 320, c = S / 2, R1 = 152, R2 = 124, R3 = 84, RP = 104;
  const base = natal.asc ? natal.asc.lon : 0;
  const pt = (lon, r) => {
    const t = (180 + lon - base) * Math.PI / 180;
    return [c + r * Math.cos(t), c - r * Math.sin(t)];
  };
  const line = (lon, r1, r2, cls) => {
    const [x1, y1] = pt(lon, r1), [x2, y2] = pt(lon, r2);
    return `<line class="${cls}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  };
  const parts = [
    `<circle class="w-ring" cx="${c}" cy="${c}" r="${R1}"/>`,
    `<circle class="w-ring" cx="${c}" cy="${c}" r="${R2}"/>`,
    `<circle class="w-inner" cx="${c}" cy="${c}" r="${R3}"/>`,
  ];
  for (let k = 0; k < 12; k++) {
    parts.push(line(k * 30, R2, R1, 'w-div'));
    parts.push(line(k * 30, R3, R2, 'w-house'));
    const [x, y] = pt(k * 30 + 15, (R1 + R2) / 2);
    parts.push(`<text class="w-sign el-${EL[SIGNS[k].element]}" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${SIGNS[k].glyph}</text>`);
    if (natal.asc) {
      const house = ((k - natal.asc.sign) % 12 + 12) % 12 + 1;
      const [hx, hy] = pt(k * 30 + 15, R3 + 9);
      parts.push(`<text class="w-hnum" x="${hx.toFixed(1)}" y="${hy.toFixed(1)}">${house}</text>`);
    }
  }
  if (natal.asc) {
    parts.push(line(natal.asc.lon, 0, R1 + 4, 'w-axis'));
    parts.push(line(natal.asc.lon + 180, 0, R1 + 4, 'w-axis'));
    parts.push(line(natal.mc, R3, R1 + 4, 'w-axis'));
    const [ax, ay] = pt(natal.asc.lon, R1 + 12);
    parts.push(`<text class="w-lbl" x="${ax.toFixed(1)}" y="${ay.toFixed(1)}">AC</text>`);
    const [mx, my] = pt(natal.mc, R1 + 12);
    parts.push(`<text class="w-lbl" x="${mx.toFixed(1)}" y="${my.toFixed(1)}">MC</text>`);
  }
  // 행성: 겹치지 않게 8°씩 밀어 표시하고, 실제 위치에는 작은 눈금
  const sorted = natal.planets.slice().sort((a, b) => a.lon - b.lon);
  // 가까이 붙은 행성은 바깥·안쪽 두 줄로 번갈아 놓고, 그래도 겹치면 조금씩 민다
  let prev = -999, lane = 0;
  for (const p of sorted) {
    let shown = p.lon;
    if (shown - prev < 10) {
      lane = 1 - lane;
      if (shown - prev < 5) shown = prev + 5;
    } else lane = 0;
    prev = shown;
    parts.push(line(p.lon, R2 - 6, R2, 'w-tick'));
    const [x, y] = pt(shown, lane ? RP - 15 : RP + 3);
    parts.push(`<text class="w-planet${p.key === 'sun' || p.key === 'moon' ? ' lum' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}"><title>${p.ko} ${p.signName} ${Math.floor(p.degree)}°</title>${p.glyph}</text>`);
  }
  // 태양-달 등 개인 행성끼리의 주요 각을 안쪽에 선으로
  const pers = natal.planets.slice(0, 7);
  for (let i = 0; i < pers.length; i++) {
    for (let k = i + 1; k < pers.length; k++) {
      const sep = Math.abs(((pers[i].lon - pers[k].lon + 540) % 360) - 180);
      const kind = [[120, 'trine'], [60, 'trine'], [90, 'square'], [180, 'square']].find(([a]) => Math.abs(sep - a) <= 4);
      if (!kind) continue;
      const [x1, y1] = pt(pers[i].lon, R3), [x2, y2] = pt(pers[k].lon, R3);
      parts.push(`<line class="w-asp ${kind[1]}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`);
    }
  }
  return `<svg class="wheel" viewBox="-14 -14 ${S + 28} ${S + 28}" role="img" aria-label="출생 차트">${parts.join('')}</svg>`;
}
