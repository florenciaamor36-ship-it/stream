import React from 'react';
import { Tv, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  onLogin: (email: string, password?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  onRegister: (email: string, password?: string, name?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
}

export const AuthModal: React.FC<AuthModalProps> = () => (
  <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
    <section role="alert" className="bg-zinc-900 border border-amber-500/30 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-5 shadow-2xl text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center mx-auto">
        <Tv className="w-7 h-7 text-red-500" />
      </div>
      <h1 className="text-2xl font-black text-white">StreamControl PRO</h1>
      <div className="flex items-center justify-center gap-2 text-amber-300 font-bold">
        <ShieldAlert className="w-5 h-5" /> Acceso temporalmente deshabilitado
      </div>
      <p className="text-sm text-zinc-300">El inicio de sesión y el registro demo/local no están disponibles. No ingreses credenciales reales: esta aplicación todavía no tiene autenticación segura del lado del servidor.</p>
      <p className="text-xs text-zinc-500">Las funciones de datos y sincronización permanecen desactivadas. La base de datos existente no fue modificada.</p>
    </section>
  </div>
);
