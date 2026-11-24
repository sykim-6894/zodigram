// 해시 라우터 + 화면 상호작용. GitHub Pages 하위 경로에서도 동작하도록 해시(#/)를 쓴다.
import { loadProfile, saveProfile, clearProfile, loadPeople, getPerson, savePerson, deletePerson, loadVault, addVaultItem, updateVaultItem, deleteVaultItem, getVaultItem, recordVisit, loadVisits, loadNotify, saveNotify } from './core/storage.js';
import { notifySupported, requestNotifyPermission, applyNotifications } from './core/notify-native.js';
import { parseTime } from './core/notify.js';
import { ichingItem, tarotItem, matchItem, dayItem } from './core/vault.js';
import { computeMatch } from './core/match.js';
import { isNative, shareData, isShareCancel } from './core/env.js';
import { createBackup, parseBackup, restoreBackup, backupFileName } from './core/backup.js';
import { tossLine, readCast } from './core/iching.js';
import { trueRandom, shuffle } from './core/seed.js';
import { lunarToSolar, solarToLunar, formatLunar, LUNAR_MIN_YEAR, LUNAR_MAX_YEAR } from './core/lunar.js';
import { MAJOR_ARCANA, SPREAD_POSITIONS } from './data/tarot.js';
import { hexagramSvg, coinSvg } from './ui/glyphs.js';
import { getToday } from './core/fortune.js';
import { manseLookup } from './core/manse.js';
import { getYear, getMonth, getQuarter } from './core/period.js';
import { getNewYear, clampYear } from './core/newyear.js';
import { getWeek } from './core/week.js';
import { badgeStats } from './core/badges.js';
import { loadDraws, saveDraw } from './core/storage.js';
import { getTopics } from './core/topics.js';
import { findDays } from './core/pick.js';
import { prepareCard, shareCard, shareLink, downloadCard, uploadCard, shareCardLink, copyLink, prepareMatchCard } from './ui/share.js';
import * as V from './ui/views.js';

const view = document.getElementById('view');

// 달력 화면 상태(보고 있는 달, 고른 날)
const nowKst = getToday().date;
const cal = { year: nowKst.year, month: nowKst.month, sel: nowKst.day };

// 보관함 목록 필터
let vaultFilter = 'all';

function vaultItemPage() {
  const item = routeParam ? getVaultItem(routeParam) : null;
  if (!item) return `<div class="page-head"><h1>보관함</h1></div><p>저장한 항목을 찾을 수 없어요.</p><a class="btn ghost" href="#/vault">보관함으로</a>`;
  return V.vaultDetail(item, loadPeople(), getToday().date);
}

// 저장 버튼 공통 처리: 저장하고, 결과를 버튼 옆에 알린다
function bindSave(id, make) {
  const btn = document.getElementById(id);
  const note = document.getElementById(`${id}Note`);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const r = addVaultItem(make());
    if (r.ok) {
      btn.disabled = true;
      btn.textContent = '저장했어요';
      if (note) note.innerHTML = '<a href="#/vault">보관함 보기</a>';
    } else if (note) {
      note.textContent = r.reason === 'full' ? '보관함이 가득 찼어요(200개). 보관함에서 오래된 항목을 지워 주세요.' : '저장하지 못했어요. 브라우저의 저장 공간을 확인해 주세요.';
    }
  });
}

// 달력으로 가는 링크: 이동 전에 달력이 그 날짜를 보여 주도록 상태를 맞춘다
function bindGoto() {
  document.querySelectorAll('[data-goto]').forEach((a) => a.addEventListener('click', () => {
    const [y, m, d] = a.dataset.goto.split('-').map(Number);
    cal.year = y; cal.month = m; cal.sel = d;
  }));
}

