// 아침 알림 — 기기(Android·iOS)의 로컬 알림 플러그인과 이어 주는 부분. 웹에서는 아무것도 하지 않는다.
import { isNative } from './env.js';
import { loadProfile, loadNotify } from './storage.js';
import { buildSchedule } from './notify.js';

const plugin = () => globalThis.Capacitor?.Plugins?.LocalNotifications;

/** 아침 알림을 쓸 수 있는 환경인가(앱 안에서만) */
export const notifySupported = () => isNative() && !!plugin();

/** 알림 권한을 요청한다. 허용되면 true */
export async function requestNotifyPermission() {
  const p = plugin();
  if (!p) return false;
  try {
    let st = await p.checkPermissions();
    if (st.display === 'prompt' || st.display === 'prompt-with-rationale') st = await p.requestPermissions();
    return st.display === 'granted';
  } catch { return false; }
}

/** 예약된 알림을 모두 지운다 */
async function clearAll(p) {
  const { notifications } = await p.getPending();
  if (notifications?.length) await p.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
}

/**
 * 저장된 설정과 내 정보에 맞춰 알림을 다시 예약한다.
 * 앱을 켤 때, 다시 돌아올 때, 설정·내 정보가 바뀔 때 부른다. 항상 지우고 새로 예약해 중복되지 않는다.
 * @returns {Promise<number>} 예약한 알림 수
 */
export async function applyNotifications(now = new Date()) {
  const p = plugin();
  if (!isNative() || !p) return 0;
  try {
    await clearAll(p);
    const settings = loadNotify();
    if (!settings.on) return 0;
    const st = await p.checkPermissions();
    if (st.display !== 'granted') return 0;
    const list = buildSchedule(loadProfile(), settings, now);
    if (!list.length) return 0;
    await p.schedule({
      notifications: list.map((n) => ({
        id: n.id, title: n.title, body: n.body,
        schedule: { at: new Date(n.at), allowWhileIdle: true },
        smallIcon: "ic_stat_zodigram", isExactNotification: false,
      })),
    });
    return list.length;
  } catch { return 0; }
}
