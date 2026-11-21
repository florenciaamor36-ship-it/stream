self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Stream Flow Pro', body: 'Tenés una actualización importante.' };
  }
  const title = String(payload.title || 'Stream Flow Pro').slice(0, 100);
  const body = String(payload.body || 'Abrí Stream Flow Pro para ver el detalle.').slice(0, 220);
  const tag = String(payload.tag || 'stream-flow-notification').slice(0, 100);
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/stream/icons/icon-192.png',
    badge: '/stream/icons/icon-192.png',
    tag,
    renotify: false,
    data: { url: '/stream/?tab=expirations' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/stream/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