// 택일 입력 상태
let pick = { purpose: 'move', days: 90, partner: '' };
function pickRes() {
  const partner = pick.partner ? getPerson(pick.partner) : null;
  return findDays(pick.purpose, { profile: loadProfile(), partner, days: pick.days });
}

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
  '/week': () => { const p = loadProfile(); return V.weekView(p, p ? getWeek(p) : null); },
  '/duo': () => V.duoView(loadProfile()),
  '/month': () => periodPage('month'),
  '/quarter': () => periodPage('quarter'),
  '/year': () => periodPage('year'),
  '/east': () => V.eastView(loadProfile()),
  '/east/iching': () => V.ichingView(),
  '/west': () => V.westView(loadProfile()),
  '/west/tarot': () => V.tarotView(),
  '/calendar': () => V.calendarView(loadProfile(), cal, cal.sel),
  '/pick': () => V.pickView(loadProfile(), loadPeople(), pick, pickRes(), loadVault()),
  '/vault': () => V.vaultView(loadVault(), vaultFilter, loadProfile(), getToday().date, loadVisits(), badgeStats({ visits: loadVisits(), draws: loadDraws(), vault: loadVault(), people: loadPeople() })),
  '/vault/item': () => vaultItemPage(),
  '/manse': () => V.manseView(manse),
  '/me': () => V.meView(loadProfile(), 'me', loadPeople(), loadNotify()),
  '/person': () => V.meView(routeParam === 'new' ? null : getPerson(routeParam), 'person'),
  '/match': () => matchPage(),
  '/about': () => V.aboutView(),
};

const binders = {
  '/me': () => bindProfileForm('me'),
  '/person': () => bindProfileForm('person'),
  '/draw': bindDraw,
  '/duo': bindDuo,
  '/match': bindMatch,
  '/east/iching': bindIching,
  '/west/tarot': bindTarot,
  '/calendar': bindCalendar,
  '/pick': bindPick,
  '/vault': bindVault,
  '/vault/item': bindVaultItem,
  '/manse': bindManse,
  '/': bindShare,
};

routes['/draw'] = () => {
  const draws = loadDraws();
  const key = getToday().key;
  return V.drawView(draws[key] || null, draws, key);
};

routes['/newyear'] = () => {
  const p = loadProfile();
  const year = clampYear(routeParam);
  return V.newYearView(p, p ? getNewYear(p, year) : null, year);
};

function periodPage(kind) {
  const p = loadProfile();
  const r = p ? { year: getYear, month: getMonth, quarter: getQuarter }[kind](p) : null;
  return V.periodView(kind, p, r);
}

// 주제별 운세: #/topic/love/day 처럼 주제 × 기간
for (const t of ['love', 'money', 'work', 'health']) {
  for (const k of ['day', 'month', 'year']) {
    routes[`/topic/${t}/${k}`] = () => {
      const p = loadProfile();
      return V.topicView(t, k, p, p ? getTopics(p, k) : null);
    };
  }
}

const HOME_PATHS = ['/', '/week', '/month', '/quarter', '/year', '/newyear', ...Object.keys(routes).filter((r) => r.startsWith('/topic/'))];

// 주소 안의 값(#/person/<id>, #/match/<id>)
let routeParam = null;

