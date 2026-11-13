// 화면 템플릿. 각 함수는 HTML 문자열을 반환하고, 이벤트 연결은 app.js가 맡는다.
import { getToday, getEast, getWest, getDailyHexagram } from '../core/fortune.js';
import { monthCalendar } from '../core/almanac.js';
import { STEMS_KO, BRANCHES_KO, STEMS, BRANCHES, ELEMENTS, ELEMENTS_HANJA, STEM_ELEMENT, BRANCH_ELEMENT, tenGod, BRANCH_MAIN_STEM } from '../core/saju.js';
import { TRIGRAMS } from '../data/iching.js';
import { FLOW_LABEL, TEN_GOD_DAY } from '../data/saju-text.js';
import { glyph, roman, hexagramSvg } from './glyphs.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const EL_CLASS = ['el-wood', 'el-fire', 'el-earth', 'el-metal', 'el-water'];

/** 사주·별자리 화면에 쓰는 생일 표기. 음력으로 입력했으면 양력을 괄호로 함께 보여 준다. */
function birthLabel(p) {
  const solar = `양력 ${p.year}년 ${p.month}월 ${p.day}일`;
  if (p.calendar === 'lunar' && p.lunar) {
    const l = p.lunar;
    return `음력 ${l.year}년 ${l.leap ? '윤' : ''}${l.month}월 ${l.day}일(${solar})`;
  }
  return solar;
}

const secHead = (title, sub = '') => `<h2 class="sec-h"><span>${title}</span>${sub ? `<small>${sub}</small>` : ''}</h2>`;

const sideLabel = (side) => side === 'east'
  ? `<div class="side-label east"><span class="seal">東</span>동양</div>`
  : `<div class="side-label west"><span class="seal">西</span>서양</div>`;

function needProfile(side) {
  return `<div class="empty">
    <p>생년월일을 알려 주시면 ${side === 'east' ? '사주와 띠' : '별자리와 수비학'}로 오늘을 읽어 드립니다.</p>
    <a class="btn" href="#/me">생년월일 입력</a>
  </div>`;
}

export function dateline(today) {
  const t = today.date;
  return `<div class="dateline">
    <span>${t.year}. ${t.month}. ${t.day}. ${today.weekday}요일 <i class="lunar">음력 ${today.lunar.leap ? "윤" : ""}${today.lunar.month}. ${today.lunar.day}.</i></span>
    <span class="hanja" title="오늘의 일진">${today.pillar.hanja}일 <i>${today.pillar.hangul}</i></span>
    <span>${moonIcon(today.moon)} ${today.moon.name} ${Math.round(today.moon.illumination * 100)}%</span>
  </div>`;
}

function moonIcon(moon) {
  // 위상에 맞춰 밝은 부분을 그린다
  const e = moon.elongation * Math.PI / 180;
  const k = Math.cos(e); // 1 삭 → -1 망
  const waxing = moon.elongation < 180;
  const rx = Math.abs(k) * 6;
  const sweepOuter = waxing ? 1 : 0;
  const sweepInner = (k > 0) === waxing ? 0 : 1;
  return `<svg class="moon-ico" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" class="dark"/><path class="lit" d="M7 1 A6 6 0 0 ${sweepOuter} 7 13 A${rx} 6 0 0 ${sweepInner} 7 1Z"/></svg>`;
}

function quoteBlock(q, side) {
  return `<figure class="quote ${side}">
    <blockquote>${esc(q.text)}</blockquote>
    ${q.orig ? `<p class="orig">${esc(q.orig)}</p>` : ''}
    <figcaption>${esc(q.src)}</figcaption>
  </figure>`;
}

