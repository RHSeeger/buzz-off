// Service worker: caches the app shell and data. Bump VERSION on every deploy;
// the page shows an "Update available" toast when a new worker is waiting.

const VERSION = 'v1';
const CACHE = `buzzoff-${VERSION}`;

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/config.js',
  'js/dates.js',
  'js/day.js',
  'js/achievements.js',
  'js/bookmarklet.js',
  'js/nyt.js',
  'js/prng.js',
  'js/puzzle.js',
  'js/stats.js',
  'js/storage.js',
  'js/wordlist.js',
  'js/ui/dom.js',
  'js/ui/help.js',
  'js/ui/hints.js',
  'js/ui/hive.js',
  'js/ui/modal.js',
  'js/ui/progress.js',
  'js/ui/rankings.js',
  'js/ui/settings.js',
  'js/ui/splash.js',
  'js/ui/stats-view.js',
  'js/ui/toast.js',
  'js/ui/yesterday.js',
  'data/words.txt',
  'data/puzzles.txt',
  'data/LICENSE-wordlist.txt',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('buzzoff-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only same-origin files; never Firebase or other third-party traffic.
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