function currentPath() {
  const h = location.hash.replace(/^#/, '') || '/';
  routeParam = null;
  if (routes[h]) return h;
  let m = h.match(/^\/person\/(new|[a-z0-9]+)$/);
  if (m) { routeParam = m[1]; return '/person'; }
  m = h.match(/^\/newyear\/(\d{4})$/);
  if (m) { routeParam = m[1]; return '/newyear'; }
  m = h.match(/^\/match(?:\/([a-z0-9]+))?$/);
  if (m) { routeParam = m[1] || null; return '/match'; }
  m = h.match(/^\/vault(?:\/(v[a-z0-9]+))?$/);
  if (m) { routeParam = m[1] || null; return routeParam ? '/vault/item' : '/vault'; }
  return '/';
}

/* 궁합: 고른 사람이 없으면 처음 저장한 사람 */
function matchPage() {
  const me = loadProfile();
  const people = loadPeople();
  const other = (routeParam && getPerson(routeParam)) || people[0] || null;
  return V.matchView(me, people, other, me && other ? computeMatch(me, other) : null);
}

function bindMatch() {
  document.getElementById('matchWho')?.addEventListener('change', (ev) => { location.hash = `#/match/${ev.target.value}`; });
  const btn = document.getElementById('shareCard');
  if (!btn) return;
  const me = loadProfile();
  const people = loadPeople();
  const other = (routeParam && getPerson(routeParam)) || people[0];
  bindSave('saveMatch', () => matchItem(me, other, computeMatch(me, other)));
  bindCardShare(() => prepareMatchCard(me, other, computeMatch(me, other)));
}

/* 두 사람 비교: 입력값으로 임시 프로필을 만들어 궁합만 계산하고 아무것도 저장하지 않는다 */
function bindDuo() {
  const form = document.getElementById('duoForm');
  const err = document.getElementById('duoErr');
  const out = document.getElementById('duoResult');
  const read = (n) => {
    const el = form.elements;
    const [y, m, d] = el[`date${n}`].value.split('-').map(Number);
    if (!y || !m || !d) return { error: `${n === 1 ? '첫' : '두'} 번째 사람의 생년월일을 입력해 주세요.` };
    if (y < LUNAR_MIN_YEAR || y > LUNAR_MAX_YEAR) return { error: '1900~2100년 사이로 입력해 주세요.' };
    let hour = null, minute = null;
    if (el[`time${n}`].value) [hour, minute] = el[`time${n}`].value.split(':').map(Number);
    return { p: { name: el[`name${n}`].value.trim(), calendar: 'solar', lunar: null, year: y, month: m, day: d, hour, minute, place: '서울', gender: '' } };
  };
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const a = read(1), b = read(2);
    const bad = a.error || b.error;
    err.classList.toggle('err', !!bad);
    err.textContent = bad || '';
    if (bad) { out.innerHTML = ''; return; }
    out.innerHTML = V.duoResult(a.p, b.p, computeMatch(a.p, b.p));
    document.getElementById('duoOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function render() {
  const path = currentPath();
  view.innerHTML = routes[path]();
  document.body.dataset.route = path.split('/')[1] || 'home';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const target = a.getAttribute('href').replace(/^#/, '');
    const active = target === '/' ? HOME_PATHS.includes(path) : path.startsWith(target) || (target === '/me' && (path === '/person' || path.startsWith('/vault'))) || (target === '/calendar' && path === '/pick');
    a.toggleAttribute('aria-current', active);
    if (active) a.setAttribute('aria-current', 'page');
  });
  binders[path]?.();
  window.scrollTo(0, 0);
}

/* 보관함 */
function bindVault() {
  const chips = document.getElementById('vaultFilter');
  chips.addEventListener('change', (ev) => {
    vaultFilter = ev.target.value;
    document.getElementById('vaultList').innerHTML = V.vaultList(loadVault(), vaultFilter, getToday().date);
  });
}

function bindVaultItem() {
  bindGoto();
  const item = routeParam ? getVaultItem(routeParam) : null;
  if (!item) return;
  const memo = document.getElementById('vaultMemo');
  const note = document.getElementById('memoNote');
  memo.addEventListener('change', () => {
    updateVaultItem(item.id, { memo: memo.value.trim() });
    note.textContent = '메모를 저장했어요';
  });
  const del = document.getElementById('vaultDelete');
  let armed = null;
  del.addEventListener('click', () => {
    if (!armed) {
      // 실수로 지우지 않도록 한 번 더 누르게 한다
      del.textContent = '한 번 더 누르면 삭제돼요';
      armed = setTimeout(() => { armed = null; del.textContent = '삭제'; }, 4000);
      return;
    }
    clearTimeout(armed);
    deleteVaultItem(item.id);
    location.hash = '#/vault';
  });
}

/* 택일 */
function bindPick() {
  const form = document.getElementById('pickForm');
  const out = document.getElementById('pickOut');
  const links = bindGoto;
  // 결과가 다시 그려져도 동작하도록 결과 영역에서 클릭을 받는다
  out.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-save-day]');
    if (!b || b.disabled) return;
    const [y, m, d] = b.dataset.saveDay.split('-').map(Number);
    const res = pickRes();
    const x = res.all.find((a) => a.year === y && a.month === m && a.day === d);
    if (!x) return;
    const r = addVaultItem(dayItem(pick.purpose, x, res.partnerName));
    b.disabled = true;
    b.textContent = r.ok ? '보관함에 저장됨' : r.reason === 'full' ? '보관함이 가득 찼어요' : '저장하지 못했어요';
  });
  form.addEventListener('change', () => {
    pick = { purpose: form.elements.purpose.value, days: Number(form.elements.days.value), partner: form.elements.partner ? form.elements.partner.value : '' };
    out.innerHTML = V.pickResult(loadProfile(), pick, pickRes(), loadVault());
    links();
  });
  links();
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
  if (!document.getElementById('shareCard')) return;
  bindCardShare(() => prepareCard(loadProfile()));
}

