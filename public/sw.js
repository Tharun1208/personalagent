// ==========================================
// RECALL AI SERVICE WORKER (Background Push & Alarms)
// ==========================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Native Notification Display & Background Alarm Receiver
self.addEventListener('push', (event) => {
  let data = { title: 'Recall AI Alarm', message: 'You have a scheduled reminder!', url: '/' };
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
    tag: data.tag || 'recall-alarm',
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
    self.registration.showNotification(data.title || 'Recall AI Alarm', options)
  );
});

// Notification Click and Action Handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'snooze') {
    // Post message to all active clients to handle 5-minute snooze
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'ALARM_ACTION',
            action: 'snooze',
            id: event.notification.data?.id,
          });
        }
      })
    );
  } else if (event.action === 'complete') {
    // Post message to clients to mark completed
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'ALARM_ACTION',
            action: 'complete',
            id: event.notification.data?.id,
          });
        }
      })
    );
  } else {
    // Open app window
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
      })
    );
  }
});
