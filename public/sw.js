// Cache-first (stale-while-revalidate) service worker for static app-shell
// assets only. API calls (/api/*) and third-party data (weather, rates)
// always go to the network.
//
// Bump CACHE_NAME on every deploy that changes a file in STATIC_ASSETS.
// The browser only re-runs `install` when sw.js itself changes byte-for-byte,
// so touching only e.g. rates.js is invisible to it — the old cached copy
// would otherwise be served forever. Background revalidation below also
// self-heals this for the *next* load, but the bump still matters for the
// very first load after a fix ships.
const CACHE_NAME = 'bangkok-buddy-v5';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/app.css',
  '/js/app.js',
  '/js/api.js',
  '/js/store.js',
  '/js/rates.js',
  '/js/imageintake.js',
  '/js/tools/dashboard.js',
  '/js/tools/converter.js',
  '/js/tools/routes.js',
  '/js/tools/passport.js',
  '/js/tools/planner.js',
  '/js/tools/menu.js',
  '/js/tools/addresses.js',
  '/js/tools/notes.js',
  '/js/data/dishes.js',
  '/js/data/fairprices.js',
  '/js/data/transit.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;

  const revalidate = caches.open(CACHE_NAME).then((cache) =>
    fetch(event.request)
      .then((res) => {
        if (res.ok && STATIC_ASSETS.includes(url.pathname)) {
          cache.put(event.request, res.clone());
        }
        return res;
      })
      .catch(() => undefined)
  );

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve the cached copy immediately, but refresh it in the
        // background so the next load picks up any change automatically.
        event.waitUntil(revalidate);
        return cached;
      }
      return revalidate.then((res) => res || Response.error());
    })
  );
});
