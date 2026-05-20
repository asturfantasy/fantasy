const CACHE = 'asturfantasy-v2';
const ASSETS = [
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const noCache = ['/js/app.js', '/js/config.js', '/index.html'];
  if (noCache.some(p => url.pathname.endsWith(p))) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});