/* ───────── 홈 ───────── */
export function homeView(profile) {
  const today = getToday();
  const hex = getDailyHexagram(profile);
  let eastBody, westBody;
  if (profile) {
    const e = getEast(profile);
    const w = getWest(profile);
    eastBody = `
      <p class="kicker">오늘의 일진 ${e.daily.todayPillar.hanja} · ${e.daily.tenGod}</p>
      <h3 class="headline">${e.daily.title}</h3>
      <p class="lede">${e.daily.text}</p>
      <dl class="facts">
        <div><dt>흐름</dt><dd>${FLOW_LABEL[e.daily.flow]}</dd></div>
        <div><dt>${e.animal.name}띠</dt><dd>${e.animal.today.title}</dd></div>
        <div><dt>보완 색</dt><dd>${e.complement.color}</dd></div>
      </dl>
      <a class="more" href="#/east">사주 풀이 전체 보기</a>`;
    westBody = `
      <p class="kicker">달이 ${w.moon.moonSignName}에 · 제${w.moon.house}하우스</p>
      <h3 class="headline">${w.moon.houseInfo.area}에 빛이 듭니다</h3>
      <p class="lede">${w.moon.houseInfo.text}</p>
      <dl class="facts">
        <div><dt>별자리</dt><dd>${w.sign.ko}</dd></div>
        <div><dt>개인일 수</dt><dd>${w.personalDay.number}</dd></div>
        <div><dt>오늘의 카드</dt><dd>${w.tarot.card.ko}${w.tarot.reversed ? ' (역)' : ''}</dd></div>
      </dl>
      <a class="more" href="#/west">별자리 풀이 전체 보기</a>`;
  } else {
    eastBody = `<h3 class="headline">사주 · 띠 · 주역</h3>
      <p class="lede">태어난 순간의 하늘과 땅의 기운을 여덟 글자로 읽고, 오늘의 일진과 견주어 봅니다.</p>${needProfile('east')}`;
    westBody = `<h3 class="headline">별자리 · 타로 · 수비학</h3>
      <p class="lede">태어난 날의 태양 자리와 오늘 달의 위치, 그리고 숫자와 카드로 하루를 읽습니다.</p>
      <a class="more" href="#/west/tarot">타로 세 장 바로 뽑기</a>`;
  }

  const greet = profile?.name ? `<p class="greet">${esc(profile.name)} 님의 오늘</p>` : '';

  return `${dateline(today)}
  ${greet}
  <div class="split">
    <section class="col east">${sideLabel('east')}${eastBody}</section>
    <section class="col west">${sideLabel('west')}${westBody}</section>
  </div>

  <section class="sec share">
    <div class="share-row">
      <button class="btn" id="shareCard">오늘 운세 카드 저장·공유</button>
      <button class="btn ghost" id="copyLink">링크 공유</button>
    </div>
    <p class="share-status" id="shareStatus" aria-live="polite"></p>
    <div class="share-preview" id="sharePreview"></div>
  </section>

  <section class="sec">
    ${secHead('오늘의 한마디')}
    <div class="quotes">${quoteBlock(today.eastQuote, 'east')}${quoteBlock(today.westQuote, 'west')}</div>
  </section>

  <section class="sec">
    ${secHead('오늘의 괘', '今日之卦')}
    <div class="hex-row">
      ${hexagramSvg(hex.lines)}
      <div>
        <p class="kicker">${hex.num}. ${hex.fullName} ${hex.hanja}</p>
        <h3 class="headline sm">${hex.keyword}</h3>
        <p>${hex.text}</p>
        <a class="more" href="#/east/iching">직접 동전을 던져 묻기</a>
      </div>
    </div>
  </section>`;
}

/* ───────── 동양 ───────── */
function pillarCell(label, p, dayStem, isDay) {
  if (!p) {
    return `<div class="pillar unknown"><span class="p-label">${label}</span><span class="p-god">&nbsp;</span>
      <span class="p-char">?</span><span class="p-char">?</span><span class="p-read">시간 모름</span></div>`;
  }
  const sg = isDay ? '일간' : tenGod(dayStem, p.stem);
  const bg = tenGod(dayStem, BRANCH_MAIN_STEM[p.branch]);
  return `<div class="pillar${isDay ? ' me' : ''}">
    <span class="p-label">${label}</span>
    <span class="p-god">${sg}</span>
    <span class="p-char ${EL_CLASS[STEM_ELEMENT[p.stem]]}">${STEMS[p.stem]}</span>
    <span class="p-char ${EL_CLASS[BRANCH_ELEMENT[p.branch]]}">${BRANCHES[p.branch]}</span>
    <span class="p-god">${bg}</span>
    <span class="p-read">${STEMS_KO[p.stem]}${BRANCHES_KO[p.branch]}</span>
  </div>`;
}

