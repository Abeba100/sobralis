// Bump VERSION whenever any cached application file changes.
const VERSION = 'v2';
const PREFIX = `sobralis:${self.registration.scope}:`;
const CACHE = PREFIX + VERSION;
const CORE = ['./', './index.html', './style.css', './app.js', './games.js', './pwa.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const absolute = value => new URL(value, self.registration.scope).href;
const coreURLs = new Set(CORE.map(absolute));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE.map(value => new Request(absolute(value), {cache: 'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  // Keep the shell and its JS modules on the same version until an update is accepted.
  if (event.request.mode === 'navigate') {
    if (url.pathname !== new URL(self.registration.scope).pathname && url.pathname !== new URL('./index.html', self.registration.scope).pathname) return;
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(absolute('./index.html'))) || fetch(event.request)));
  } else if (coreURLs.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
  }
});
