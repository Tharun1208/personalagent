// ==========================================
// ASSISTANCE AI SERVICE WORKER
// Offline app shell + push notifications + background sync
// ==========================================

const CACHE_VERSION = 'v2';
const SHELL_CACHE = `assistance-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `assistance-static-${CACHE_VERSION}`;
const PRECACHE_URLS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---------- Caching strategies ----------

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put('/', response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const cached = (await cache.match(request)) || (await cache.match('/'));
    if (cached) return cached;
    return new Response(
      `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Assistance — Offline</title>
      <style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
      .card{max-width:360px;padding:32px;border-radius:24px;background:#1e293b;text-align:center}
      h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#94a3b8;line-height:1.6;margin:0}
      button{margin-top:20px;padding:10px 18px;border:0;border-radius:12px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}</style></head>
      <body><div class="card"><h1>You're offline</h1>
      <p>Your changes are saved on this device and will sync automatically when the connection returns.</p>
      <button onclick="location.reload()">Try again</button></div></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // APIs stay network-only

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|css|js)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

// ---------- Background sync ----------

self.addEventListener('sync', (event) => {
  if (event.tag !== 'assistance-sync') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' }));
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ---------- Push notifications ----------

self.addEventListener('push', (event) => {
  let data = { title: 'Assistance Alarm', message: 'You have a scheduled reminder!', url: '/' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data.message = event.data.text();
  }

  const options = {
    body: data.message || data.body || 'Your scheduled alarm is ringing!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 400],
    tag: data.tag || 'assistance-alarm',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      id: data.id,
    },
    actions: [
      { action: 'snooze', title: '⏳ Snooze 5m' },
      { action: 'complete', title: '✓ Complete' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Assistance Alarm', options),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'snooze') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'ALARM_ACTION',
            action: 'snooze',
            id: event.notification.data?.id,
          });
        }
      }),
    );
  } else if (event.action === 'complete') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'ALARM_ACTION',
            action: 'complete',
            id: event.notification.data?.id,
          });
        }
      }),
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(event.notification.data?.url || '/');
        }
      }),
    );
  }
});
