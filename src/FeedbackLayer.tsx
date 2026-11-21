import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ConfirmationOptions, FeedbackKind, ToastOptions } from './feedback';

interface Toast extends ToastOptions { id: number; kind: FeedbackKind }
interface PendingConfirmation extends ConfirmationOptions { resolve: (confirmed: boolean) => void }

export const FeedbackLayer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    const onToast = (event: Event) => {
      const options = (event as CustomEvent<ToastOptions>).detail;
      const id = nextId.current++;
      setToasts((current) => [...current, { ...options, id, kind: options.kind || 'success' }].slice(-4));
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200);
    };
    const onConfirm = (event: Event) => {
      const detail = (event as CustomEvent<PendingConfirmation>).detail;
      setConfirmation(detail);
    };
    window.addEventListener('streamflow:toast', onToast);
    window.addEventListener('streamflow:confirm', onConfirm);
    return () => {
      window.removeEventListener('streamflow:toast', onToast);
      window.removeEventListener('streamflow:confirm', onConfirm);
    };
  }, []);

  const closeConfirmation = (confirmed: boolean) => {
    confirmation?.resolve(confirmed);
    setConfirmation(null);
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
    error: <XCircle className="h-5 w-5 text-red-400" />,
    info: <Info className="h-5 w-5 text-sky-400" />,
  };

  return (
    <>
      <div className="fixed right-4 top-4 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} role={toast.kind === 'error' ? 'alert' : 'status'} className="flex items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-900/95 p-3.5 shadow-2xl backdrop-blur">
            <div className="mt-0.5 shrink-0">{icons[toast.kind]}</div>
            <p className="flex-1 text-sm text-zinc-100">{toast.message}</p>
            <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Cerrar aviso" className="rounded p-0.5 text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      {confirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeConfirmation(false); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="streamflow-confirm-title" aria-describedby="streamflow-confirm-message" className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-3">
              <span className={`rounded-xl p-2 ${confirmation.danger ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}><AlertTriangle className="h-5 w-5" /></span>
              <h2 id="streamflow-confirm-title" className="text-base font-bold text-white">{confirmation.title}</h2>
            </div>
            <p id="streamflow-confirm-message" className="text-sm leading-relaxed text-zinc-300">{confirmation.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => closeConfirmation(false)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700">Cancelar</button>
              <button type="button" onClick={() => closeConfirmation(true)} className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${confirmation.danger ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>{confirmation.confirmLabel || 'Confirmar'}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
