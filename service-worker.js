// Namitete Co-Students — service worker
//
// Goal: the static shell (HTML/CSS/JS/icons) loads instantly even on a
// weak or absent connection, since that's the exact situation most
// students are actually in. All *dynamic* content (posts, chat, library
// data, auth) still comes from Supabase over the network as normal —
// this worker only ever touches the static files that make up the app
// itself, never the live data inside it.
//
// Bump this version string whenever shell files change, so returning
// visitors pick up the update instead of being stuck on an old cached
// copy indefinitely.
const SHELL_CACHE = 'namitete-shell-v4';
const RUNTIME_CACHE = 'namitete-runtime-v4';

const SHELL_URLS = [
  '/',
  '/index.html',
  '/zati-chani.html',
  '/style.css',
  '/sports.css',
  '/library.css',
  '/studentunion.css',
  '/zati-chani.css',
  '/script.js',
  '/club-room.js',
  '/auth-scene.js',
  '/sports.js',
  '/studentunion.js',
  '/zati-chani.js',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/wrench-icon.png',
  '/assets/bg-classroom.jpg',
  '/assets/bg-library.png',
  '/assets/bg-sports.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/icon-maskable-512.png',
  '/assets/apple-touch-icon.png',
];

// Cross-origin resources worth caching for offline use (fonts, the
// Supabase JS *library* itself) — NOT the Supabase API/realtime host,
// which must always hit the network. Listed separately from SHELL_URLS
// since cross-origin fetches during install can reject the whole install
// on a CORS/opaque-response hiccup; these are best-effort instead.
const RUNTIME_PRECACHE_URLS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_URLS);
    const runtime = await caches.open(RUNTIME_CACHE);
    await Promise.allSettled(
      RUNTIME_PRECACHE_URLS.map((url) => runtime.add(url).catch(() => {}))
    );
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// Never touch Supabase's API/auth/realtime traffic, or anything that
// isn't a plain GET — those must always go straight to the network
// untouched. This is the one rule everything else depends on.
function isSupabaseApi(url) {
  return url.hostname.endsWith('.supabase.co');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (isSupabaseApi(url)) return; // let the browser handle it natively — no interception at all

  // HTML navigations — network-first, so anyone with a working connection
  // always gets the current site, but a failed/offline request instantly
  // falls back to the last cached shell instead of the browser's blank
  // "no internet" page.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(req)) || (await cache.match('/index.html'));
      }
    })());
    return;
  }

  // Same-origin static shell files — cache-first, since these only change
  // when this worker's SHELL_CACHE version is bumped, not from request to
  // request. Falls back to network (and quietly fills the cache) for
  // anything not in the original precache list.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return cached; // undefined — nothing we can do for an uncached same-origin miss offline
      }
    })());
    return;
  }

  // Cross-origin static resources (fonts, the Supabase JS library file
  // itself) — stale-while-revalidate: serve the cached copy immediately
  // if we have one, and refresh it in the background for next time.
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const networkFetch = fetch(req)
      .then((fresh) => { cache.put(req, fresh.clone()); return fresh; })
      .catch(() => cached);
    return cached || networkFetch;
  })());
});