export function eastView(profile) {
  const today = getToday();
  if (!profile) {
    return `${dateline(today)}<div class="page-head east">${sideLabel('east')}<h1>사주 · 띠 · 주역</h1></div>${needProfile('east')}
      <section class="sec">${secHead('주역 점', '周易')}<p>생년월일 없이도 동전을 던져 괘를 얻을 수 있습니다.</p><a class="btn" href="#/east/iching">주역 점 보기</a></section>`;
  }
  const e = getEast(profile);
  const { pillars, counts } = e.saju;
  const ds = e.saju.dayMaster;
  const max = Math.max(...counts, 1);
  const hex = getDailyHexagram(profile);

  return `${dateline(today)}
  <div class="page-head east">${sideLabel('east')}<h1>${profile.name ? esc(profile.name) + ' 님의 ' : ''}사주</h1></div>

  <section class="sec">
    ${secHead('사주 원국', '四柱八字')}
    <div class="pillars">
      ${pillarCell('시주', pillars.hour, ds)}
      ${pillarCell('일주', pillars.day, ds, true)}
      ${pillarCell('월주', pillars.month, ds)}
      ${pillarCell('연주', pillars.year, ds)}
    </div>
    <p class="note">${birthLabel(profile)}${e.saju.hasTime ? ` ${profile.hour}시 ${profile.minute || 0}분` : ''} 기준. 시주는 한국 표준시에서 30분을 보정한 진태양시로 계산했습니다.</p>
  </section>

  <section class="sec two">
    <div>
      ${secHead('일간', '日干')}
      <p class="kicker">${STEMS[ds]}${ELEMENTS_HANJA[STEM_ELEMENT[ds]]} · ${e.dayMaster.image}</p>
      <p>${e.dayMaster.text}</p>
    </div>
    <div>
      ${secHead('오행 분포', '五行')}
      <ul class="bars">
        ${counts.map((c, i) => `<li><span class="b-label ${EL_CLASS[i]}">${ELEMENTS_HANJA[i]} ${ELEMENTS[i]}</span><span class="b-track"><span class="b-fill ${EL_CLASS[i]}" style="width:${(c / max) * 100}%"></span></span><span class="b-num">${c}</span></li>`).join('')}
      </ul>
      <p class="note">가장 적은 기운은 ${ELEMENTS[e.complement.element]}(${ELEMENTS_HANJA[e.complement.element]}). ${e.complement.advice} 어울리는 색은 ${e.complement.color}, 방향은 ${e.complement.direction}입니다.</p>
    </div>
  </section>

  <section class="sec">
    ${secHead('오늘의 일진', '日辰')}
    <p class="kicker">${e.daily.todayPillar.hanja}(${e.daily.todayPillar.hangul})일 · 내 일간에게 ${e.daily.tenGod} · 흐름 ${FLOW_LABEL[e.daily.flow]}</p>
    <h3 class="headline">${e.daily.title}</h3>
    <p>${e.daily.text}</p>
    <p>${e.daily.relationText}</p>
    <p class="tip"><b>오늘 어울리는 것</b> ${e.daily.tip}</p>
  </section>

  <section class="sec">
    ${secHead(`${e.animal.name}띠`, '十二支')}
    <p>${e.animal.trait}</p>
    <h3 class="headline sm">${e.animal.today.title}</h3>
    <p>${e.animal.today.text}</p>
    <p class="note">띠는 입춘(2월 4일 무렵)을 기준으로 바뀝니다.</p>
  </section>

  <section class="sec">
    ${secHead('오늘의 괘', '周易')}
    <div class="hex-row">
      ${hexagramSvg(hex.lines)}
      <div>
        <p class="kicker">${hex.num}. ${hex.fullName} ${hex.hanja} · ${TRIGRAMS[hex.upper].image} 위에 ${TRIGRAMS[hex.lower].image}</p>
        <h3 class="headline sm">${hex.keyword}</h3>
        <p>${hex.text}</p>
        <a class="more" href="#/east/iching">마음에 둔 질문으로 직접 점치기</a>
      </div>
    </div>
  </section>`;
}

