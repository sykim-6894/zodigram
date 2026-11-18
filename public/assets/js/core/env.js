// 실행 환경(웹 또는 iOS·Android 앱)에 따라 달라지는 것을 한곳에 모은다.
// 앱 안에서는 주소가 https://localhost 나 capacitor://localhost 라서, 공유 링크와 서버 호출은 실제 사이트 주소를 써야 한다.
export const SITE_ORIGIN = 'https://zodigram.ksy2202.workers.dev';

/** Capacitor 앱 안에서 실행 중인가 */
export const isNative = () => !!globalThis.Capacitor?.isNativePlatform?.();

/** 사람들에게 공유할 사이트 주소 */
export const publicUrl = () => (isNative() ? `${SITE_ORIGIN}/` : `${location.origin}${location.pathname}`);

/** 서버(api/…) 호출의 앞부분. 웹에서는 상대 주소, 앱에서는 사이트 주소 */
export const apiBase = () => (isNative() ? `${SITE_ORIGIN}/` : '');

/** 공유 창을 사용자가 닫은 경우인가 */
export const isShareCancel = (e) => e?.name === 'AbortError' || /cancel/i.test(String(e?.message || e || ''));

/**
 * 공유 창 열기. 앱에서는 네이티브 공유 플러그인, 웹에서는 Web Share API.
 * 공유할 수단이 없으면 null.
 */
export function shareData(data) {
  const plugin = globalThis.Capacitor?.Plugins?.Share;
  if (isNative() && plugin?.share) {
    return plugin.share({ title: data.title, text: data.text, url: data.url, dialogTitle: data.title });
  }
  return typeof navigator !== 'undefined' && navigator.share ? navigator.share(data) : null;
}
