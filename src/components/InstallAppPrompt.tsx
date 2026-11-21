import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface RelatedApp {
  platform: string;
  id?: string;
  url?: string;
}

declare global {
  interface Navigator {
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
    standalone?: boolean;
  }
}

const DISMISS_KEY = 'stream-app-install-dismissed-until';
const DISMISS_DAYS = 7;

export const InstallAppPrompt: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const isAppWebView = /;\s*wv\)/i.test(navigator.userAgent) || Boolean((window as any).Capacitor);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setHidden(true);
      setInstallPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    const checkInstallation = async () => {
      let alreadyInstalled = isStandalone || isAppWebView;
      if (!alreadyInstalled && navigator.getInstalledRelatedApps) {
        try {
          const related = await navigator.getInstalledRelatedApps();
          alreadyInstalled = related.some((app) => app.platform === 'webapp');
        } catch {
          // Some browsers don't expose installed-app detection; keep the install option available.
        }
      }
      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (!cancelled) {
        setHidden(alreadyInstalled || dismissedUntil > Date.now());
        setReady(true);
      }
    };
    void checkInstallation();

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowInstructions((current) => !current);
      return;
    }
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setHidden(true);
      setInstallPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    setHidden(true);
  };

  if (!ready || hidden) return null;

  return (
    <section
      aria-label="Instalar Stream Flow Pro"
      className="mx-auto my-3 flex w-full max-w-7xl items-start gap-3 rounded-2xl border border-red-500/30 bg-zinc-900/95 px-4 py-3 shadow-lg shadow-red-950/20"
    >
      <div className="mt-0.5 rounded-xl border border-red-500/30 bg-red-500/15 p-2 text-red-300">
        <Download className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">Instalá Stream Flow Pro en tu dispositivo</p>
        <p className="mt-0.5 text-xs text-zinc-400">Abrila desde tu pantalla de inicio y accedé más rápido.</p>
        {showInstructions && (
          <p className="mt-2 text-xs leading-relaxed text-zinc-300">
            En Android o computadora, abrí el menú del navegador y elegí «Instalar app» o «Instalar página». En iPhone o iPad, tocá Compartir y después «Agregar a pantalla de inicio».
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleInstall}
        disabled={installing}
        className="shrink-0 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-60"
      >
        {installing ? 'Abriendo…' : installPrompt ? 'Instalar app' : showInstructions ? 'Ocultar pasos' : 'Cómo instalar'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ocultar invitación de instalación"
        className="shrink-0 rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
};
