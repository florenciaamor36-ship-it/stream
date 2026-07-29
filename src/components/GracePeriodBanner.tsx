import React from 'react';
import { User } from '../types';
import { getDaysRemaining } from '../lib/utils';
import { KeyRound, ShieldAlert, Sparkles, Clock } from 'lucide-react';

interface GracePeriodBannerProps {
  user: User | null;
  onOpenRedeemToken: () => void;
}

export const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({ user, onOpenRedeemToken }) => {
  if (!user) return null;

  const subDays = user.subscriptionUntil ? getDaysRemaining(user.subscriptionUntil) : 0;
  const graceDays = user.gracePeriodUntil ? getDaysRemaining(user.gracePeriodUntil) : 0;

  // Don't show banner if user has more than 5 days active subscription
  if (subDays > 5) return null;

  let title = 'Prueba Gratis de 3 Días Activa';
  let desc = `Cuentas con ${graceDays} día(s) de prueba de gracia para explorar y gestionar todas las ventas del sistema.`;
  let bgColor = 'from-amber-950/80 via-zinc-900 to-amber-950/40 border-amber-500/40 text-amber-200';
  let buttonText = 'Canjear Token (30 Días)';

  if (subDays <= 0 && graceDays <= 0) {
    title = 'Suscripción Vencida';
    desc = 'Tu período de prueba y suscripción ha finalizado. Ingresa un Token de 30 Días para continuar operando sin interrupciones.';
    bgColor = 'from-red-950/90 via-zinc-900 to-red-950/50 border-red-500/50 text-red-200';
  } else if (subDays <= 5 && subDays > 0) {
    title = `Tu Suscripción Vence en ${subDays} día(s)`;
    desc = 'Renueva a tiempo con un código Token para extender tu acceso 30 días más.';
    bgColor = 'from-amber-950/70 via-zinc-900 to-amber-950/30 border-amber-500/30 text-amber-200';
  }

  return (
    <div className={`mb-6 rounded-2xl p-4 border bg-gradient-to-r shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${bgColor}`}>
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
          <Clock className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
            {title}
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono">
              30 DÍAS POR TOKEN
            </span>
          </h4>
          <p className="text-xs opacity-90 mt-0.5 max-w-2xl">{desc}</p>
        </div>
      </div>

      <button
        onClick={onOpenRedeemToken}
        className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95 shrink-0"
      >
        <KeyRound className="w-4 h-4" />
        {buttonText}
      </button>
    </div>
  );
};
