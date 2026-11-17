const VERSION = 'frasier-v21';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js', 'vendor/firebase-firestore-compat.js', 'vendor/firebase-app-check-compat.js', 'ext/core.js', 'ext/m-plan.js', 'ext/m-sentence.js', 'ext/m-talk.js', 'ext/m-journal.js', 'ext/m-read.js'];
const DATA = 'frasier-data-v2';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== DATA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // blocos de frases: cache primeiro (nunca mudam)
  if (url.origin === location.origin && /\/data\/[a-z-]+\/c\d+\.json$/.test(url.pathname)) {
    e.respondWith(caches.open(DATA).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // atividades (ext/*.js): rede primeiro, cache se offline (para atualizar junto com a página)
  if (url.origin === location.origin && /\/ext\/[\w-]+\.js$/.test(url.pathname)) {
    e.respondWith(fetch(req, { cache:'no-cache' }).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
    return;
  }
  // página: rede primeiro, cache se offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache:'no-cache' }).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return res; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // resto (app, ícones, fontes): cache e atualiza em segundo plano
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