/* ───────── 주역 점 ───────── */
export function ichingView() {
  return `${dateline(getToday())}
  <div class="page-head east">${sideLabel('east')}<h1>주역 점</h1></div>
  <section class="sec">
    <p>묻고 싶은 일을 한 문장으로 떠올린 뒤 동전을 여섯 번 던지세요. 아래 효부터 위로 쌓입니다.</p>
    <label class="field"><span>질문 (저장되지 않습니다)</span><input id="q" type="text" maxlength="80" placeholder="예) 이번 이직을 진행해도 될까?"></label>
    <div class="cast">
      <div class="cast-lines" id="castLines"></div>
      <div class="cast-side">
        <div class="coins" id="coins"></div>
        <button class="btn" id="toss">동전 던지기 <span id="tossCount">0 / 6</span></button>
        <button class="btn ghost" id="reset" hidden>다시 하기</button>
      </div>
    </div>
    <div id="castResult"></div>
  </section>
  <section class="sec">
    ${secHead('읽는 법')}
    <p class="note">동전 셋을 던져 앞면을 3, 뒷면을 2로 셉니다. 합이 7이면 양(─), 8이면 음(- -), 9는 변하는 양, 6은 변하는 음입니다. 변하는 효가 있으면 그것을 뒤집은 괘(지괘)가 일이 흘러갈 방향을 보여 줍니다.</p>
  </section>`;
}

export function castResultHtml(res, question) {
  const p = res.primary;
  const r = res.relating;
  return `<div class="cast-result">
    ${question ? `<p class="kicker">물음 — ${esc(question)}</p>` : ''}
    <div class="hex-pair">
      <div class="hex-row">${hexagramSvg(p.lines, res.changing)}<div>
        <p class="kicker">본괘 · ${p.num}. ${p.fullName} ${p.hanja}</p>
        <h3 class="headline sm">${p.keyword}</h3><p>${p.text}</p></div></div>
      ${r ? `<div class="hex-row">${hexagramSvg(r.lines)}<div>
        <p class="kicker">지괘 · ${r.num}. ${r.fullName} ${r.hanja}</p>
        <h3 class="headline sm">${r.keyword}</h3><p>${r.text}</p></div></div>` : ''}
    </div>
    <p class="note">${r ? `변하는 효 ${res.changing.length}개. 지금은 「${p.keyword}」의 때이고, 「${r.keyword}」 쪽으로 흘러갑니다.` : '변하는 효가 없습니다. 본괘의 뜻이 그대로 오래 이어집니다.'}</p>
  </div>`;
}

/* ───────── 서양 ───────── */
export function tarotCard(card, reversed, pos = '') {
  return `<div class="tcard${reversed ? ' rev' : ''}">
    ${pos ? `<span class="t-pos">${pos}</span>` : ''}
    <div class="t-face">
      <span class="t-num">${roman(card.n)}</span>
      ${glyph(card.symbol)}
      <span class="t-name">${card.ko}</span>
      <span class="t-en">${card.en}</span>
    </div>
  </div>`;
}

export function tarotReading(card, reversed) {
  return `<p class="kicker">${card.ko} · ${reversed ? '역방향' : '정방향'} · ${(reversed ? card.rev : card.up).join(', ')}</p>
    <p>${reversed ? card.revText : card.upText}</p>`;
}

