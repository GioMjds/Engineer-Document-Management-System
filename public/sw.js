const CACHE_NAME = 'docu-collab-cache-v5';
const OFFLINE_URL = '/offline';
const PUBLIC_ASSETS = [
  OFFLINE_URL,
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-maskable-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          PUBLIC_ASSETS.map((url) => new Request(url, { cache: 'reload' })),
        ),
      ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(OFFLINE_URL)) ?? Response.error();
    }),
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'CVTEC EDMS', {
      body: data.body || '',
      icon: '/icon-192x192.png',
      badge: '/favicon-32x32.png',
      tag: data.tag,
      data: { url: data.url || '/dashboard' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const fallback = self.location.origin + '/dashboard';
  const target = new URL(
    event.notification.data?.url || '/dashboard',
    self.location.origin,
  );
  // Ignore cross-origin targets so a payload cannot open an arbitrary site.
  const url = target.origin === self.location.origin ? target.href : fallback;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        const open = windows[0];
        if (open) return open.focus().then((w) => w.navigate(url));
        return self.clients.openWindow(url);
      }),
  );
});
