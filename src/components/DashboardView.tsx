import React from 'react';
import { Account, Customer, CustomService, Provider, Sale } from '../types';
import { formatMoney, formatDateSpanish, getDaysRemaining, PLATFORMS, getPlatformConfig, createWhatsAppUrl, interpolateTemplate } from '../lib/utils';
import {
  DollarSign,
  TrendingUp,
  Tv,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  PlusCircle,
  Truck,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';

interface DashboardViewProps {
  sales: Sale[];
  accounts: Account[];
  providers: Provider[];
  customers: Customer[];
  customServices?: CustomService[];
  currency?: string;
  onOpenNewSale: () => void;
  onOpenNewAccount: () => void;
  onRenewSale: (saleId: string) => void;
  onSelectTab: (tab: any) => void;
  defaultTemplateBody?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  accounts,
  providers,
  customers,
  customServices = [],
  currency = 'USD',
  onOpenNewSale,
  onOpenNewAccount,
  onRenewSale,
  onSelectTab,
  defaultTemplateBody,
}) => {
  // Financial Calculations
  const activeSales = sales.filter((s) => s.status !== 'cancelled');
  const totalIncome = activeSales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
  const totalCosts = activeSales.reduce((sum, s) => sum + (s.costPrice || 0), 0);
  const netProfit = totalIncome - totalCosts;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // Inventory Calculations
  let totalProfilesCount = 0;
  let soldProfilesCount = 0;

  accounts.forEach((acc) => {
    if (acc.isFullAccount) {
      totalProfilesCount += 1;
      if (acc.isFullAccountSold) soldProfilesCount += 1;
    } else if (acc.profiles) {
      totalProfilesCount += acc.profiles.length;
      soldProfilesCount += acc.profiles.filter((p) => p.status === 'sold').length;
    }
  });

  const availableProfilesCount = totalProfilesCount - soldProfilesCount;

  // Expiring soon sales (<= 3 days)
  const expiringSales = sales.filter((s) => {
    if (s.status === 'cancelled') return false;
    const days = getDaysRemaining(s.endDate);
    return days <= 3;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Panel de Control Financiero y Ventas</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Resumen global de ganancias, rentas activas, cuentas con proveedores y vencimientos pendientes.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onOpenNewAccount}
            className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Tv className="w-4 h-4 text-indigo-400" />
            + Cargar Cuenta Maestro
          </button>
          <button
            onClick={onOpenNewSale}
            className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            + Registrar Venta
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ingresos Totales</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3">{formatMoney(totalIncome, currency)}</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{activeSales.length} ventas / rentas registradas</span>
          </div>
        </div>

        {/* Cost */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Costos Proveedores</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-200 mt-3">{formatMoney(totalCosts, currency)}</p>
          <p className="text-[11px] text-zinc-400 mt-2 font-medium">Inversión en cuentas maestras</p>
        </div>

        {/* Profit */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/40 border border-emerald-500/30 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Ganancia Neta</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3">{formatMoney(netProfit, currency)}</p>

          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
              {profitMargin.toFixed(1)}% Margen
            </span>
            <span className="text-[10px] text-zinc-400">Ganancia limpia</span>
          </div>
        </div>

        {/* Stock / Available screens */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pantallas / Stock</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Tv className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3">
            {soldProfilesCount} <span className="text-sm font-normal text-zinc-400">/ {totalProfilesCount}</span>
          </p>
          <div className="flex items-center justify-between text-[11px] mt-2 font-medium">
            <span className="text-emerald-400 font-semibold">{availableProfilesCount} Libres para venta</span>
            <span className="text-zinc-500">{accounts.length} Cuentas</span>
          </div>
        </div>
      </div>

      {/* Expirations Urgent Alert Panel */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Atención: Vencimientos Próximos o Vencidos</h3>
              <p className="text-xs text-zinc-400">
                {expiringSales.length} cliente(s) vencen hoy o en los próximos 3 días
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelectTab('expirations')}
            className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 hover:underline"
          >
            Ver todos ({expiringSales.length}) &rarr;
          </button>
        </div>

        {expiringSales.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/80" />
            <p className="font-semibold text-zinc-300">¡Al día! No tienes vencimientos críticos en los próximos 3 días.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiringSales.slice(0, 6).map((sale) => {
              const daysLeft = getDaysRemaining(sale.endDate);
              const isExpired = daysLeft < 0;
              const isToday = daysLeft === 0;

              const platformConf = PLATFORMS[sale.platform] || PLATFORMS.Otro;

              // Message generation for WhatsApp
              const msgText = interpolateTemplate(
                defaultTemplateBody ||
                  `Hola {cliente}, tu perfil de {servicio} vence el {fecha_vencimiento}. ¿Deseas renovar?`,
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
                }
              );

              const waUrl = createWhatsAppUrl(sale.customerPhone, msgText);

              return (
                <div
                  key={sale.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                    isExpired
                      ? 'bg-red-950/20 border-red-500/40 text-red-200'
                      : isToday
                      ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${platformConf.badgeBg}`}>
                        {sale.platform}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isExpired
                            ? 'bg-red-500/30 text-red-300'
                            : isToday
                            ? 'bg-amber-500/30 text-amber-300'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {isExpired ? 'VENCIDA' : isToday ? 'VENCE HOY' : `Vence en ${daysLeft} días`}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white truncate">{sale.customerName}</h4>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{sale.customerPhone}</p>

                    <div className="mt-2 text-xs bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/80 space-y-1">
                      <p className="text-zinc-300 truncate">
                        <span className="text-zinc-400 font-medium">Perfil:</span> {sale.profileName || 'General'}
                      </p>
                      <p className="text-zinc-400 text-[11px]">
                        Vence: <span className="text-white font-semibold">{formatDateSpanish(sale.endDate)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-800/60">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <Send className="w-3.5 h-3.5" /> WhatsApp
                    </a>

                    <button
                      onClick={() => onRenewSale(sale.id)}
                      className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1 border border-zinc-700 transition"
                      title="Renovar +30 días"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400" /> +30d
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Platforms Stock Overview */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
        <h3 className="font-bold text-white text-base mb-1">Estado de Pantallas por Plataforma</h3>
        <p className="text-xs text-zinc-400 mb-4">Disponibilidad para ventas inmediatas en tu inventario</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.keys(PLATFORMS).map((key) => {
            const platformName = key as any;
            const config = PLATFORMS[platformName];

            // Calculate accounts and profiles for this platform
            const platAccounts = accounts.filter((a) => a.platform === platformName);
            let platTotal = 0;
            let platSold = 0;

            platAccounts.forEach((acc) => {
              if (acc.isFullAccount) {
                platTotal += 1;
                if (acc.isFullAccountSold) platSold += 1;
              } else if (acc.profiles) {
                platTotal += acc.profiles.length;
                platSold += acc.profiles.filter((p) => p.status === 'sold').length;
              }
            });

            const platAvailable = platTotal - platSold;

            return (
              <div
                key={platformName}
                onClick={() => onSelectTab('accounts')}
                className="bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 p-3.5 rounded-xl cursor-pointer transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${config.badgeBg}`}>
                    {config.name}
                  </span>
                </div>

                <p className="text-lg font-black text-white">{platAvailable} <span className="text-xs font-normal text-zinc-400">libres</span></p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {platSold} vendidas de {platTotal}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