export function westView(profile) {
  const today = getToday();
  if (!profile) {
    return `${dateline(today)}<div class="page-head west">${sideLabel('west')}<h1>별자리 · 타로 · 수비학</h1></div>${needProfile('west')}
      <section class="sec">${secHead('타로', 'Tarot')}<p>생년월일 없이도 카드를 뽑을 수 있습니다.</p><a class="btn west" href="#/west/tarot">타로 세 장 뽑기</a></section>`;
  }
  const w = getWest(profile);
  return `${dateline(today)}
  <div class="page-head west">${sideLabel('west')}<h1>${profile.name ? esc(profile.name) + ' 님의 ' : ''}별자리</h1></div>

  <section class="sec two">
    <div class="sign-block">
      <span class="sign-glyph">${w.sign.glyph}</span>
      <div>
        <p class="kicker">${w.sign.en} · ${w.sign.dates}</p>
        <h3 class="headline">${w.sign.ko}</h3>
        <dl class="facts">
          <div><dt>원소</dt><dd>${w.sign.element}</dd></div>
          <div><dt>성질</dt><dd>${w.sign.mode}</dd></div>
          <div><dt>지배성</dt><dd>${w.sign.ruler}</dd></div>
        </dl>
      </div>
    </div>
    <div>
      <p>${w.sign.trait}</p>
      ${w.sign.cusp ? '<p class="note">별자리 경계일에 태어났습니다. 태어난 시각을 입력하면 더 정확해집니다.</p>' : ''}
    </div>
  </section>

  <section class="sec">
    ${secHead('오늘의 달', 'Moon Transit')}
    <p class="kicker">달 · ${w.moon.moonSignName} ${Math.floor(w.moon.moonDegree)}° · 내 별자리와 ${w.moon.aspect.name}(${w.moon.aspect.tone}) · 제${w.moon.house}하우스</p>
    <h3 class="headline">${w.moon.houseInfo.area}</h3>
    <p>${w.moon.houseInfo.text}</p>
    <p class="note">달은 약 2.5일마다 별자리를 옮깁니다. 앞으로 약 ${Math.max(1, Math.round(w.moon.hoursLeft))}시간 뒤 다음 자리로 넘어갑니다.</p>
  </section>

  <section class="sec two">
    <div>
      ${secHead('생명수', 'Life Path')}
      <p class="big-num">${w.lifePath.number}</p>
      <h3 class="headline sm">${w.lifePath.title}</h3>
      <p>${w.lifePath.text}</p>
    </div>
    <div>
      ${secHead('개인일 수', 'Personal Day')}
      <p class="big-num">${w.personalDay.number}</p>
      <p>${w.personalDay.text}</p>
      <p class="note">올해의 개인년 수는 ${w.personalDay.personalYear}입니다. 탄생석은 ${w.birthstone.name}(${w.birthstone.meaning}).</p>
    </div>
  </section>

  <section class="sec">
    ${secHead('오늘의 카드', 'Daily Tarot')}
    <div class="tarot-daily">
      ${tarotCard(w.tarot.card, w.tarot.reversed)}
      <div>${tarotReading(w.tarot.card, w.tarot.reversed)}
        <p class="note">오늘의 카드는 하루 동안 바뀌지 않습니다.</p>
        <a class="more" href="#/west/tarot">세 장으로 흐름 보기</a></div>
    </div>
  </section>`;
}

/* ───────── 타로 세 장 ───────── */
export function tarotView() {
  return `${dateline(getToday())}
  <div class="page-head west">${sideLabel('west')}<h1>타로 세 장</h1></div>
  <section class="sec">
    <p>마음을 가라앉히고 끌리는 카드 세 장을 고르세요. 고른 순서대로 과거, 현재, 흐름이 됩니다.</p>
    <div class="spread" id="spread"></div>
    <div class="deck" id="deck"></div>
    <div id="reading"></div>
    <button class="btn ghost west" id="reshuffle" hidden>다시 섞기</button>
  </section>`;
}

/* ───────── 내 정보 ───────── */
export function meView(profile) {
  const p = profile || {};
  const date = p.year ? `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` : '';
  const time = p.hour !== undefined && p.hour !== null && p.hour !== '' ? `${String(p.hour).padStart(2, '0')}:${String(p.minute || 0).padStart(2, '0')}` : '';
  const isLunar = p.calendar === 'lunar' && p.lunar;
  const l = p.lunar || {};
  const opts = (n, sel) => Array.from({ length: n }, (_, i) => `<option value="${i + 1}"${sel === i + 1 ? ' selected' : ''}>${i + 1}</option>`).join('');
  return `<div class="page-head"><h1>내 정보</h1></div>
  <form class="form" id="profileForm" autocomplete="off" novalidate>
    <label class="field"><span>이름 또는 별명 <em>선택</em></span><input name="name" maxlength="20" value="${esc(p.name || '')}"></label>

    <fieldset class="field">
      <legend>생년월일</legend>
      <div class="seg" role="radiogroup" aria-label="달력 종류">
        <label><input type="radio" name="calendar" value="solar" ${isLunar ? '' : 'checked'}><span>양력</span></label>
        <label><input type="radio" name="calendar" value="lunar" ${isLunar ? 'checked' : ''}><span>음력</span></label>
      </div>
      <div data-cal="solar" ${isLunar ? 'hidden' : ''}>
        <input name="date" type="date" min="1900-01-01" max="2100-12-31" value="${isLunar ? '' : date}" aria-label="양력 생년월일">
      </div>
      <div data-cal="lunar" ${isLunar ? '' : 'hidden'}>
        <div class="ymd">
          <label><input name="ly" type="number" aria-label="음력 연도" inputmode="numeric" min="1900" max="2100" placeholder="1990" value="${l.year || ''}"><span>년</span></label>
          <label><select name="lm" aria-label="음력 월"><option value="">월</option>${opts(12, l.month)}</select><span>월</span></label>
          <label><select name="ld" aria-label="음력 일"><option value="">일</option>${opts(30, l.day)}</select><span>일</span></label>
        </div>
        <label class="check"><input type="checkbox" name="leap" ${l.leap ? 'checked' : ''}> 윤달</label>
      </div>
      <p class="conv" id="conv" aria-live="polite"></p>
    </fieldset>

    <label class="field"><span>태어난 시각</span><input name="time" type="time" value="${time}" ${p.year && !time ? 'disabled' : ''}></label>
    <label class="check"><input type="checkbox" name="noTime" ${p.year && !time ? 'checked' : ''}> 태어난 시각을 몰라요</label>
    <p class="note">입력한 정보는 이 기기에만 저장되며 어디로도 전송되지 않습니다. 음력은 한국천문연구원 역서와 같은 규칙(한국 표준시 기준)으로 계산하며 1900~2100년을 지원합니다.</p>
    <div class="row">
      <button class="btn" type="submit">저장</button>
      ${profile ? '<button class="btn ghost" type="button" id="clear">지우기</button>' : ''}
    </div>
  </form>`;
}

