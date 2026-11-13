// 오프라인 지원: 앱 셸은 미리 캐시, 나머지는 네트워크 우선.
const VERSION = 'zodigram-v8';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icon.svg', 'assets/css/style.css',
  'assets/js/app.js', 'assets/js/ui/views.js', 'assets/js/ui/glyphs.js',
  'assets/js/core/astro.js', 'assets/js/core/saju.js', 'assets/js/core/western.js', 'assets/js/core/iching.js',
  'assets/js/core/fortune.js', 'assets/js/core/seed.js', 'assets/js/core/storage.js', 'assets/js/core/lunar.js', 'assets/js/core/almanac.js', 'assets/js/ui/share.js', 'assets/js/core/score.js',
  'assets/js/data/iching.js', 'assets/js/data/tarot.js', 'assets/js/data/western.js',
  'assets/js/data/quotes.js', 'assets/js/data/saju-text.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
