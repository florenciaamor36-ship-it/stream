import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/storage';
import { requestConfirmation } from '../lib/feedback';
import { KeyRound, Copy, Check, Ban, RefreshCw } from 'lucide-react';

type AgentKey = { id:string; targetEmail:string; label:string; keyPrefix:string; createdAt:string; expiresAt:string; revokedAt:string|null; active:boolean };

export const AgentApiKeysPanel: React.FC = () => {
  const [targetEmail,setTargetEmail]=useState('');
  const [label,setLabel]=useState('');
  const [days,setDays]=useState(90);
  const [keys,setKeys]=useState<AgentKey[]>([]);
  const [newKey,setNewKey]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [copied,setCopied]=useState(false);
  const load=async()=>{const r=await apiRequest('/api/admin/agent-keys');const d=await r.json();setKeys(d.keys||[]);};
  useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'No se pudieron cargar las claves.'));},[]);
  const create=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');setNewKey('');
    try{const r=await apiRequest('/api/admin/agent-keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetEmail,label,expiresInDays:days})});const d=await r.json();setNewKey(d.key);setTargetEmail('');setLabel('');await load();}
    catch(e){setError(e instanceof Error?e.message:'No se pudo crear la clave.');}finally{setBusy(false);}
  };
  const revoke=async(k:AgentKey)=>{
    const yes=await requestConfirmation({title:'Revocar clave de agente',message:`El agente «${k.label}» perderá acceso a ${k.targetEmail} inmediatamente. ¿Querés continuar?`,confirmLabel:'Revocar clave',danger:true});
    if(!yes)return;setError('');
    try{await apiRequest(`/api/admin/agent-keys/${encodeURIComponent(k.id)}`,{method:'DELETE'});await load();}
    catch(e){setError(e instanceof Error?e.message:'No se pudo revocar la clave.');}
  };
  const copy=async()=>{try{await navigator.clipboard.writeText(newKey);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}catch{setError('No se pudo copiar; seleccioná y copiá la clave manualmente.');}};
  const date=(v:string)=>new Date(v).toLocaleDateString('es-AR');
  return <section className="rounded-2xl border border-violet-500/25 bg-zinc-900/70 p-5 space-y-5">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-violet-500/15 p-2.5 text-violet-300"><KeyRound className="h-5 w-5"/></div><div><h3 className="font-bold text-white">Acceso de agentes por API</h3><p className="mt-1 text-xs leading-relaxed text-zinc-400">Creá una clave para una cuenta cliente ya registrada. El agente podrá administrar solo los datos de esa cuenta y leer las credenciales de sus servicios; nunca la contraseña de acceso del cliente a Stream Flow Pro.</p></div></div>
    <form onSubmit={create} className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <input required type="email" value={targetEmail} onChange={e=>setTargetEmail(e.target.value)} placeholder="Email de la cuenta cliente" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white md:col-span-2"/>
      <input required maxLength={80} value={label} onChange={e=>setLabel(e.target.value)} placeholder="Nombre del agente" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white"/>
      <select value={days} onChange={e=>setDays(Number(e.target.value))} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option><option value={180}>180 días</option><option value={365}>365 días</option></select>
      <button disabled={busy} className="rounded-xl bg-violet-400 px-4 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-50 md:col-span-4">{busy?'Creando…':'Crear clave API para agente'}</button>
    </form>
    {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
    {newKey&&<div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2"><p className="text-sm font-semibold text-amber-200">Copiala ahora: no se va a volver a mostrar.</p><div className="flex gap-2"><input readOnly value={newKey} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white"/><button type="button" onClick={copy} className="flex items-center gap-1 rounded-lg bg-zinc-700 px-3 text-xs text-white">{copied?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}{copied?'Copiada':'Copiar'}</button></div><p className="text-xs text-zinc-400">Guardala en el gestor seguro del agente; no la mandes por un chat sin cifrado.</p></div>}
    <div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-white">Claves emitidas</h4><button type="button" onClick={()=>void load().catch(e=>setError(e.message))} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800" aria-label="Actualizar lista"><RefreshCw className="h-4 w-4"/></button></div>
    {keys.length===0?<p className="text-xs text-zinc-500">Todavía no hay claves de agente.</p>:<div className="space-y-2">{keys.map(k=><div key={k.id} className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-medium text-white">{k.label} <span className="text-zinc-500">· {k.targetEmail}</span></p><p className="mt-1 text-xs text-zinc-500">{k.keyPrefix}… · vence {date(k.expiresAt)} · {k.active?'Activa':'Revocada o vencida'}</p></div>{k.active&&<button type="button" onClick={()=>void revoke(k)} className="flex items-center gap-1 self-start rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"><Ban className="h-3.5 w-3.5"/>Revocar</button>}</div>)}</div>}
    <p className="text-[11px] leading-relaxed text-zinc-500">La clave queda limitada a una sola cuenta y vence como máximo al año. Las cuentas cliente no pueden emitir claves API ni tokens de suscripción.</p>
  </section>;
};
