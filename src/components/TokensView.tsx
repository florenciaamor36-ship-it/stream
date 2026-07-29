import React, { useState } from 'react';
import { SubscriptionToken, TokenAuditLog, User } from '../types';
import { getDaysRemaining, formatDateSpanish } from '../lib/utils';
import { KeyRound, ShieldCheck, Clock, Ticket, Copy, Check, Sparkles, PlusCircle, Lock, Unlock, ShieldAlert, Activity, Cpu } from 'lucide-react';

interface TokensViewProps {
  user: User | null;
  tokens: SubscriptionToken[];
  tokenAuditLogs?: TokenAuditLog[];
  onRedeemToken: (code: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onGenerateTokens: (count: number, days: number) => Promise<SubscriptionToken[]>;
}

export const TokensView: React.FC<TokensViewProps> = ({
  user,
  tokens,
  tokenAuditLogs = [],
  onRedeemToken,
  onGenerateTokens,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Hidden Admin Panel State
  const [isUnlocked, setIsUnlocked] = useState(user?.isAdmin || user?.email === 'admin@streaming.com');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Admin Token Gen
  const [genCount, setGenCount] = useState<number>(1);
  const [genDays, setGenDays] = useState<number>(30);
  const [genLoading, setGenLoading] = useState(false);

  const subDays = user?.subscriptionUntil ? getDaysRemaining(user.subscriptionUntil) : 0;
  const graceDays = user?.gracePeriodUntil ? getDaysRemaining(user.gracePeriodUntil) : 0;

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setRedeemLoading(true);
    setFeedback(null);

    const res = await onRedeemToken(inputCode.trim());
    setRedeemLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', text: res.message || '¡Token canjeado exitosamente! Se agregaron 30 días.' });
      setInputCode('');
    } else {
      setFeedback({ type: 'error', text: res.error || 'Código de token inválido.' });
    }
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim().toUpperCase();
    if (cleanPin === 'ADMIN2026' || cleanPin === '1234' || cleanPin === 'SUPERADMIN') {
      setIsUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Clave secreta incorrecta.');
    }
  };

