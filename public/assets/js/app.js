// 해시 라우터 + 화면 상호작용. GitHub Pages 하위 경로에서도 동작하도록 해시(#/)를 쓴다.
import { loadProfile, saveProfile, clearProfile } from './core/storage.js';
import { tossLine, readCast } from './core/iching.js';
import { trueRandom, shuffle } from './core/seed.js';
import { MAJOR_ARCANA, SPREAD_POSITIONS } from './data/tarot.js';
import { hexagramSvg, coinSvg } from './ui/glyphs.js';
import * as V from './ui/views.js';

const view = document.getElementById('view');

const routes = {
  '/': () => V.homeView(loadProfile()),
  '/east': () => V.eastView(loadProfile()),
  '/east/iching': () => V.ichingView(),
  '/west': () => V.westView(loadProfile()),
  '/west/tarot': () => V.tarotView(),
  '/me': () => V.meView(loadProfile()),
  '/about': () => V.aboutView(),
};

const binders = {
  '/me': bindProfileForm,
  '/east/iching': bindIching,
  '/west/tarot': bindTarot,
};

function currentPath() {
  const h = location.hash.replace(/^#/, '') || '/';
  return routes[h] ? h : '/';
}

function render() {
  const path = currentPath();
  view.innerHTML = routes[path]();
  document.body.dataset.route = path.split('/')[1] || 'home';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const target = a.getAttribute('href').replace(/^#/, '');
    const active = target === '/' ? path === '/' : path.startsWith(target);
    a.toggleAttribute('aria-current', active);
    if (active) a.setAttribute('aria-current', 'page');
  });
  binders[path]?.();
  window.scrollTo(0, 0);
}

/* 내 정보 */
function bindProfileForm() {
  const form = document.getElementById('profileForm');
  const noTime = form.elements.noTime;
  noTime.addEventListener('change', () => {
    form.elements.time.disabled = noTime.checked;
    if (noTime.checked) form.elements.time.value = '';
  });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const [y, m, d] = form.elements.date.value.split('-').map(Number);
    if (!y || !m || !d) return;
    let hour = null, minute = null;
    if (!noTime.checked && form.elements.time.value) {
      [hour, minute] = form.elements.time.value.split(':').map(Number);
    }
    saveProfile({ name: form.elements.name.value.trim(), year: y, month: m, day: d, hour, minute });
    location.hash = '#/';
  });
  document.getElementById('clear')?.addEventListener('click', () => {
    clearProfile();
    render();
  });
}

/* 주역 점 */
function bindIching() {
  const values = [];
  const btn = document.getElementById('toss');
  const reset = document.getElementById('reset');
  const coins = document.getElementById('coins');
  const lines = document.getElementById('castLines');
  const result = document.getElementById('castResult');
  const count = document.getElementById('tossCount');

  const drawLines = () => {
    const ls = values.map((v) => (v === 7 || v === 9 ? 1 : 0));
    const chg = values.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0);
    // 아직 던지지 않은 효는 빈칸으로
    lines.innerHTML = values.length ? hexagramSvg([...ls, ...Array(6 - ls.length).fill(null)], chg, 'building') : '';
  };

  btn.addEventListener('click', () => {
    if (values.length >= 6) return;
    const t = tossLine(trueRandom);
    values.push(t.value);
    coins.innerHTML = t.coins.map(coinSvg).join('');
    coins.classList.remove('flip');
    void coins.offsetWidth;
    coins.classList.add('flip');
    count.textContent = `${values.length} / 6`;
    drawLines();
    if (values.length === 6) {
      btn.hidden = true;
      reset.hidden = false;
      result.innerHTML = V.castResultHtml(readCast(values), document.getElementById('q').value.trim());
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  reset.addEventListener('click', render);
}

/* 타로 세 장 */
function bindTarot() {
  const deckEl = document.getElementById('deck');
  const spreadEl = document.getElementById('spread');
  const readingEl = document.getElementById('reading');
  const again = document.getElementById('reshuffle');
  const positions = SPREAD_POSITIONS.three;
  const deck = shuffle(MAJOR_ARCANA, trueRandom).map((card) => ({ card, reversed: trueRandom() < 0.3 }));
  const chosen = [];

  spreadEl.innerHTML = positions.map((p) => `<div class="slot"><span>${p}</span></div>`).join('');
  deckEl.innerHTML = deck.map((_, i) => `<button class="tback" data-i="${i}" aria-label="카드 ${i + 1}"></button>`).join('');

  deckEl.addEventListener('click', (ev) => {
    const b = ev.target.closest('.tback');
    if (!b || b.disabled || chosen.length >= 3) return;
    b.disabled = true;
    const pick = deck[Number(b.dataset.i)];
    chosen.push(pick);
    const slot = spreadEl.children[chosen.length - 1];
    slot.outerHTML = V.tarotCard(pick.card, pick.reversed, positions[chosen.length - 1]).replace('class="tcard', 'class="tcard enter');
    if (chosen.length === 3) {
      deckEl.classList.add('done');
      readingEl.innerHTML = chosen.map((c, i) => `<div class="reading-item"><h3 class="headline sm">${positions[i]}</h3>${V.tarotReading(c.card, c.reversed)}</div>`).join('');
      again.hidden = false;
    }
  });
  again.addEventListener('click', render);
}

window.addEventListener('hashchange', render);
render();

// 자정이 지나면 오늘 내용을 새로 그린다(앱을 켜 둔 채 날이 바뀌는 경우)
let lastDay = new Date().toDateString();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && new Date().toDateString() !== lastDay) {
    lastDay = new Date().toDateString();
    render();
  }
});

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
