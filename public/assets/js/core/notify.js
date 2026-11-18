// 아침 알림 — 화면·플러그인과 분리된 계산 부분.
// 앱을 열지 않아도 알림이 오도록, 앞으로 며칠 치 알림을 미리 계산해 기기에 예약한다.
import { getScore } from './fortune.js';

export const NOTIFY_DAYS = 14; // 한 번에 예약하는 날 수(iOS는 예약 64개까지)
export const DEFAULT_NOTIFY = { on: false, hour: 8, minute: 0 };

/** 저장값을 안전한 설정으로 고친다 */
export function normalizeNotify(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const hour = Number.isInteger(r.hour) && r.hour >= 0 && r.hour <= 23 ? r.hour : DEFAULT_NOTIFY.hour;
  const minute = Number.isInteger(r.minute) && r.minute >= 0 && r.minute <= 59 ? r.minute : DEFAULT_NOTIFY.minute;
  return { on: r.on === true, hour, minute };
}

/** "07:30" ↔ {hour, minute} */
export const timeText = (s) => `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`;
export function parseTime(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text || ''));
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return { hour: +m[1], minute: +m[2] };
}

/** 알림 한 건의 제목과 내용 */
export function notifyText(profile, at) {
  const { score } = getScore(profile, at);
  return {
    title: `오늘의 운세 ${score.total}점`,
    body: `${score.message.advice}
“${score.message.east.text}” — ${score.message.east.src}`,
  };
}

/**
 * 지금부터 앞으로 days 일 동안의 알림 목록.
 * at 은 기기 현지 시각(ISO 문자열), id 는 1부터. 이미 지난 시각은 뺀다.
 */
export function buildSchedule(profile, settings, now = new Date(), days = NOTIFY_DAYS) {
  const s = normalizeNotify(settings);
  if (!s.on || !profile || !profile.year) return [];
  const list = [];
  for (let i = 0; i < days; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, s.hour, s.minute, 0, 0);
    if (at.getTime() <= now.getTime()) continue;
    list.push({ id: list.length + 1, at: at.toISOString(), ...notifyText(profile, at) });
  }
  return list;
}