/* ───────── 소개 ───────── */
export function aboutView() {
  return `<div class="page-head"><h1>Zodigram에 대하여</h1></div>
  <section class="sec">
    <p>Zodigram(별과 괘)은 서양의 별자리(Zodiac)와 동양의 괘(-gram)를 합친 이름입니다. 서양의 별과 동양의 괘로 하루를 읽어 보는 작은 책력이에요. 모든 계산은 브라우저 안에서 이루어지며 생년월일은 서버로 전송되지 않습니다.</p>
  </section>
  <section class="sec two">
    <div>${secHead('동양', '東')}
      <ul class="plain">
        <li><b>사주</b> — 연주는 입춘, 월주는 12절기(태양 황경)로 나눕니다. 시주는 서울 경도에 맞춰 30분 보정합니다.</li>
        <li><b>일진</b> — 오늘의 천간이 내 일간에게 어떤 십신인지로 하루의 성격을 봅니다.</li>
        <li><b>띠</b> — 오늘의 지지와 내 띠의 합·충·해 관계를 봅니다.</li>
        <li><b>주역</b> — 동전 세 개를 여섯 번 던지는 척전법을 씁니다.</li>
      </ul></div>
    <div>${secHead('서양', '西')}
      <ul class="plain">
        <li><b>별자리</b> — 날짜표가 아니라 태어난 날 태양의 실제 황경으로 정합니다.</li>
        <li><b>오늘의 달</b> — 지금 달이 있는 별자리가 내 별자리에서 몇 번째 하우스인지 봅니다.</li>
        <li><b>수비학</b> — 피타고라스식 생명수와 개인일 수를 씁니다.</li>
        <li><b>타로</b> — 메이저 아르카나 22장을 씁니다.</li>
      </ul></div>
  </section>
  <section class="sec"><p class="note">운세는 재미와 성찰을 위한 것입니다. 건강·투자·법률처럼 중요한 결정은 전문가와 상의하세요.</p></section>`;
}

/* ───────── 길일 달력 ───────── */
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const REL_SHORT = { harmony: '합', trine: '합', clash: '충' };
const REL_TEXT = {
  same: '내 일지와 같은 기운의 날', harmony: '내 일지와 육합을 이루는 날', trine: '내 일지와 삼합을 이루는 날',
  clash: '내 일지와 충(沖)하는 날 — 큰 결정은 피하는 편이 좋습니다', harm: '내 일지와 해(害)의 날 — 말조심', neutral: '내 일지와 무난한 날',
};

function lunarShort(l) {
  if (l.day === 1) return `${l.leap ? '윤' : ''}${l.month}월`;
  return `${l.month}.${l.day}`;
}

