// 해시 라우터 + 화면 상호작용. GitHub Pages 하위 경로에서도 동작하도록 해시(#/)를 쓴다.
import { loadProfile, saveProfile, clearProfile } from './core/storage.js';
import { tossLine, readCast } from './core/iching.js';
import { trueRandom, shuffle } from './core/seed.js';
import { lunarToSolar, solarToLunar, formatLunar, LUNAR_MIN_YEAR, LUNAR_MAX_YEAR } from './core/lunar.js';
import { MAJOR_ARCANA, SPREAD_POSITIONS } from './data/tarot.js';
import { hexagramSvg, coinSvg } from './ui/glyphs.js';
import { getToday } from './core/fortune.js';
import { shareTodayCard } from './ui/share.js';
import * as V from './ui/views.js';

const view = document.getElementById('view');

// 달력 화면 상태(보고 있는 달, 고른 날)
const nowKst = getToday().date;
const cal = { year: nowKst.year, month: nowKst.month, sel: nowKst.day };

const routes = {
  '/': () => V.homeView(loadProfile()),
  '/east': () => V.eastView(loadProfile()),
  '/east/iching': () => V.ichingView(),
  '/west': () => V.westView(loadProfile()),
  '/west/tarot': () => V.tarotView(),
  '/calendar': () => V.calendarView(loadProfile(), cal, cal.sel),
  '/me': () => V.meView(loadProfile()),
  '/about': () => V.aboutView(),
};

const binders = {
  '/me': bindProfileForm,
  '/east/iching': bindIching,
  '/west/tarot': bindTarot,
  '/calendar': bindCalendar,
  '/': bindShare,
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

/* 길일 달력 */
function bindCalendar() {
  const go = (dy, dm) => {
    let m = cal.month + dm, y = cal.year + dy;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    if (y < 1900 || y > 2100) return;
    cal.year = y; cal.month = m;
    const t = getToday().date;
    cal.sel = y === t.year && m === t.month ? t.day : null;
    renderCalendar();
  };
  document.getElementById('calPrev').addEventListener('click', () => go(0, -1));
  document.getElementById('calNext').addEventListener('click', () => go(0, 1));
  document.getElementById('calToday').addEventListener('click', () => {
    const t = getToday().date;
    cal.year = t.year; cal.month = t.month; cal.sel = t.day;
    renderCalendar();
  });
  view.querySelector('.cal').addEventListener('click', (ev) => {
    const b = ev.target.closest('.cal-cell[data-d]');
    if (!b) return;
    cal.sel = Number(b.dataset.d);
    renderCalendar(true);
  });
}

// 달력만 다시 그리고 스크롤 위치는 유지한다
function renderCalendar(scrollToDetail = false) {
  const y = window.scrollY;
  view.innerHTML = routes['/calendar']();
  bindCalendar();
  window.scrollTo(0, y);
  if (scrollToDetail) {
    const d = document.getElementById('calDetail');
    if (d.getBoundingClientRect().top > window.innerHeight - 120) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* 오늘 운세 공유 */
function bindShare() {
  const btn = document.getElementById('shareCard');
  if (!btn) return;
  const status = document.getElementById('shareStatus');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = '카드를 만드는 중…';
    try {
      status.textContent = await shareTodayCard(loadProfile());
    } catch (e) {
      status.textContent = '카드를 만들지 못했습니다. 다시 시도해 주세요.';
    } finally {
      btn.disabled = false;
    }
  });
  document.getElementById('copyLink')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.origin + location.pathname);
      status.textContent = '주소를 복사했습니다.';
    } catch {
      status.textContent = location.origin + location.pathname;
    }
  });
}

/* 내 정보 */
function bindProfileForm() {
  const form = document.getElementById('profileForm');
  const noTime = form.elements.noTime;
  noTime.addEventListener('change', () => {
    form.elements.time.disabled = noTime.checked;
    if (noTime.checked) form.elements.time.value = '';
  });
  const conv = document.getElementById('conv');
  const el = form.elements;

  // 입력값 → {solar, lunar, calendar} 또는 {error}
  const readBirth = () => {
    const calendar = el.calendar.value;
    if (calendar === 'lunar') {
      const ly = Number(el.ly.value), lm = Number(el.lm.value), ld = Number(el.ld.value);
      if (!ly || !lm || !ld) return { empty: true };
      const s = lunarToSolar(ly, lm, ld, el.leap.checked);
      if (s.error) return { error: s.error };
      return { calendar, solar: s, lunar: { year: ly, month: lm, day: ld, leap: el.leap.checked } };
    }
    const [y, m, d] = el.date.value.split('-').map(Number);
    if (!y || !m || !d) return { empty: true };
    if (y < LUNAR_MIN_YEAR || y > LUNAR_MAX_YEAR) return { error: '1900~2100년 사이로 입력해 주세요.' };
    return { calendar, solar: { year: y, month: m, day: d }, lunar: solarToLunar(y, m, d) };
  };

  const updateConv = () => {
    const isLunar = el.calendar.value === 'lunar';
    form.querySelector('[data-cal="solar"]').hidden = isLunar;
    form.querySelector('[data-cal="lunar"]').hidden = !isLunar;
    const b = readBirth();
    conv.classList.toggle('err', !!b.error);
    if (b.error) conv.textContent = b.error;
    else if (b.empty) conv.textContent = '';
    else {
      const s = b.solar;
      conv.textContent = isLunar
        ? `양력으로 ${s.year}년 ${s.month}월 ${s.day}일입니다.`
        : `${formatLunar(b.lunar)}입니다.`;
    }
    return b;
  };
  form.addEventListener('input', updateConv);
  form.addEventListener('change', updateConv);
  updateConv();

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const b = updateConv();
    if (b.empty) { conv.classList.add('err'); conv.textContent = '생년월일을 입력해 주세요.'; return; }
    if (b.error) return;
    let hour = null, minute = null;
    if (!noTime.checked && el.time.value) {
      [hour, minute] = el.time.value.split(':').map(Number);
    }
    saveProfile({
      name: el.name.value.trim(),
      calendar: b.calendar,
      lunar: b.calendar === 'lunar' ? b.lunar : null,
      year: b.solar.year, month: b.solar.month, day: b.solar.day,
      hour, minute,
    });
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
