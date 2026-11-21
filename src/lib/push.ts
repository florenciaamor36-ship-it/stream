import { apiRequest } from './storage';

export async function enableExpiryPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Este navegador no admite notificaciones push. Probá desde Chrome o Edge actualizado.');
  }
  const configResponse = await apiRequest('/api/push/public-key');
  const config = await configResponse.json();
  if (!config.enabled || !config.publicKey) throw new Error('Las notificaciones todavía no están habilitadas en el servidor.');

  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('No se concedió permiso para mostrar notificaciones.');

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeApplicationServerKey(config.publicKey) });
  try {
    const response = await apiRequest('/api/push/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });
    if (!response.ok) throw new Error('No se pudo guardar el permiso de notificaciones.');
  } catch (error) {
    await subscription.unsubscribe().catch(() => false);
    throw error;
  }
}

export async function disableExpiryPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/stream/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await apiRequest('/api/push/subscriptions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}

export function readExpiryPushState(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(false);
  return navigator.serviceWorker.getRegistration('/stream/').then(async (registration) => !!(await registration?.pushManager.getSubscription()));
}

function decodeApplicationServerKey(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}
