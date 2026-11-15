// Service worker for mobile.html only. Cache-first for the files listed in ASSETS; every other
// request (the other pages in apps/) is left alone: no respondWith, so the browser handles it.
// VERSION is stamped by build/build_selftest.py (hash of the bank + the cached files).
const VERSION = 'b8801dabe3';
const CACHE = 'fsm-mobile-' + VERSION;
const ASSETS = ['mobile.html', 'selftest_bank.js', 'selftest_drills.js', 'manifest.webmanifest', 'apple-touch-icon.png'];
const BASE = new URL('./', self.location).href;
const URLS = new Set(ASSETS.map(a => BASE + a));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(a => new Request(BASE + a, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('fsm-mobile-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url); u.search = ''; u.hash = '';
  if (!URLS.has(u.href)) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(u.href).then(hit => hit || fetch(r))));
});