  const handleGenerate = async () => {
    setGenLoading(true);
    await onGenerateTokens(genCount, genDays);
    setGenLoading(false);
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Gestión de Suscripción y Canje de Tokens
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Cada token canjeado le otorga a tu cuenta 30 días de suscripción activa para operar el sistema.
          </p>
        </div>

        {/* Hidden Unlock Trigger Button */}
        <div>
          {!isUnlocked ? (
            <button
              onClick={() => {
                setShowPinModal(true);
                setPinError('');
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-800 text-xs font-medium transition flex items-center gap-1.5"
              title="Acceso Super Admin"
            >
              <Lock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Modo Administrador</span>
            </button>
          ) : (
            <button
              onClick={() => setIsUnlocked(false)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Admin Desbloqueado (Bloquear)</span>
            </button>
          )}
        </div>
      </div>

      {/* Subscription Status & Redeem Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Estado de la Suscripción</h3>
              <p className="text-xs text-zinc-400">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Días de Suscripción Activa:</span>
              <span className="font-bold text-emerald-400 text-sm">{subDays > 0 ? `${subDays} días` : 'Vencida'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Prueba Gratis de Gracia:</span>
              <span className="font-bold text-amber-400">{graceDays > 0 ? `${graceDays} días restantes` : 'Finalizada'}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-zinc-400">Fecha de Próximo Vencimiento:</span>
              <span className="font-bold text-white font-mono">{user?.subscriptionUntil ? formatDateSpanish(user.subscriptionUntil) : '-'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Tokens Canjeados en Total:</span>
              <span className="font-bold text-indigo-400">{user?.tokensRedeemed || 0} token(s)</span>
            </div>
          </div>
        </div>

        {/* Redeem Form */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Canjear Código de Token (+30 Días)</h3>
              <p className="text-xs text-zinc-400">Ingresa tu código de token para extender tu suscripción.</p>
            </div>
          </div>

          <form onSubmit={handleRedeem} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Código de Token (ej. STRM-30D-XXXX-YYYY)</label>
              <input
                type="text"
                required
                placeholder="STRM-30D-XXXX-YYYY"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono font-bold text-sm tracking-wider uppercase focus:outline-none focus:border-red-500"
              />
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={redeemLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition active:scale-95 disabled:opacity-50"
            >
              {redeemLoading ? 'Verificando Token...' : '¡Canjear Token Ahora!'}
            </button>
          </form>
        </div>
      </div>

      {/* Anti-Fraud Shield Features Card */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950/30 to-zinc-900 border border-indigo-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              Sistema Antifraude y Verificación Criptográfica Activo
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                HMAC 256
              </span>
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Protección anti-fuerza bruta (máx. 5 intentos), validación de firma checksum y auditoría de IPs en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-zinc-300 bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Check className="w-3.5 h-3.5" />
            <span>Checksum Algorítmico</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Lock className="w-3.5 h-3.5" />
            <span>Anti Brute-Force</span>
          </div>
        </div>
      </div>

      {/* Secret PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Desbloqueo de Panel Secreto</h3>
                <p className="text-xs text-zinc-400">Ingresa la clave maestra para activar el Generador de Tokens.</p>
              </div>
            </div>

            <form onSubmit={handleUnlockSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Clave Secreta de Administrador</label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="••••••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-center font-bold text-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              {pinError && (
                <div className="p-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold text-center">
                  {pinError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/20"
                >
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Token Generator Panel (Only visible when unlocked) */}
      {isUnlocked && (
        <div className="bg-zinc-900/80 border border-indigo-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-400" />
                Generador y Administrador de Tokens (Modo Administrador)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Genera nuevos códigos de tokens de 30 días para ofrecer o vender a tus clientes/revendedores.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={genDays}
                onChange={(e) => setGenDays(parseInt(e.target.value))}
                className="bg-zinc-950 border border-zinc-800 text-white text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value={30}>30 Días</option>
                <option value={60}>60 Días</option>
                <option value={90}>90 Días</option>
              </select>

              <button
                onClick={handleGenerate}
                disabled={genLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                Generar Token
              </button>
            </div>
          </div>

          {/* Tokens List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-800 text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Código de Token</th>
                  <th className="py-2.5 px-4">Duración</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 px-4">Canjeado Por</th>
                  <th className="py-2.5 px-4 text-right">Copiar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {tokens.map((tok) => (
                  <tr key={tok.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-white tracking-wider">{tok.code}</td>
                    <td className="py-2.5 px-4 text-zinc-300 font-semibold">{tok.days || 30} Días</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          tok.isUsed
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {tok.isUsed ? 'CANJEADO' : 'DISPONIBLE'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-zinc-400 font-mono text-[11px]">{tok.usedByEmail || '-'}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => copyToClipboard(tok.code, tok.id)}
                        className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
                        title="Copiar código"
                      >
                        {copiedId === tok.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Anti-Fraud Audit Logs Table */}
          <div className="pt-6 border-t border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Registro de Auditoría y Detección de Fraude en Tiempo Real
              </h4>
              <span className="text-[10px] text-zinc-400 font-mono">
                {tokenAuditLogs.length} eventos registrados
              </span>
            </div>

            <div className="overflow-x-auto bg-zinc-950 rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/80 text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-800 text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Fecha / Hora</th>
                    <th className="py-2.5 px-4">Usuario / Email</th>
                    <th className="py-2.5 px-4">Código Ingresado</th>
                    <th className="py-2.5 px-4">Estado Antifraude</th>
                    <th className="py-2.5 px-4">IP Origen</th>
                    <th className="py-2.5 px-4">Detalle de Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  {tokenAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-500 font-sans">
                        No hay intentos de canje registrados aún.
                      </td>
                    </tr>
                  ) : (
                    tokenAuditLogs.slice(0, 30).map((log) => {
                      let badgeBg = 'bg-zinc-800 text-zinc-300';
                      let statusText = log.status as string;

                      if (log.status === 'SUCCESS') {
                        badgeBg = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                        statusText = 'ÉXITO';
                      } else if (log.status === 'INVALID_CHECKSUM') {
                        badgeBg = 'bg-red-500/20 text-red-400 border border-red-500/30';
                        statusText = 'FIRMA APÓCRIFA';
                      } else if (log.status === 'RATE_LIMITED') {
                        badgeBg = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
                        statusText = 'BLOQUEO TASA';
                      } else if (log.status === 'ALREADY_REDEEMED') {
                        badgeBg = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
                        statusText = 'REPETIDO';
                      } else if (log.status === 'NOT_FOUND') {
                        badgeBg = 'bg-zinc-800 text-zinc-400';
                        statusText = 'NO EXISTE';
                      }

                      return (
                        <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                          <td className="py-2 px-4 text-zinc-400">{formatDateSpanish(log.timestamp)}</td>
                          <td className="py-2 px-4 font-sans text-white">{log.userEmail || '-'}</td>
                          <td className="py-2 px-4 font-bold tracking-wider text-indigo-300">{log.tokenCode || '-'}</td>
                          <td className="py-2 px-4">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${badgeBg}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-zinc-400">{log.ip || '127.0.0.1'}</td>
                          <td className="py-2 px-4 font-sans text-zinc-400 text-[10px]">{log.details || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