function bindCardShare(make) {
  const btn = document.getElementById('shareCard');
  if (!btn) return;
  const status = document.getElementById('shareStatus');
  const preview = document.getElementById('sharePreview');
  const save = document.getElementById('saveCard');
  // 앱 안의 웹뷰에서는 파일 내려받기가 되지 않으므로 이미지 저장 버튼을 숨긴다(공유 링크로 보낸다)
  if (isNative()) save?.remove();
  let card = null;
  btn.disabled = true;
  status.textContent = '카드를 준비하는 중…';
  make().then((c) => {
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
      if (isNative()) {
        status.textContent = '공유 링크를 만들려면 인터넷 연결이 필요해요. 연결을 확인하고 다시 눌러 주세요.';
        return;
      }
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
function bindProfileForm(mode = 'me') {
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
    const data = {
      name: el.name.value.trim(),
      calendar: b.calendar,
      lunar: b.calendar === 'lunar' ? b.lunar : null,
      year: b.solar.year, month: b.solar.month, day: b.solar.day,
      hour, minute,
      place: el.place.value,
      gender: el.gender.value,
    };
    if (mode === 'person') {
      if (!data.name) { conv.classList.add('err'); conv.textContent = '이름이나 별명을 입력해 주세요.'; el.name.focus(); return; }
      const saved = savePerson({ ...data, id: routeParam !== 'new' ? routeParam : undefined, relation: el.relation.value });
      location.hash = loadProfile() ? `#/match/${saved.id}` : '#/me';
      return;
    }
    saveProfile(data);
    applyNotifications();
    location.hash = '#/';
  });
  document.getElementById('clear')?.addEventListener('click', () => {
    if (mode === 'person') {
      deletePerson(routeParam);
      location.hash = '#/me';
      return;
    }
    clearProfile();
    applyNotifications();
    render();
  });
  if (mode === 'me') { bindNotify(); bindBackup(); }
}

/* 백업과 복원 */
function bindBackup() {
  const text = document.getElementById('backupText');
  const msg = document.getElementById('backupMsg');
  if (!text) return;
  const say = (t, err = false) => { msg.classList.toggle('err', err); msg.textContent = t; };
  const make = () => { text.value = createBackup(); return text.value; };
  document.getElementById('backupMake').addEventListener('click', async () => {
    const code = make();
    try { await navigator.clipboard.writeText(code); say('백업 내용을 만들어 복사했어요. 메모나 메일에 붙여 넣어 보관하세요.'); }
    catch { text.select(); say('백업 내용을 만들었어요. 위 칸의 글을 모두 복사해 보관하세요.'); }
  });
  document.getElementById('backupShare').addEventListener('click', async () => {
    const code = make();
    try {
      if (isNative() || !('download' in document.createElement('a'))) {
        const p = shareData({ title: 'Zodigram 백업', text: code });
        if (!p) throw new Error('no share');
        await p;
        say('보내기 창을 열었어요. 나에게 보내기·메모·드라이브 등에 저장하세요.');
      } else {
        const url = URL.createObjectURL(new Blob([code], { type: 'application/json' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: backupFileName() });
        document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        say('백업 파일을 내려받았어요.');
      }
    } catch (e) {
      if (!isShareCancel(e)) say('보내지 못했어요. 위 칸의 글을 직접 복사해 보관하세요.', true);
    }
  });
  const restore = () => {
    const r = parseBackup(text.value);
    if (!r.ok) {
      say({ format: '백업 내용이 아니에요. 백업으로 만든 글을 전부 붙여 넣었는지 확인해 주세요.', version: '더 새로운 버전의 백업이라 읽을 수 없어요. 앱을 업데이트해 주세요.', empty: '복원할 내용이 없어요.' }[r.reason] || '복원하지 못했어요.', true);
      return;
    }
    const c = r.counts;
    if (!confirm(`이 기기의 내용을 백업으로 바꿉니다.
내 정보 ${c.profile}개 · 저장한 사람 ${c.people}명 · 보관함 ${c.vault}개
계속할까요?`)) return;
    const done = restoreBackup(text.value);
    if (!done.ok) { say('저장 공간 문제로 복원하지 못했어요.', true); return; }
    applyNotifications();
    render();
  };
  document.getElementById('backupRestore').addEventListener('click', restore);
  document.getElementById('backupFile').addEventListener('change', async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    if (f.size > 5e6) { say('파일이 너무 커요.', true); return; }
    text.value = await f.text();
    restore();
  });
}

/* 아침 알림 설정(앱에서만 보인다) */
function bindNotify() {
  const sec = document.getElementById('notifySec');
  if (!sec || !notifySupported()) return;
  sec.hidden = false;
  const on = document.getElementById('notifyOn');
  const time = document.getElementById('notifyTime');
  const msg = document.getElementById('notifyMsg');
  const say = (t, err = false) => { msg.classList.toggle('err', err); msg.textContent = t; };
  const store = async () => {
    const t = parseTime(time.value) || { hour: 8, minute: 0 };
    saveNotify({ on: on.checked, ...t });
    const n = await applyNotifications();
    say(on.checked ? (n ? `매일 ${time.value}에 알려 드릴게요.` : '알림을 예약하지 못했어요.') : '아침 알림을 껐어요.', on.checked && !n);
  };
  on.addEventListener('change', async () => {
    if (on.checked && !(await requestNotifyPermission())) {
      on.checked = false;
      say('알림 권한이 꺼져 있어요. 기기 설정에서 Zodigram 알림을 허용해 주세요.', true);
      return;
    }
    time.disabled = !on.checked;
    store();
  });
  time.addEventListener('change', store);
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
      const question = document.getElementById('q').value.trim();
      result.innerHTML = V.castResultHtml(readCast(values), question, true);
      bindSave('saveCast', () => ichingItem(values, question));
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  document.getElementById('qChips')?.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-q]');
    if (b) { const q = document.getElementById('q'); q.value = b.dataset.q; q.focus(); }
  });
  reset.addEventListener('click', render);
}

