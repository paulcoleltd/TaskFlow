/**
 * TaskFlow Service Worker — Push Notifications + App-Shell Caching
 *
 * Dual responsibilities:
 *   1. PUSH — handles Web Push events and notification clicks (Phase 6)
 *   2. CACHE — app-shell caching strategy for offline support (Phase 7)
 *
 * Caching strategy:
 *   • Static assets (JS/CSS/fonts/images) → Cache-First
 *     Fingerprinted filenames mean a new hash = new cache entry; stale content
 *     is never served for actually-changed files.
 *   • Google Fonts → Cache-First (long TTL, stable URLs)
 *   • Navigation requests (HTML) → Network-First with /index.html fallback
 *     The SPA shell is served from cache when offline so routing still works.
 *   • /api/* and /socket.io → Network-Only
 *     Real-time and auth calls must never be served stale.
 *
 * Security notes (MITRE T1204 / OWASP A05):
 *   - Push payload parsed with try/catch — malformed payloads silently dropped.
 *   - notificationclick navigates to relative URLs only — no open-redirect risk.
 *   - Cache entries are versioned; old caches purged on activate.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE   = `taskflow-shell-${CACHE_VERSION}`;
const ASSET_CACHE   = `taskflow-assets-${CACHE_VERSION}`;
const FONT_CACHE    = `taskflow-fonts-${CACHE_VERSION}`;

const APP_ORIGIN = self.location.origin;

// Assets to pre-cache on install (minimal app shell)
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

// ── Lifecycle: install ────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately without a page reload
  self.skipWaiting();

  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => {
        // Pre-caching failures are non-fatal — the SW still installs
      })
    )
  );
});

// ── Lifecycle: activate ───────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      clients.claim(),
      // Purge caches from old versions
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('taskflow-') && ![SHELL_CACHE, ASSET_CACHE, FONT_CACHE].includes(k))
            .map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET and cross-origin requests (except Google Fonts).
  //    Use exact origin matching — url.origin.includes('fonts.g') is too broad and
  //    would match crafted hostnames like evil-fonts.g.attacker.com (CWE-184).
  const GOOGLE_FONTS_ORIGINS = new Set([
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ]);
  const isGoogleFont = GOOGLE_FONTS_ORIGINS.has(url.origin);

  if (request.method !== 'GET') return;
  if (url.origin !== APP_ORIGIN && !isGoogleFont) return;

  // 2. Network-only: API calls and Socket.io (must never be stale)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) return;

  // 3. Cache-First: Google Fonts (exact-origin checked above)
  if (isGoogleFont) {
    event.respondWith(cacheFirst(FONT_CACHE, request));
    return;
  }

  // 4. Cache-First: hashed static assets (Vite adds content hash to filenames)
  //    Recognised by: /assets/ path OR extension is js/css/png/jpg/svg/woff2/ico
  if (
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|png|jpg|jpeg|webp|svg|woff2?|ico)(\?.*)?$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(ASSET_CACHE, request));
    return;
  }

  // 5. Network-First with shell fallback: SPA navigation (HTML documents)
  if (request.headers.get('Accept')?.includes('text/html') || url.pathname === '/') {
    event.respondWith(networkFirstWithShellFallback(request));
    return;
  }
});

// ── Cache helpers ─────────────────────────────────────────────────────────────

async function cacheFirst(cacheName, request) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Offline and not cached — return a minimal error response
    return new Response('Offline — resource not cached.', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

async function networkFirstWithShellFallback(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Offline — serve the cached shell (SPA handles routing client-side)
    const shell = await cache.match('/index.html') ?? await cache.match('/');
    if (shell) return shell;
    return new Response('<h1>You are offline</h1><p>Please reconnect to use TaskFlow.</p>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// ── Push event ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    return;
  }

  const title = String(data.title ?? 'TaskFlow').slice(0, 100);
  const body  = String(data.body  ?? '').slice(0, 200);
  const icon  = data.icon  ?? '/favicon.svg';
  const badge = data.badge ?? '/favicon.svg';
  const tag   = String(data.tag   ?? 'taskflow').slice(0, 64);
  const url   = String(data.url   ?? '/').replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, '');

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data:               { url },
      vibrate:            [100, 50, 100],
      requireInteraction: false,
      actions: [
        { action: 'open',    title: 'Open'    },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const rawUrl  = event.notification.data?.url ?? '/';
  const safePath = rawUrl.startsWith('/') ? rawUrl : '/';
  const targetUrl = APP_ORIGIN + safePath;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(APP_ORIGIN) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
