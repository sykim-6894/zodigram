// 타로 카드 앞면의 선 그림(48×48). 이미지 파일 없이 SVG로 그린다.
const C = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const P = (d) => `<path d="${d}"/>`;

const G = {
  fool: C(34, 12, 5) + P('M4 36H26l12 8M18 36l4-12 4 12'),
  magician: C(19, 12, 5) + C(29, 12, 5) + P('M24 22V44M10 36H38'),
  priestess: P('M10 8V42M38 8V42M27 17a7 7 0 1 0 0 14a5.5 5.5 0 1 1 0-14z'),
  empress: C(24, 19, 9) + P('M24 28V42M18 36H30'),
  emperor: P('M12 18H36V40H12ZM16 8l8 8 8-8M18 28H30'),
  hierophant: P('M24 6V42M16 14H32M18 21H30M20 28H28'),
  lovers: C(19, 28, 9) + C(29, 28, 9) + P('M24 6l4 7h-8z'),
  chariot: P('M10 18H38V32H10ZM24 8V18') + C(16, 38, 4) + C(32, 38, 4),
  strength: C(21, 10, 3) + C(27, 10, 3) + C(24, 30, 10) + P('M20 28h.5M27.5 28h.5M21 34c2 1.5 4 1.5 6 0'),
  hermit: P('M14 6V44M20 16H28V28H20ZM24 10V16M24 20v4'),
  wheel: C(24, 24, 16) + C(24, 24, 4) + P('M24 8V20M24 28V40M8 24H20M28 24H40M12.7 12.7l8.5 8.5M26.8 26.8l8.5 8.5M35.3 12.7l-8.5 8.5M21.2 26.8l-8.5 8.5'),
  justice: P('M24 8V42M12 14H36M12 14l-5 12h10zM36 14l-5 12h10zM16 42H32'),
  hanged: P('M10 8H38M24 8V30M24 16l-7 6M24 16l7 6') + C(24, 35, 5),
  death: P('M6 40H42M14 40a10 10 0 0 1 20 0M10 40V22M38 40V22M24 24v-4M17 26l-2-3M31 26l2-3'),
  temperance: P('M8 10h11l-2 11h-7zM29 27h11l-2 11h-7zM16 22c5 2 9 3 15 5'),
  devil: P('M13 8c2 9 6 12 11 12s9-3 11-12M24 20V31') + C(18, 37, 3.5) + C(30, 37, 3.5) + P('M21.5 37h5'),
  tower: P('M17 44V16H29V44M15 16H31M19 10V16M27 10V16M39 4l-6 10h5l-6 11M21 26h4v6h-4z'),
  star: P('M24 4l3 11 11 3-11 3-3 11-3-11-11-3 11-3zM6 44c6-3 12 3 18 0s12-3 18 0') + C(9, 36, 1.5) + C(40, 34, 1.5),
  moon: P('M30 6a17 17 0 1 0 0 34a13 13 0 1 1 0-34zM12 44h4M32 44h4'),
  sun: C(24, 24, 8) + P('M24 5V11M24 37V43M5 24H11M37 24H43M10.6 10.6l4.2 4.2M33.2 33.2l4.2 4.2M37.4 10.6l-4.2 4.2M14.8 33.2l-4.2 4.2'),
  judgement: P('M8 18l22-9v18zM30 18h8M14 44V34M24 44V30M34 44V34') + C(14, 31, 2) + C(24, 27, 2) + C(34, 31, 2),
  world: '<ellipse cx="24" cy="24" rx="12" ry="18"/>' + C(24, 24, 3) + P('M6 6h3M39 6h3M6 42h3M39 42h3'),
};

export function glyph(name, cls = '') {
  return `<svg class="glyph ${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[name] || ''}</svg>`;
}

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
export const roman = (n) => ROMAN[n];

/** 괘 그림: lines는 아래→위. changing은 변효 인덱스 배열 */
export function hexagramSvg(lines, changing = [], cls = '') {
  const w = 72, h = 7, gap = 6;
  const rows = [];
  for (let i = 5; i >= 0; i--) {
    const y = (5 - i) * (h + gap);
    const mark = changing.includes(i) ? `<circle class="chg" cx="${w + 9}" cy="${y + h / 2}" r="2.5"/>` : '';
    if (lines[i] === null || lines[i] === undefined) {
      rows.push(`<rect class="empty" x="0" y="${y + h / 2 - 0.5}" width="${w}" height="1"/>`);
      continue;
    }
    rows.push(lines[i]
      ? `<rect x="0" y="${y}" width="${w}" height="${h}"/>${mark}`
      : `<rect x="0" y="${y}" width="${w * 0.42}" height="${h}"/><rect x="${w * 0.58}" y="${y}" width="${w * 0.42}" height="${h}"/>${mark}`);
  }
  const H = 6 * h + 5 * gap;
  return `<svg class="hexagram ${cls}" viewBox="0 0 ${w + 14} ${H}" width="${w + 14}" height="${H}" aria-hidden="true">${rows.join('')}</svg>`;
}

/** 엽전(앞면 3 = 채움, 뒷면 2 = 테두리) */
export function coinSvg(value) {
  const heads = value === 3;
  return `<svg class="coin ${heads ? 'heads' : 'tails'}" viewBox="0 0 40 40" aria-label="${heads ? '앞면' : '뒷면'}"><circle cx="20" cy="20" r="18"/><rect x="15" y="15" width="10" height="10"/></svg>`;
}