/* 오늘의 한 장 뽑기 */
function bindDraw() {
  const deckEl = document.getElementById('drawDeck');
  if (!deckEl) return;
  const key = getToday().key;
  const deck = shuffle(MAJOR_ARCANA, trueRandom).map((card) => ({ card, reversed: trueRandom() < 0.3 }));
  deckEl.innerHTML = deck.map((_, i) => `<button class="tback" data-i="${i}" aria-label="카드 ${i + 1}"></button>`).join('');
  deckEl.addEventListener('click', (ev) => {
    const b = ev.target.closest('.tback');
    if (!b) return;
    const pick = deck[Number(b.dataset.i)];
    saveDraw(key, { n: pick.card.n, reversed: pick.reversed });
    render();
  });
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
      document.getElementById('tarotSave').hidden = false;
      bindSave('saveTarot', () => tarotItem(chosen));
    }
  });
  again.addEventListener('click', render);
}

window.addEventListener('hashchange', render);
recordVisit(getToday().key);
render();
applyNotifications();

// 자정이 지나면 오늘 내용을 새로 그린다(앱을 켜 둔 채 날이 바뀌는 경우)
let lastDay = new Date().toDateString();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') applyNotifications();
  if (document.visibilityState === 'visible' && new Date().toDateString() !== lastDay) {
    lastDay = new Date().toDateString();
    recordVisit(getToday().key);
    render();
  }
});

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
