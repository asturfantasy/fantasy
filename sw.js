const CACHE = 'asturfantasy-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style-claro.css',
  '/js/config.js',
  '/js/app.js',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});