import React, { useState } from 'react';
import { User } from '../types';
import { Tv, KeyRound, Mail, Lock, User as UserIcon, ShieldCheck, Sparkles } from 'lucide-react';

interface AuthModalProps {
  onLogin: (email: string, password?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  onRegister: (email: string, password?: string, name?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg('');

    let res;
    if (isRegister) {
      res = await onRegister(email, password, name);
    } else {
      res = await onLogin(email, password);
    }

    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Error de autenticación.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl relative animate-fadeIn">
        {/* Top Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-indigo-600 p-0.5 shadow-xl shadow-red-500/20 mx-auto">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Tv className="w-7 h-7 text-red-500" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">StreamControl PRO</h2>
          <p className="text-xs text-zinc-400">Plataforma de Control de Ventas, Cuentas y Pantallas de Streaming</p>
        </div>

        {/* Grace period banner badge */}
        <div className="bg-gradient-to-r from-amber-500/15 to-red-500/15 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-3 text-xs text-amber-200">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="leading-tight font-medium">
            ¡Incluye <strong className="text-white font-bold">3 Días de Prueba Gratis</strong> al registrarte! Luego puedes extender con Tokens de 30 días.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegister && (
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Nombre Completo</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="ej. Juan Carlos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-white font-medium focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Correo Electrónico *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="tu.correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-white font-medium focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Contraseña *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-white font-medium focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 font-semibold text-xs text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-xl shadow-red-600/25 transition active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isRegister ? 'Crear Cuenta (3 Días Gratis)' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-2 border-t border-zinc-800 text-xs text-zinc-400">
          {isRegister ? (
            <p>
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={() => setIsRegister(false)}
                className="text-red-400 font-bold hover:underline ml-1"
              >
                Inicia Sesión aquí
              </button>
            </p>
          ) : (
            <p>
              ¿Primera vez aquí?{' '}
              <button
                onClick={() => setIsRegister(true)}
                className="text-red-400 font-bold hover:underline ml-1"
              >
                Regístrate y obtiene 3 días de gracia
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
