import React, { useState } from 'react';
import { Account, MessageTemplate, Sale } from '../types';
import {
  formatDateSpanish,
  getDaysRemaining,
  formatMoney,
  PLATFORMS,
  createWhatsAppUrl,
  interpolateTemplate,
} from '../lib/utils';
import {
  Clock,
  Send,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Tv,
  Truck,
  MessageSquare,
} from 'lucide-react';

interface ExpirationsViewProps {
  sales: Sale[];
  accounts: Account[];
  templates: MessageTemplate[];
  onRenewSale: (saleId: string) => void;
}

export const ExpirationsView: React.FC<ExpirationsViewProps> = ({
  sales,
  accounts,
  templates,
  onRenewSale,
}) => {
  const [tabFilter, setTabFilter] = useState<'today' | 'soon' | 'expired' | 'providers'>('soon');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find((t) => t.isDefault)?.id || templates[0]?.id || ''
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Sales Expirations logic
  const todaySales = sales.filter((s) => s.status !== 'cancelled' && getDaysRemaining(s.endDate) === 0);
  const soonSales = sales.filter((s) => {
    const d = getDaysRemaining(s.endDate);
    return s.status !== 'cancelled' && d <= 3 && d >= 0;
  });
  const expiredSales = sales.filter((s) => s.status !== 'cancelled' && getDaysRemaining(s.endDate) < 0);

  // Provider renewal expirations
  const expiringAccounts = accounts.filter((a) => {
    const d = getDaysRemaining(a.renewalDate);
    return d <= 5;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Centro de Vencimientos, Recordatorios y Notificaciones
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión centralizada de cobros, alertas preventivas, avisos por WhatsApp y renovación con 1 clic.
          </p>
        </div>

        {/* Template selector for quick sending */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">Plantilla Activa:</span>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-white text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-red-500 w-full md:w-auto"
          >
            {templates.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setTabFilter('soon')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            tabFilter === 'soon'
              ? 'bg-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-500/20'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Vencen en 1-3 Días ({soonSales.length})
        </button>

        <button
          onClick={() => setTabFilter('today')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            tabFilter === 'today'
              ? 'bg-red-600 text-white font-black shadow-lg shadow-red-600/20'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Vencen HOY ({todaySales.length})
        </button>

        <button
          onClick={() => setTabFilter('expired')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            tabFilter === 'expired'
              ? 'bg-rose-950 text-rose-300 border border-rose-500/40 font-black'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Servicios Vencidos ({expiredSales.length})
        </button>

        <button
          onClick={() => setTabFilter('providers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            tabFilter === 'providers'
              ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/20'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          Renovaciones Proveedor ({expiringAccounts.length})
        </button>
      </div>

      {/* View Content */}
      {tabFilter !== 'providers' ? (
        <div className="space-y-4">
          {(() => {
            const displayList =
              tabFilter === 'today' ? todaySales : tabFilter === 'soon' ? soonSales : expiredSales;

            if (displayList.length === 0) {
              return (
                <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                  <p className="text-zinc-300 font-semibold text-sm">Sin registros pendientes en esta categoría</p>
                  <p className="text-zinc-500 text-xs mt-1">Todos tus clientes están al día con sus vencimientos.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayList.map((sale) => {
                  const daysLeft = getDaysRemaining(sale.endDate);
                  const isExpired = daysLeft < 0;
                  const isToday = daysLeft === 0;

                  const platformConf = PLATFORMS[sale.platform] || PLATFORMS.Otro;

                  // Render template message
                  const formattedMessage = interpolateTemplate(
                    activeTemplate?.body ||
                      `Hola {cliente}, recordatorio de tu pantalla de {servicio} que vence el {fecha_vencimiento}.`,
                    {
                      cliente: sale.customerName,
                      servicio: sale.platform,
                      email_cuenta: sale.accountEmail,
                      password: sale.accountPassword,
                      perfil: sale.profileName,
                      pin: sale.pin,
                      fecha_vencimiento: sale.endDate,
                      dias_restantes: daysLeft > 0 ? daysLeft : 0,
                      precio: sale.salePrice,
                      metodo_pago: sale.paymentMethod || 'Transferencia',
                    }
                  );

                  const waUrl = createWhatsAppUrl(sale.customerPhone, formattedMessage);

                  return (
                    <div
                      key={sale.id}
                      className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 space-y-4 transition shadow-md flex flex-col justify-between"
                    >
                      {/* Top Info */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${platformConf.badgeBg}`}>
                            {sale.platform}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                              isExpired
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : isToday
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {isExpired ? 'VENCIDA' : isToday ? 'VENCE HOY' : `Vence en ${daysLeft}d`}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-white">{sale.customerName}</h3>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">{sale.customerPhone}</p>

                        <div className="mt-3 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 text-xs space-y-1">
                          <p className="text-zinc-300">
                            <span className="text-zinc-500 font-medium">Perfil Asignado:</span>{' '}
                            <strong>{sale.profileName}</strong> {sale.pin ? `(PIN: ${sale.pin})` : ''}
                          </p>
                          <p className="text-zinc-300">
                            <span className="text-zinc-500 font-medium">Vencimiento:</span>{' '}
                            <strong className="text-white">{formatDateSpanish(sale.endDate)}</strong>
                          </p>
                          <p className="text-zinc-300">
                            <span className="text-zinc-500 font-medium">Monto Cobro:</span>{' '}
                            <strong className="text-emerald-400">{formatMoney(sale.salePrice)}</strong>
                          </p>
                        </div>

                        {/* WhatsApp Message Preview */}
                        <div className="mt-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800/60 text-[11px] text-zinc-300 font-mono leading-relaxed relative">
                          <p className="text-[10px] uppercase font-sans font-bold text-zinc-500 mb-1 flex items-center justify-between">
                            <span>Previsualización de Mensaje WhatsApp:</span>
                            <button
                              onClick={() => copyToClipboard(formattedMessage, `msg_${sale.id}`)}
                              className="text-zinc-400 hover:text-white font-sans flex items-center gap-1 normal-case"
                            >
                              {copiedId === `msg_${sale.id}` ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> ¡Copiado!
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Copy className="w-3 h-3" /> Copiar Mensaje
                                </span>
                              )}
                            </button>
                          </p>
                          <div className="whitespace-pre-line text-zinc-300 line-clamp-4">{formattedMessage}</div>
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95"
                        >
                          <Send className="w-4 h-4" /> Enviar por WhatsApp
                        </a>

                        <button
                          onClick={() => onRenewSale(sale.id)}
                          className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-zinc-700 transition"
                          title="Renovar +30 días este servicio"
                        >
                          <RefreshCw className="w-4 h-4 text-indigo-400" /> Renovar +30d
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : (
        /* Provider Renovations Section */
        <div className="space-y-4">
          {expiringAccounts.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-zinc-300 font-semibold text-sm">Cuentas con Proveedor al día</p>
              <p className="text-zinc-500 text-xs mt-1">
                Ninguna cuenta con proveedor vence en los próximos 5 días.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expiringAccounts.map((acc) => {
                const daysLeft = getDaysRemaining(acc.renewalDate);
                const platformConf = PLATFORMS[acc.platform] || PLATFORMS.Otro;

                return (
                  <div key={acc.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${platformConf.badgeBg}`}>
                        {acc.platform}
                      </span>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Vence en {daysLeft} días
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white font-mono">{acc.accountEmail}</h4>

                    <div className="text-xs bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                      <p className="text-zinc-400">
                        Proveedor: <strong className="text-white">{acc.providerName || 'Sin especificar'}</strong>
                      </p>
                      <p className="text-zinc-400">
                        Costo de Renovación: <strong className="text-emerald-400">{formatMoney(acc.cost)}</strong>
                      </p>
                      <p className="text-zinc-400">
                        Fecha Límite: <strong className="text-white">{formatDateSpanish(acc.renewalDate)}</strong>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
