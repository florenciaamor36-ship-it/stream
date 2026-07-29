import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, Check, Tv, FileText, Lock, Award } from 'lucide-react';

interface TermsModalProps {
  user: User;
  onAccept: () => Promise<void>;
}

export const TermsModal: React.FC<TermsModalProps> = ({ user, onAccept }) => {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!accepted) return;
    setLoading(true);
    await onAccept();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl my-auto p-6 sm:p-8 space-y-6 shadow-2xl relative text-zinc-300 animate-fadeIn max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-indigo-600 p-0.5 shadow-lg shrink-0">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-red-500" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Términos, Condiciones y Licencia de Uso
            </h2>
            <p className="text-xs text-zinc-400">
              Bienvenido <strong className="text-white">{user.name || user.email}</strong>. Por favor lee y acepta las condiciones antes de acceder.
            </p>
          </div>
        </div>

        {/* Scrollable Terms Content */}
        <div className="overflow-y-auto space-y-4 text-xs leading-relaxed pr-2 scrollbar-thin scrollbar-thumb-zinc-700 font-sans border border-zinc-800/60 rounded-2xl p-4 bg-zinc-950/60">
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-3">
            <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300 text-xs">Propiedad Intelectual y Créditos de Desarrollo</p>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                Esta plataforma es un <strong>producto desarrollado formalmente por La Clave Argentina y Tienda SSH en el año 2026</strong>. Todos los derechos reservados.
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400" /> 1. Licencia de Uso del Software
            </h3>
            <p className="text-zinc-400">
              Se concede al usuario una licencia de uso personal e intransferible para la gestión privada de inventarios, cuentas, pantallas de streaming y agenda de clientes. Queda estrictamente prohibida la copia, reventa, redistribución o modificación no autorizada del código fuente de esta aplicación.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
              <Tv className="w-4 h-4 text-indigo-400" /> 2. Responsabilidad de Contenidos y Servicios
            </h3>
            <p className="text-zinc-400">
              StreamControl PRO opera como una herramienta de software para administración y control logístico. La plataforma no almacena ni distribuye material audiovisual ni retransmisiones directas. La gestión y legalidad de las cuentas y servicios de terceros ingresados por el usuario es responsabilidad exclusiva del titular de la cuenta.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" /> 3. Privacidad e Integridad de Datos
            </h3>
            <p className="text-zinc-400">
              Tus credenciales y datos de clientes están protegidos mediante arquitecturas con aislamiento por usuario. Puedes respaldar y restaurar tu base de datos mediante archivos JSON cifrados o estructurados en cualquier momento.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> 4. Garantía de Servicio y Suscripciones
            </h3>
            <p className="text-zinc-400">
              El acceso al panel se mantiene activo según el periodo de gracia otorgado o la vigencia de los tokens de suscripción canjeados.
            </p>
          </div>
        </div>

        {/* Checkbox and Accept Action */}
        <div className="space-y-4 pt-2 border-t border-zinc-800/80 shrink-0">
          <label className="flex items-start gap-3 cursor-pointer bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition">
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-red-500 focus:ring-offset-zinc-900"
              />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white">He leído, comprendo y acepto los Términos y Condiciones</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Reconozco el derecho de autor de <strong>La Clave Argentina y Tienda SSH (2026)</strong> y acepto las políticas de uso del panel.
              </p>
            </div>
          </label>

          <button
            onClick={handleConfirm}
            disabled={!accepted || loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-red-600/25 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Procesando...</span>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Aceptar Términos y Entrar a la App</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Credit Line */}
        <div className="text-center text-[11px] text-zinc-500 font-medium">
          Producto desarrollado por <strong className="text-zinc-400">La Clave Argentina y Tienda SSH</strong> © 2026. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
};
