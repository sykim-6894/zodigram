// 해시 라우터 + 화면 상호작용. GitHub Pages 하위 경로에서도 동작하도록 해시(#/)를 쓴다.
import { loadProfile, saveProfile, clearProfile } from './core/storage.js';
import { tossLine, readCast } from './core/iching.js';
import { trueRandom, shuffle } from './core/seed.js';
import { lunarToSolar, solarToLunar, formatLunar, LUNAR_MIN_YEAR, LUNAR_MAX_YEAR } from './core/lunar.js';
import { MAJOR_ARCANA, SPREAD_POSITIONS } from './data/tarot.js';
import { hexagramSvg, coinSvg } from './ui/glyphs.js';
import { getToday } from './core/fortune.js';
import { manseLookup } from './core/manse.js';
import { getYear, getMonth, getQuarter } from './core/period.js';
import { prepareCard, shareCard, shareLink, downloadCard, uploadCard, shareCardLink, copyLink } from './ui/share.js';
import * as V from './ui/views.js';

const view = document.getElementById('view');

// 달력 화면 상태(보고 있는 달, 고른 날)
const nowKst = getToday().date;
const cal = { year: nowKst.year, month: nowKst.month, sel: nowKst.day };

// 만세력 입력 상태(처음엔 지금 시각)
const pad = (n) => String(n).padStart(2, '0');
function nowManse() {
  const t = getToday().date;
  const l = solarToLunar(t.year, t.month, t.day);
  return {
    calendar: 'solar', date: `${t.year}-${pad(t.month)}-${pad(t.day)}`, ly: l.year, lm: l.month, ld: l.day, leap: l.leap,
    time: `${pad(t.hour)}:${pad(t.minute)}`, place: loadProfile()?.place || '서울',
  };
}
let manse = nowManse();

const routes = {
  '/': () => V.homeView(loadProfile()),
  '/month': () => periodPage('month'),
  '/quarter': () => periodPage('quarter'),
  '/year': () => periodPage('year'),
  '/east': () => V.eastView(loadProfile()),
  '/east/iching': () => V.ichingView(),
  '/west': () => V.westView(loadProfile()),
  '/west/tarot': () => V.tarotView(),
  '/calendar': () => V.calendarView(loadProfile(), cal, cal.sel),
  '/manse': () => V.manseView(manse),
  '/me': () => V.meView(loadProfile()),
  '/about': () => V.aboutView(),
};

const binders = {
  '/me': bindProfileForm,
  '/east/iching': bindIching,
  '/west/tarot': bindTarot,
  '/calendar': bindCalendar,
  '/manse': bindManse,
  '/': bindShare,
};

function periodPage(kind) {
  const p = loadProfile();
  const r = p ? { year: getYear, month: getMonth, quarter: getQuarter }[kind](p) : null;
  return V.periodView(kind, p, r);
}

const HOME_PATHS = ['/', '/month', '/quarter', '/year'];

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
    const active = target === '/' ? HOME_PATHS.includes(path) : path.startsWith(target);
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

/* 오늘 운세 공유: 화면이 열릴 때 카드를 미리 만들고, 누르면 바로 공유 */
function bindShare() {
  const btn = document.getElementById('shareCard');
  if (!btn) return;
  const status = document.getElementById('shareStatus');
  const preview = document.getElementById('sharePreview');
  const save = document.getElementById('saveCard');
  let card = null;
  btn.disabled = true;
  status.textContent = '카드를 준비하는 중…';
  prepareCard(loadProfile()).then((c) => {
    card = c;
    preview.innerHTML = `<img src="${c.url}" alt="오늘의 운세 카드" width="270" height="338">`;
    btn.disabled = false;
    status.textContent = '';
  }).catch(() => {
    status.textContent = '카드를 만들지 못했습니다. 새로 고침 후 다시 시도해 주세요.';
  });

  // 카드 공유: 서버에 올려 카드 주소를 만든 뒤, 그 주소를 공유한다(카카오톡 호환).
  const ready = document.getElementById('shareReady');
  btn.addEventListener('click', async () => {
    if (!card) return;
    btn.disabled = true;
    status.textContent = '공유 링크를 만드는 중…';
    try {
      const link = await uploadCard(card);
      status.textContent = '';
      ready.hidden = false;
      ready.innerHTML = V.shareReadyHtml(link);
      ready.querySelector('#sendLink').addEventListener('click', () => {
        shareCardLink(link).then((msg) => { status.textContent = msg; });
      });
      ready.querySelector('#copyCardLink').addEventListener('click', () => {
        copyLink(link).then((msg) => { status.textContent = msg; });
      });
      ready.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {
      // 링크를 만들 수 없으면(오프라인·저장소 미설정) 이미지 파일 공유로 대신한다
      ready.hidden = false;
      ready.innerHTML = V.shareFallbackHtml();
      ready.querySelector('#shareFile').addEventListener('click', () => {
        shareCard(card).then((msg) => { status.textContent = msg; });
      });
      status.textContent = '';
    } finally {
      btn.disabled = false;
    }
  });
  save?.addEventListener('click', () => {
    if (!card) return;
    downloadCard(card);
    status.textContent = '이미지를 저장했습니다.';
  });
  document.getElementById('copyLink')?.addEventListener('click', () => {
    shareLink().then((msg) => { status.textContent = msg; });
  });
}

/* 만세력 */
function bindManse() {
  const form = document.getElementById('manseForm');
  const out = document.getElementById('manseOut');
  const el = form.elements;
  let last = null;
  const update = (ev) => {
    // 양력↔음력을 바꾸면 지금 보고 있는 날짜를 그대로 옮겨 적는다
    if (ev?.target?.name === 'calendar' && last && !last.error) {
      if (el.calendar.value === 'lunar') {
        el.ly.value = last.lunar.year; el.lm.value = last.lunar.month; el.ld.value = last.lunar.day; el.leap.checked = last.lunar.leap;
      } else {
        el.date.value = `${last.solar.year}-${pad(last.solar.month)}-${pad(last.solar.day)}`;
      }
    }
    manse = {
      calendar: el.calendar.value, date: el.date.value,
      ly: Number(el.ly.value), lm: Number(el.lm.value), ld: Number(el.ld.value), leap: el.leap.checked,
      time: el.time.value, place: el.place.value,
    };
    form.querySelector('[data-cal="solar"]').hidden = manse.calendar === 'lunar';
    form.querySelector('[data-cal="lunar"]').hidden = manse.calendar !== 'lunar';
    last = manseLookup(manse);
    out.innerHTML = V.manseResult(last);
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  document.getElementById('manseNow').addEventListener('click', () => { manse = nowManse(); render(); });
  update();
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
      place: el.place.value,
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
