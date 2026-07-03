/**
 * BlinkGo Service Worker (v5.2)
 * Provides offline support, fast caching, and PWA capabilities
 */

const CACHE_NAME = 'blinkgo-v5.2';
const RUNTIME_CACHE = 'blinkgo-runtime-v5.2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './icon-512.png',
  './logo-512.png',
  './assets/favicon.png',
  './assets/icon-512.png',
  './assets/logo-512.png',
  './health-check.html',
  './sync-test.html'
];

// Install: precache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })))
          .catch((err) => {
            // Some resources may fail (e.g., 404) — log but don't fail install
            console.warn('[SW] Pre-cache partial failure:', err?.message);
            return cache.addAll(PRECACHE_URLS.filter((u) => !u.includes('assets/')));
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: stale-while-revalidate for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests (Firebase, Stripe, Google Maps) — they have their own caching
  if (url.origin !== self.location.origin) {
    return; // let browser handle
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Network-first for HTML pages
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the new version
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Stale-while-revalidate for assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// Listen for skip waiting from page
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
