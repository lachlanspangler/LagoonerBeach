// Offline service worker (web/PWA only; the native shells don't register it — ADR 0005).
//
// Registered as ./sw.js?v=<build id>: a new build is a new script URL, so the browser installs a
// fresh worker with its own cache and the old caches are dropped on activate.
//  - navigations / index.html: network-first (a deploy is picked up on the next load), cache fallback
//  - hashed ./assets/*: cache-first (immutable by name)
//  - other same-origin files (fonts, icons, manifest): cache, refreshed in the background
//  - a JS/CSS/asset request is never answered with index.html (that breaks module loading)
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const PREFIX = 'lagooner-';
const CACHE = PREFIX + VERSION;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
const scope = () => new URL(self.registration.scope);

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      await c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })));
      // precache what the shell needs to boot offline (the entry script and CSS it references)
      const html = await (await c.match('./index.html'))?.text();
      const refs = [...(html ?? '').matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]);
      await Promise.all(refs.map((u) => c.add(new URL(u, scope()).href).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const ks = await caches.keys();
      await Promise.all(
        ks.filter((k) => k !== CACHE && (k.startsWith(PREFIX) || k === 'atoll-v1')).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const res = await fetch(req); // (a navigate Request can't take a RequestInit)
    if (res.ok) await c.put('./index.html', res.clone());
    return res;
  } catch {
    return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
  }
}

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await c.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, e) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  const net = fetch(req).then(async (res) => {
    if (res.ok) await c.put(req, res.clone());
    return res;
  });
  if (hit) {
    e.waitUntil(net.catch(() => undefined));
    return hit;
  }
  return net;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname.slice(scope().pathname.length - 1); // '/…' relative to the app root
  if (req.mode === 'navigate' || path === '/' || path === '/index.html') e.respondWith(networkFirst(req));
  else if (path.startsWith('/assets/')) e.respondWith(cacheFirst(req));
  else if (path !== '/sw.js') e.respondWith(staleWhileRevalidate(req, e));
});
