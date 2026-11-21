import React, { useEffect, useState } from 'react';
import { Bell, BellOff, LoaderCircle } from 'lucide-react';
import { disableExpiryPush, enableExpiryPush, readExpiryPushState } from '../lib/push';
import { notifyToast } from '../lib/feedback';
import { apiRequest } from '../lib/storage';

declare global {
  interface Window {
    StreamFlowAndroid?: {
      isExpiryNotificationsEnabled: () => boolean;
      requestExpiryNotifications: () => void;
      disableExpiryNotifications: () => void;
    };
  }
}

export const PushNotificationsSettings: React.FC = () => {
  const [supported, setSupported] = useState(false);
  const [nativeAndroid, setNativeAndroid] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const inAndroidApp = Boolean(window.StreamFlowAndroid);
    const available = inAndroidApp || ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
    setNativeAndroid(inAndroidApp);
    setSupported(available);
    if (inAndroidApp) setEnabled(window.StreamFlowAndroid!.isExpiryNotificationsEnabled());
    else if (available) void readExpiryPushState().then(setEnabled).catch(() => setEnabled(false));
    if (available) {
      void apiRequest('/api/notifications/expirations').then(() => {
        if (inAndroidApp) { setServerReady(true); return; }
        return apiRequest('/api/push/public-key').then((response) => response.json()).then((config) => setServerReady(config.enabled === true));
      }).catch(() => setServerReady(false));
    }
    const onNativeState = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean; message?: string }>).detail;
      setEnabled(detail.enabled);
      setBusy(false);
      notifyToast({ message: detail.message || (detail.enabled ? 'Avisos de vencimientos activados en Android.' : 'No se activaron los avisos en Android.'), kind: detail.enabled ? 'success' : 'info' });
    };
    window.addEventListener('streamflow:native-notification-state', onNativeState);
    return () => window.removeEventListener('streamflow:native-notification-state', onNativeState);
  }, []);

  const toggle = async () => {
    if (nativeAndroid && window.StreamFlowAndroid) {
      setBusy(true);
      if (enabled) window.StreamFlowAndroid.disableExpiryNotifications();
      else window.StreamFlowAndroid.requestExpiryNotifications();
      return;
    }
    setBusy(true);
    try {
      if (enabled) {
        await disableExpiryPush();
        setEnabled(false);
        notifyToast({ message: 'Se desactivaron los avisos de vencimientos en este dispositivo.', kind: 'info' });
      } else {
        await enableExpiryPush();
        setEnabled(true);
        notifyToast({ message: 'Avisos push de vencimientos activados en este dispositivo.', kind: 'success' });
      }
    } catch (error) {
      notifyToast({ message: error instanceof Error ? error.message : 'No se pudo actualizar el permiso de notificaciones.', kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/15 p-2.5 text-amber-300"><Bell className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-white">Avisos push de vencimientos</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
              {nativeAndroid
                ? 'Android revisa vencimientos cada algunas horas con conexión a internet y puede avisarte aunque cierres la app. El aviso no incluye nombres de clientes ni credenciales.'
                : 'Recibí un aviso push diario si hay servicios que vencen hoy, mañana o dentro de 3 días, incluso con la web cerrada. El aviso no incluye nombres de clientes ni credenciales.'}
            </p>
            {!supported && <p className="mt-2 text-xs text-amber-300">Este navegador no ofrece push. En Android, usá Chrome y agregá la web a la pantalla de inicio para tener el mejor soporte.</p>}
            {supported && !serverReady && <p className="mt-2 text-xs text-amber-300">El servidor todavía no está configurado para enviar push; el control se habilitará cuando esté listo.</p>}
          </div>
        </div>
        <button type="button" onClick={toggle} disabled={!supported || !serverReady || busy} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? 'border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'}`}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : enabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {busy ? 'Actualizando…' : enabled ? 'Desactivar en este dispositivo' : 'Activar avisos push'}
        </button>
      </div>
    </section>
  );
};
