// 오늘의 운세를 1080×1350 이미지 카드로 그려 공유하거나 저장한다. (외부 라이브러리 없이 Canvas)
import { getToday, getEast, getWest, getDailyHexagram } from '../core/fortune.js';
import { totalScore } from '../core/score.js';

const W = 1080, H = 1350, PAD = 92;
const C = {
  paper: '#F4F0E8', paper2: '#ECE6DA', ink: '#1E1C19', ink2: '#57524A', ink3: '#8C8577', rule: '#D6CDBD',
  east: '#A33B27', west: '#2B4664',
};
const SERIF = '"Noto Serif KR", "Batang", serif';
const SANS = '"Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif';
const SITE = 'zodigram.ksy2202.workers.dev';

/** 띄어쓰기 단위로 줄바꿈(한국어 keep-all). 한 단어가 너무 길면 글자 단위로 자른다. */
function wrap(ctx, text, maxW, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  const push = (l) => { if (lines.length < maxLines) lines.push(l); };
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width <= maxW) { line = t; continue; }
    if (line) push(line);
    line = w;
    while (ctx.measureText(line).width > maxW) {
      let i = line.length;
      while (i > 1 && ctx.measureText(line.slice(0, i)).width > maxW) i--;
      push(line.slice(0, i));
      line = line.slice(i);
    }
  }
  if (line) push(line);
  const overflow = lines.join(' ').replace(/\s/g, '').length < text.replace(/\s/g, '').length;
  if (overflow && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.replace(/[\s,.]+$/, '')}…`;
  }
  return lines;
}

function text(ctx, str, x, y, font, color, align = 'left') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

function rule(ctx, y, weight = 1, color = C.ink) {
  ctx.fillStyle = color;
  ctx.fillRect(PAD, y, W - PAD * 2, weight);
}

function seal(ctx, x, y, ch, color, label) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 46, 46);
  text(ctx, ch, x + 23, y + 34, `600 27px ${SERIF}`, C.paper, 'center');
  text(ctx, label, x + 62, y + 32, `500 25px ${SANS}`, C.ink2);
}

/** 단락: 반환값은 다음 y */
function block(ctx, y, { side, kicker, title, body }) {
  seal(ctx, PAD, y, side === 'east' ? '東' : '西', side === 'east' ? C.east : C.west, side === 'east' ? '동양' : '서양');
  y += 92;
  if (kicker) { text(ctx, kicker, PAD, y, `400 24px ${SANS}`, C.ink3); y += 72; }
  ctx.font = `600 50px ${SERIF}`;
  for (const l of wrap(ctx, title, W - PAD * 2, 2)) { text(ctx, l, PAD, y, `600 50px ${SERIF}`, C.ink); y += 66; }
  y += 6;
  ctx.font = `400 29px ${SANS}`;
  for (const l of wrap(ctx, body, W - PAD * 2, 3)) { text(ctx, l, PAD, y, `400 29px ${SANS}`, C.ink2); y += 46; }
  return y;
}

function cardContent(profile) {
  const today = getToday();
  const t = today.date;
  const l = today.lunar;
  const head = `${t.year}. ${t.month}. ${t.day}. ${today.weekday}요일 · 음력 ${l.leap ? '윤' : ''}${l.month}. ${l.day}. · ${today.pillar.hanja}일`;
  if (profile) {
    const e = getEast(profile);
    const w = getWest(profile);
    const sc = totalScore(e, w);
    return {
      head,
      score: { total: sc.total, tier: sc.tier, east: sc.east.score, west: sc.west.score },
      greet: profile.name ? `${profile.name} 님의 오늘` : '오늘의 운세',
      east: { side: 'east', kicker: `오늘의 일진 ${e.daily.todayPillar.hanja} · ${e.daily.tenGod} · ${e.animal.name}띠`, title: e.daily.title, body: e.daily.text },
      west: { side: 'west', kicker: `${w.sign.ko} · 달이 ${w.moon.moonSignName}에 · 오늘의 카드 ${w.tarot.card.ko}${w.tarot.reversed ? '(역)' : ''}`, title: `${w.moon.houseInfo.area}에 빛이 듭니다`, body: w.moon.houseInfo.text },
      quote: today.eastQuote,
    };
  }
  const hex = getDailyHexagram(null);
  return {
    head,
    greet: '오늘의 운세',
    east: { side: 'east', kicker: `오늘의 괘 · ${hex.num}. ${hex.fullName} ${hex.hanja}`, title: hex.keyword, body: hex.text },
    west: { side: 'west', kicker: `오늘의 달 · ${today.moon.name} ${Math.round(today.moon.illumination * 100)}%`, title: today.westQuote.text, body: today.westQuote.src },
    quote: today.eastQuote,
  };
}

export async function drawTodayCard(profile) {
  const c = cardContent(profile);
  const all = JSON.stringify(c) + 'Zodigram별과괘東西동양서양…·점0123456789';
  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load(`600 50px ${SERIF}`, all),
      document.fonts.load(`400 34px ${SERIF}`, all),
      document.fonts.load(`400 29px ${SANS}`, all),
      document.fonts.load(`500 25px ${SANS}`, all),
    ]).catch(() => {});
  }

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);

  // 머리
  text(ctx, 'Zodigram', PAD, 150, `600 60px ${SERIF}`, C.ink);
  ctx.font = `600 60px ${SERIF}`;
  const bw = ctx.measureText('Zodigram').width;
  text(ctx, '별과 괘', PAD + bw + 22, 150, `400 30px ${SERIF}`, C.ink3);
  rule(ctx, 186, 3);
  text(ctx, c.head, PAD, 232, `400 25px ${SANS}`, C.ink2);
  rule(ctx, 254, 1.5);
  text(ctx, c.greet, PAD, 316, `400 28px ${SERIF}`, C.ink2);
  if (c.score) {
    // 오른쪽: 종합 점수 (예: 52점 보통)
    ctx.font = `400 22px ${SANS}`;
    const tierW = ctx.measureText(c.score.tier).width;
    text(ctx, c.score.tier, W - PAD, 316, `500 22px ${SANS}`, C.ink2, 'right');
    ctx.font = `600 64px ${SERIF}`;
    text(ctx, '점', W - PAD - tierW - 14, 316, `400 26px ${SERIF}`, C.ink2, 'right');
    text(ctx, String(c.score.total), W - PAD - tierW - 46, 316, `600 64px ${SERIF}`, C.ink, 'right');
  }

  let y = block(ctx, 350, c.east);
  rule(ctx, y + 4, 1, C.rule);
  y = block(ctx, y + 44, c.west);

  // 한마디
  const qy = Math.max(y + 24, H - 250);
  rule(ctx, qy, 1.5);
  ctx.fillStyle = C.east;
  ctx.fillRect(PAD, qy + 34, 4, 82);
  ctx.font = `400 34px ${SERIF}`;
  const ql = wrap(ctx, c.quote.text, W - PAD * 2 - 30, 1);
  text(ctx, ql[0], PAD + 26, qy + 70, `400 34px ${SERIF}`, C.ink);
  text(ctx, c.quote.src, PAD + 26, qy + 112, `400 23px ${SANS}`, C.ink3);

  // 바닥
  rule(ctx, H - 92, 3);
  text(ctx, SITE, PAD, H - 50, `500 24px ${SANS}`, C.ink2);
  text(ctx, '운세는 재미로 봐 주세요', W - PAD, H - 50, `400 22px ${SANS}`, C.ink3, 'right');
  return canvas;
}

export const siteUrl = () => `${location.origin}${location.pathname}`;

/**
 * 카드 이미지를 미리 만들어 둔다.
 * 휴대폰 브라우저(특히 iOS Safari)는 버튼을 누른 "직후"에만 공유 창을 허용하므로,
 * 누른 뒤에 그림을 그리거나 다른 작업을 기다리면 공유가 중간에 실패할 수 있다.
 */
export async function prepareCard(profile) {
  const canvas = await drawTodayCard(profile);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], `zodigram-${getToday().key}.png`, { type: 'image/png', lastModified: Date.now() });
  return { file, url: URL.createObjectURL(blob) };
}

export function downloadCard(card) {
  const a = document.createElement('a');
  a.href = card.url;
  a.download = card.file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * 미리 만든 카드를 곧바로 공유한다. 이 함수 안에서는 공유 창을 열기 전에 await 하지 않는다.
 * - 이미지 + 짧은 글(주소 포함)만 보낸다. title·url 을 함께 넣으면 일부 앱에서 전달이 멈추는 경우가 있다.
 * - 이미지에 붙은 글을 버리는 앱(카카오톡 등)에 대비해 주소를 클립보드에도 넣는다(기다리지 않음).
 * - 공유가 실패하면 이미지를 저장한다.
 */
export function shareCard(card) {
  const link = siteUrl();
  navigator.clipboard?.writeText(link).catch(() => {});
  const data = { files: [card.file], text: `오늘의 운세 ${link}` };
  if (navigator.share && navigator.canShare?.(data)) {
    return navigator.share(data)
      .then(() => '공유했습니다. 주소는 복사해 두었으니 필요하면 대화창에 붙여 넣으세요.')
      .catch((e) => {
        if (e?.name === 'AbortError') return '공유를 취소했습니다.';
        downloadCard(card);
        return '이 브라우저에서는 이미지 공유가 되지 않아 저장했습니다. 저장된 이미지를 직접 보내 주세요.';
      });
  }
  downloadCard(card);
  return Promise.resolve('이미지를 저장했습니다. 주소는 복사해 두었습니다.');
}

/**
 * 카드 이미지를 서버(Cloudflare KV)에 30일 동안 올려 두고, 카드를 볼 수 있는 주소를 받는다.
 * 같은 카드는 한 번만 올린다.
 */
export async function uploadCard(card) {
  if (card.link) return card.link;
  const res = await fetch('api/card', {
    method: 'POST',
    headers: { 'content-type': 'image/png', 'x-card-date': getToday().key },
    body: card.file,
  });
  if (!res.ok) throw new Error(`upload ${res.status}`);
  const { url } = await res.json();
  card.link = url;
  return url;
}

/** 카드 주소를 공유 창으로 보낸다(카카오톡에서 카드 이미지가 미리보기로 붙는다). */
export function shareCardLink(link) {
  if (navigator.share) {
    return navigator.share({ title: 'Zodigram · 오늘의 운세', text: '오늘의 운세 카드', url: link })
      .then(() => '공유했습니다.')
      .catch((e) => (e?.name === 'AbortError' ? '공유를 취소했습니다.' : copyLink(link)));
  }
  return copyLink(link);
}

/** 링크만 공유(미리보기 카드가 붙는다). 공유 창이 없으면 복사. */
export function shareLink() {
  const link = siteUrl();
  if (navigator.share) {
    return navigator.share({ title: 'Zodigram · 별과 괘', text: '동양의 괘, 서양의 별로 읽는 오늘의 운세', url: link })
      .then(() => '공유했습니다.')
      .catch((e) => (e?.name === 'AbortError' ? '공유를 취소했습니다.' : copyLink(link)));
  }
  return copyLink(link);
}

export function copyLink(link) {
  return (navigator.clipboard?.writeText(link) ?? Promise.reject())
    .then(() => '주소를 복사했습니다.')
    .catch(() => link);
}