export function calendarView(profile, ym, selected) {
  const cal = monthCalendar(ym.year, ym.month, profile);
  const today = getToday().date;
  const isToday = (c) => c.year === today.year && c.month === today.month && c.day === today.day;
  const cells = cal.cells.map((c) => {
    if (!c) return '<div class="cal-cell empty"></div>';
    const cls = ['cal-cell'];
    if (c.weekday === 0 || c.holiday) cls.push('red');
    else if (c.weekday === 6) cls.push('sat');
    if (isToday(c)) cls.push('today');
    if (selected === c.day) cls.push('sel');
    if (c.lunar.day === 1) cls.push('l1');
    const tag = c.holiday || c.term || '';
    const rel = c.relation && REL_SHORT[c.relation] ? `<span class="c-rel ${c.relation}">${REL_SHORT[c.relation]}</span>` : '';
    return `<button class="${cls.join(' ')}" data-d="${c.day}" aria-label="${c.month}월 ${c.day}일${c.sonEmpty ? ', 손 없는 날' : ''}${tag ? ', ' + tag : ''}">
      <span class="c-d">${c.day}</span>${c.sonEmpty ? '<span class="c-son" title="손 없는 날"></span>' : ''}
      <span class="c-l">${lunarShort(c.lunar)}</span>
      <span class="c-p">${c.pillar.hanja}</span>
      <span class="c-tag">${tag}</span>${rel}
    </button>`;
  }).join('');

  const real = cal.cells.filter(Boolean);
  const sonDays = real.filter((c) => c.sonEmpty).map((c) => c.day);
  const terms = real.filter((c) => c.term).map((c) => `${c.term} ${c.day}일`);

  return `<div class="page-head"><h1>길일 달력</h1></div>
  <div class="cal-bar">
    <button class="icon-btn" id="calPrev" aria-label="이전 달">‹</button>
    <h2 class="cal-title">${ym.year}년 ${ym.month}월</h2>
    <button class="icon-btn" id="calNext" aria-label="다음 달">›</button>
    <button class="btn ghost sm" id="calToday">오늘</button>
  </div>
  <div class="cal" role="grid">
    ${WEEK.map((w, i) => `<div class="cal-wd${i === 0 ? ' red' : i === 6 ? ' sat' : ''}">${w}</div>`).join('')}
    ${cells}
  </div>
  <ul class="cal-legend">
    <li><span class="c-son"></span>손 없는 날</li>
    ${cal.hasProfile ? '<li><span class="c-rel harmony">합</span>내 일지와 합</li><li><span class="c-rel clash">충</span>내 일지와 충</li>' : '<li><a href="#/me">생년월일을 입력하면</a> 나와 맞는 날·부딪히는 날도 표시됩니다</li>'}
  </ul>
  <div id="calDetail">${selected ? calendarDetail(real.find((c) => c.day === selected), cal.hasProfile) : ''}</div>
  <section class="sec two">
    <div>${secHead('이달의 손 없는 날')}<p class="cal-list">${sonDays.map((d) => `${d}일`).join(' · ')}</p>
      <p class="note">음력 날짜 끝자리가 9와 0인 날로, 이사·개업·혼례 날짜로 예부터 많이 고릅니다.</p></div>
    <div>${secHead('이달의 절기')}<p class="cal-list">${terms.join(' · ') || '—'}</p>
      <p class="note">공휴일은 법정 공휴일 기준이며 대체공휴일과 임시공휴일은 표시하지 않습니다.</p></div>
  </section>`;
}

export function calendarDetail(c, hasProfile) {
  if (!c) return '';
  const g = c.tenGod ? TEN_GOD_DAY[c.tenGod] : null;
  return `<div class="cal-detail">
    <p class="kicker">${c.month}월 ${c.day}일 ${WEEK[c.weekday]}요일 · 음력 ${c.lunar.leap ? '윤' : ''}${c.lunar.month}월 ${c.lunar.day}일 · ${c.pillar.hanja}(${c.pillar.hangul})일</p>
    ${c.holiday || c.term ? `<p class="cal-flags">${[c.holiday, c.term && `절기 ${c.term}`].filter(Boolean).join(' · ')}</p>` : ''}
    <p>${c.sonEmpty ? '<b>손 없는 날</b>입니다. 이사나 개업처럼 움직이는 일에 좋다고 여겨 온 날이에요.' : `손이 <b>${c.sonDir}쪽</b>에 있는 날입니다. 그 방향으로의 이사는 예부터 피했습니다.`}</p>
    ${hasProfile && g ? `<h3 class="headline sm">${g.title}</h3><p>${g.text}</p><p class="note">${c.tenGod}의 날 · ${REL_TEXT[c.relation]}</p>` : ''}
  </div>`;
}
