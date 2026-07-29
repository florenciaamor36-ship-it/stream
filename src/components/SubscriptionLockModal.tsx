import React, { useState } from 'react';
import { User } from '../types';
import { ShieldAlert, KeyRound, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';

interface SubscriptionLockModalProps {
  user: User | null;
  onRedeemToken: (code: string) => Promise<boolean>;
}

export const SubscriptionLockModal: React.FC<SubscriptionLockModalProps> = ({ user, onRedeemToken }) => {
  const [tokenCode, setTokenCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Customer Data for WhatsApp Request
  const [selectedDays, setSelectedDays] = useState<30 | 60 | 90>(30);
  const [custName, setCustName] = useState(user?.name || '');
  const [custEmail, setCustEmail] = useState(user?.email || '');
  const [custPhone, setCustPhone] = useState('');
  const [custCountry, setCustCountry] = useState('Argentina');
  const [custState, setCustState] = useState('');
  const [custCity, setCustCity] = useState('');
  const [showWspForm, setShowWspForm] = useState(false);

  const planOptions = {
    30: {
      days: 30,
      priceArs: 5000,
      originalArs: 5000,
      priceUsdBinance: 4,
      originalUsdBinance: 4,
      discountBadge: null,
      label: '30 Días (Mensual)',
    },
    60: {
      days: 60,
      priceArs: 9000,
      originalArs: 10000,
      priceUsdBinance: 7,
      originalUsdBinance: 8,
      discountBadge: '10% OFF',
      label: '60 Días (Bimestral)',
    },
    90: {
      days: 90,
      priceArs: 12000,
      originalArs: 15000,
      priceUsdBinance: 9.5,
      originalUsdBinance: 12,
      discountBadge: '20% OFF',
      label: '90 Días (Trimestral)',
    },
  };

  const currentPlan = planOptions[selectedDays];

  if (!user) return null;

  const handleRedeemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenCode.trim()) return;

    setIsRedeeming(true);
    setErrorMessage('');
    try {
      const success = await onRedeemToken(tokenCode.trim());
      if (!success) {
        setErrorMessage('El código de token ingresado es inválido, ya fue usado o venció.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al canjear el token.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleSendWhatsApp = () => {
    const rawMsg = `*SOLICITUD DE TOKEN DE SUSCRIPCIÓN - GESTOR STREAMING* 🍿

📋 *Datos del Cliente:*
• *Nombre y Apellido:* ${custName || user.name}
• *Correo de la Cuenta:* ${custEmail || user.email}
• *Teléfono de Contacto:* ${custPhone || 'No especificado'}
• *País:* ${custCountry}
• *Provincia/Estado:* ${custState || 'No especificado'}
• *Ciudad:* ${custCity || 'No especificada'}

💰 *Plan Solicitado:* Suscripción de ${currentPlan.days} Días
💵 *Monto en ARS:* $${currentPlan.priceArs.toLocaleString('es-AR')} ARS
💲 *Monto en USD (Binance P2P):* $${currentPlan.priceUsdBinance} USDT / USD

Por favor enviarme los datos de pago para la activación de mi Token de ${currentPlan.days} Días. ¡Muchas gracias!`;

    const encoded = encodeURIComponent(rawMsg);
    const wspUrl = `https://wa.me/5492235590910?text=${encoded}`;
    window.open(wspUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-zinc-900 border-2 border-red-600/80 rounded-3xl p-6 md:p-8 shadow-2xl shadow-red-900/50 space-y-6 text-white my-auto animate-fadeIn">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-4 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/40 animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-[11px] font-bold uppercase tracking-wider">
            Límite de Prueba Superado (Día 3)
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Suscripción Requerida - Aplicación Bloqueada
          </h2>
          <p className="text-xs text-zinc-300 max-w-md leading-relaxed">
            Tu período de prueba gratis de 3 días ha finalizado. Para seguir administrando tus clientes, cuentas y ventas con sincronización en la nube, selecciona y activa tu plan de suscripción.
          </p>
        </div>

        {/* Plan Selector Buttons */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-300">Selecciona la Duración del Plan:</label>
          <div className="grid grid-cols-3 gap-2">
            {([30, 60, 90] as const).map((days) => {
              const opt = planOptions[days];
              const isSelected = selectedDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setSelectedDays(days)}
                  className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-white">{opt.days} Días</span>
                    {opt.discountBadge && (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {opt.discountBadge}
                      </span>
                    )}
                    {isSelected && !opt.discountBadge && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>

                  <div>
                    {opt.originalArs > opt.priceArs && (
                      <span className="text-[10px] text-zinc-500 line-through mr-1">
                        ${opt.originalArs.toLocaleString('es-AR')}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-amber-400">
                      ${opt.priceArs.toLocaleString('es-AR')} ARS
                    </span>
                  </div>

                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    ~${opt.priceUsdBinance} USDT (Binance)
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Token Redemption Box */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <KeyRound className="w-4 h-4" />
            <span>¿Ya tienes un Código de Token? Actívalo aquí:</span>
          </div>

          <form onSubmit={handleRedeemSubmit} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="STRM-30D-XXXX-XXXX-XXXX"
              value={tokenCode}
              onChange={(e) => setTokenCode(e.target.value.toUpperCase())}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-300 font-bold tracking-widest placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={isRedeeming}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50 shrink-0"
            >
              {isRedeeming ? 'Validando...' : 'Activar'}
            </button>
          </form>

          {errorMessage && (
            <p className="text-[11px] text-red-400 font-medium bg-red-950/50 p-2 rounded-lg border border-red-800">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Request Token via WhatsApp */}
        {!showWspForm ? (
          <div className="bg-gradient-to-r from-emerald-950/60 via-zinc-950 to-emerald-950/40 p-5 rounded-2xl border border-emerald-500/30 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Plan Seleccionado: {currentPlan.days} Días — ${currentPlan.priceArs.toLocaleString('es-AR')} ARS (~${currentPlan.priceUsdBinance} USDT Binance)</span>
            </div>
            <p className="text-xs text-zinc-400">
              Obtén tu token oficial al instante contactándote directamente con el Administrador por WhatsApp.
            </p>
            <button
              onClick={() => setShowWspForm(true)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              Solicitar Token de {currentPlan.days} Días por WhatsApp (+54 9 223 559-0910)
            </button>
          </div>
        ) : (
          /* WhatsApp Details Form */
          <div className="bg-zinc-950 p-5 rounded-2xl border border-emerald-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completa tus datos para enviar por WhatsApp ({currentPlan.days} Días - ${currentPlan.priceArs.toLocaleString('es-AR')} ARS / ${currentPlan.priceUsdBinance} USDT)
              </h4>
              <button
                type="button"
                onClick={() => setShowWspForm(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-zinc-400 text-[10px] mb-0.5">Nombre y Apellido *</label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                  placeholder="Tu nombre completo"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] mb-0.5">Correo de Cuenta *</label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] mb-0.5">Teléfono de Contacto</label>
                <input
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                  placeholder="+54 9..."
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] mb-0.5">País</label>
                <input
                  type="text"
                  value={custCountry}
                  onChange={(e) => setCustCountry(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] mb-0.5">Provincia / Estado</label>
                <input
                  type="text"
                  value={custState}
                  onChange={(e) => setCustState(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                  placeholder="ej. Buenos Aires / Córdoba"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] mb-0.5">Ciudad</label>
                <input
                  type="text"
                  value={custCity}
                  onChange={(e) => setCustCity(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                  placeholder="ej. Mar del Plata"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Abrir WhatsApp ({currentPlan.days} Días - ${currentPlan.priceArs.toLocaleString('es-AR')} ARS / ${currentPlan.priceUsdBinance} USDT)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
