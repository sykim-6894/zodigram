// Zodigram Worker
// - 정적 파일(public/)은 ASSETS 바인딩이 제공한다.
// - 공유 카드: 휴대폰에서 이미지 파일 공유가 막히는 앱(카카오톡 등)을 위해
//   카드 PNG를 KV(CARDS)에 30일 동안 보관하고, 그 카드를 보여 주는 짧은 주소를 만든다.
//     POST /api/card        PNG 업로드 → { id, url }
//     GET  /c/:id           카드 보기 페이지(링크 미리보기에 카드 이미지가 뜬다)
//     GET  /c/:id.png       카드 이미지

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30일
const MAX_BYTES = 1_500_000;
const CARD_W = 1080;
const CARD_H = 1350;
const ID_RE = /^[A-Za-z0-9]{10}$/;
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/api/card') {
        if (request.method !== 'POST') return json({ error: 'method' }, 405);
        return await uploadCard(request, env, url);
      }
      const m = path.match(/^\/c\/([A-Za-z0-9]+)(\.png)?$/);
      if (m && ID_RE.test(m[1]) && (request.method === 'GET' || request.method === 'HEAD')) {
        return m[2] ? await cardImage(m[1], env) : await cardPage(m[1], env, url);
      }
    } catch (e) {
      return json({ error: 'server' }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function newId() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

/** PNG 서명과 크기(IHDR)를 확인해 카드 이미지만 받는다 */
function isCardPng(buf) {
  const u = new Uint8Array(buf);
  if (u.length < 33 || PNG_SIG.some((v, i) => u[i] !== v)) return false;
  const dv = new DataView(buf);
  return dv.getUint32(16) === CARD_W && dv.getUint32(20) === CARD_H;
}

async function uploadCard(request, env, url) {
  if (!env.CARDS) return json({ error: 'storage-unavailable' }, 503);
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BYTES) return json({ error: 'too-large' }, 413);
  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return json({ error: 'too-large' }, 413);
  if (!isCardPng(buf)) return json({ error: 'invalid-image' }, 400);
  const date = (request.headers.get('x-card-date') || '').match(/^\d{4}-\d{2}-\d{2}$/)?.[0] || '';
  const id = newId();
  await env.CARDS.put(`card:${id}`, buf, { expirationTtl: TTL_SECONDS, metadata: { date, created: Date.now() } });
  return json({ id, url: `${url.origin}/c/${id}` }, 201);
}

async function cardImage(id, env) {
  if (!env.CARDS) return new Response('not found', { status: 404 });
  const buf = await env.CARDS.get(`card:${id}`, 'arrayBuffer');
  if (!buf) return new Response('not found', { status: 404 });
  return new Response(buf, {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400, immutable' },
  });
}

async function cardPage(id, env, url) {
  const found = env.CARDS ? await env.CARDS.getWithMetadata(`card:${id}`, 'arrayBuffer') : null;
  const ok = !!found?.value;
  const date = found?.metadata?.date || '';
  const dateText = date ? date.replace(/^(\d{4})-0?(\d+)-0?(\d+)$/, '$1년 $2월 $3일') : '';
  const img = `${url.origin}/c/${id}.png`;
  const home = `${url.origin}/`;
  const title = ok ? `${dateText ? dateText + ' ' : ''}오늘의 운세 카드 · Zodigram` : '카드를 찾을 수 없어요 · Zodigram';
  const desc = '동양의 괘, 서양의 별로 읽는 오늘. 나의 오늘 운세도 확인해 보세요.';

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url.origin}/c/${id}">
${ok ? `<meta property="og:image" content="${img}">
<meta property="og:image:width" content="${CARD_W}">
<meta property="og:image:height" content="${CARD_H}">
<meta name="twitter:card" content="summary_large_image">` : `<meta property="og:image" content="${url.origin}/og.png">`}
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&display=swap">
<style>
  :root { --paper:#F4F0E8; --ink:#1E1C19; --ink2:#57524A; --ink3:#8C8577; --rule:#D6CDBD; }
  @media (prefers-color-scheme: dark) { :root { --paper:#191816; --ink:#ECE6DA; --ink2:#B5AD9E; --ink3:#7F786C; --rule:#35322D; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.7 -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; word-break: keep-all; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 22px 18px 40px; }
  header { display: flex; align-items: baseline; gap: 10px; padding-bottom: 12px; border-bottom: 2px solid var(--ink); }
  header a { text-decoration: none; color: inherit; font: 600 24px/1 "Noto Serif KR", serif; }
  header span { font: 400 14px/1 "Noto Serif KR", serif; color: var(--ink3); }
  .card { display: block; width: 100%; height: auto; margin: 22px 0 14px; border: 1px solid var(--rule); background: #F4F0E8; }
  .cap { font-size: 13.5px; color: var(--ink3); margin: 0 0 22px; }
  .btn { display: flex; align-items: center; justify-content: center; height: 52px; background: var(--ink); color: var(--paper);
         text-decoration: none; font-size: 16px; border-radius: 2px; }
  .btn:hover { opacity: .9; }
  .sub { display: block; text-align: center; margin-top: 14px; font-size: 14px; color: var(--ink2); }
  .gone { padding: 60px 0 30px; font: 400 18px/1.6 "Noto Serif KR", serif; }
  footer { margin-top: 34px; padding-top: 12px; border-top: 1px solid var(--rule); font-size: 12.5px; color: var(--ink3); }
</style>
</head>
<body>
<div class="wrap">
  <header><a href="${home}">Zodigram</a><span>별과 괘</span></header>
  ${ok ? `<img class="card" src="${img}" alt="${dateText} 오늘의 운세 카드" width="${CARD_W}" height="${CARD_H}">
  <p class="cap">${dateText ? dateText + ' · ' : ''}누군가 Zodigram에서 받은 오늘의 운세예요.</p>` : `<p class="gone">이 카드는 보관 기간(30일)이 지나 사라졌어요.<br>오늘의 운세는 언제든 새로 볼 수 있어요.</p>`}
  <a class="btn" href="${home}">나의 오늘 운세 보기</a>
  <a class="sub" href="${home}#/calendar">길일 달력 보러 가기</a>
  <footer>카드는 만든 날로부터 30일 동안 보관됩니다. 운세는 재미로 봐 주세요.</footer>
</div>
</body>
</html>`;
  return new Response(html, {
    status: ok ? 200 : 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': ok ? 'public, max-age=300' : 'no-store' },
  });
}
