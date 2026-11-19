import React, { useState } from 'react';
import { Tv, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  enabled: boolean;
  onLogin: (email: string, password?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  onRegister: (email: string, password?: string, name?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
}

export const AuthModal: React.FC<AuthModalProps> = ({ enabled, onLogin, onRegister }) => {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = registering ? await onRegister(email, password, name) : await onLogin(email, password);
      if (!result.success) setError(result.error ?? 'No se pudo autenticar.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo autenticar.'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
    <section className="bg-zinc-900 border border-amber-500/30 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-5 shadow-2xl text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center mx-auto"><Tv className="w-7 h-7 text-red-500" /></div>
      <h1 className="text-2xl font-black text-white">StreamControl PRO</h1>
      {!enabled ? <>
        <div className="flex items-center justify-center gap-2 text-amber-300 font-bold"><ShieldAlert className="w-5 h-5" /> Acceso seguro aún no configurado</div>
        <p className="text-sm text-zinc-300">Firebase permanece apagado por seguridad. No ingreses credenciales hasta verificar el proyecto y las reglas de acceso.</p>
        <p className="text-xs text-zinc-500">La aplicación no consulta ni modifica datos hasta habilitar una configuración revisada.</p>
      </> : <>
        <div className="flex justify-center gap-4 text-sm">
          <button type="button" onClick={() => { setRegistering(false); setError(''); }} className={!registering ? 'text-white font-bold' : 'text-zinc-400'}>Ingresar</button>
          <button type="button" onClick={() => { setRegistering(true); setError(''); }} className={registering ? 'text-white font-bold' : 'text-zinc-400'}>Crear cuenta</button>
        </div>
        <form onSubmit={submit} className="space-y-3 text-left">
          {registering && <input aria-label="Nombre" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" className="w-full rounded-xl bg-zinc-800 p-3 text-white" />}
          <input aria-label="Correo" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" className="w-full rounded-xl bg-zinc-800 p-3 text-white" />
          <input aria-label="Contraseña" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" className="w-full rounded-xl bg-zinc-800 p-3 text-white" />
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-red-600 p-3 font-bold text-white disabled:opacity-60">{busy ? 'Un momento…' : registering ? 'Crear cuenta' : 'Ingresar'}</button>
        </form>
        <p className="text-xs text-zinc-500">La sincronización compartida se limita al contrato documentado; tokens, datos legacy y funciones no verificadas permanecen deshabilitados.</p>
      </>}
    </section>
  </div>;
};
