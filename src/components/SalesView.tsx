import React, { useState } from 'react';
import { Account, Customer, CustomService, Sale, SaleStatus, PaymentStatus, PlatformType } from '../types';
import {
  formatMoney,
  formatDateSpanish,
  getDaysRemaining,
  PLATFORMS,
  getPlatformConfig,
  createWhatsAppUrl,
  interpolateTemplate,
} from '../lib/utils';
import {
  PlusCircle,
  Search,
  Send,
  RefreshCw,
  Trash2,
  Edit2,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  User,
  Tv,
  Truck,
} from 'lucide-react';

interface SalesViewProps {
  sales: Sale[];
  accounts: Account[];
  customers: Customer[];
  customServices?: CustomService[];
  currency?: string;
  onSaveSale: (sale: Partial<Sale>) => void;
  onRenewSale: (saleId: string) => void;
  onDeleteSale: (id: string) => void;
  defaultTemplateBody?: string;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  accounts,
  customers,
  customServices = [],
  currency = 'USD',
  onSaveSale,
  onRenewSale,
  onDeleteSale,
  defaultTemplateBody,
  modalOpen,
  setModalOpen,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formSalePrice, setFormSalePrice] = useState<number>(3.5);
  const [formCostPrice, setFormCostPrice] = useState<number>(2.0);
  const [formDurationDays, setFormDurationDays] = useState<number>(30);
  const [formPaymentMethod, setFormPaymentMethod] = useState('Transferencia');
  const [formPaymentStatus, setFormPaymentStatus] = useState<PaymentStatus>('paid');
  const [editingSale, setEditingSale] = useState<Partial<Sale> | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenNewModal = () => {
    setEditingSale(null);
    setSelectedAccountId('');
    setSelectedProfileId('');
    setFormCustomerId('');
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormSalePrice(3.5);
    setFormCostPrice(2.0);
    setFormDurationDays(30);
    setFormPaymentMethod('Transferencia');
    setFormPaymentStatus('paid');
    setModalOpen(true);
  };

  const handleOpenEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setSelectedAccountId(sale.accountId);
    setSelectedProfileId(sale.profileId || '');
    setFormCustomerId(sale.customerId);
    setFormCustomerName(sale.customerName);
    setFormCustomerPhone(sale.customerPhone);
    setFormSalePrice(sale.salePrice);
    setFormCostPrice(sale.costPrice);
    setFormDurationDays(30);
    setFormPaymentMethod(sale.paymentMethod || 'Transferencia');
    setFormPaymentStatus(sale.paymentStatus || 'paid');
    setModalOpen(true);
  };

  // When an account is chosen in the form, pre-fill cost & profile options
  const handleAccountSelect = (accId: string) => {
    setSelectedAccountId(accId);
    const acc = accounts.find((a) => a.id === accId);
    if (acc) {
      if (acc.isFullAccount) {
        setFormCostPrice(acc.cost);
        setSelectedProfileId(acc.profiles?.[0]?.id || '');
        setFormSalePrice(acc.cost * 1.5);
      } else {
        // Prorated cost per profile
        const profCount = acc.totalProfiles || 1;
        const prorated = acc.cost / profCount;
        setFormCostPrice(parseFloat(prorated.toFixed(2)));
        setFormSalePrice(parseFloat((prorated * 1.6).toFixed(2)));

        // Select first available profile
        const availProf = acc.profiles?.find((p) => p.status === 'available');
        setSelectedProfileId(availProf?.id || acc.profiles?.[0]?.id || '');
      }
    }
  };

  // Handle Customer Selection
  const handleCustomerSelect = (custId: string) => {
    setFormCustomerId(custId);
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setFormCustomerName(cust.name);
      setFormCustomerPhone(cust.phone);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedAcc = accounts.find((a) => a.id === selectedAccountId);
    if (!selectedAcc) return alert('Por favor selecciona una cuenta del inventario.');

    const selectedProf = selectedAcc.profiles?.find((p) => p.id === selectedProfileId);

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + Number(formDurationDays));

    const payload: Partial<Sale> = {
      id: editingSale?.id,
      type: selectedAcc.isFullAccount ? 'full_account' : 'profile',
      accountId: selectedAcc.id,
      profileId: selectedProf?.id || selectedProfileId,
      profileName: selectedProf?.profileName || 'Perfil General',
      customerId: formCustomerId || `cust_${Date.now()}`,
      customerName: formCustomerName,
      customerPhone: formCustomerPhone,
      platform: selectedAcc.platform,
      accountEmail: selectedAcc.accountEmail,
      accountPassword: selectedAcc.accountPassword,
      pin: selectedProf?.pin || selectedAcc.masterPin || '',
      salePrice: Number(formSalePrice),
      costPrice: Number(formCostPrice),
      profit: Number(formSalePrice) - Number(formCostPrice),
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
      paymentStatus: formPaymentStatus,
      paymentMethod: formPaymentMethod,
    };

    onSaveSale(payload);
    setModalOpen(false);
  };

  // Available stock accounts for dropdown
  const availableAccountsList = accounts.filter((a) => {
    if (editingSale && a.id === editingSale.accountId) return true;
    if (a.isFullAccount) return !a.isFullAccountSold;
    return a.profiles && a.profiles.some((p) => p.status === 'available');
  });

  // Filter Sales
  const filteredSales = sales.filter((s) => {
    const daysLeft = getDaysRemaining(s.endDate);

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = daysLeft > 3 && s.status !== 'cancelled';
    else if (statusFilter === 'expiring_soon') matchesStatus = daysLeft <= 3 && daysLeft >= 0 && s.status !== 'cancelled';
    else if (statusFilter === 'expired') matchesStatus = daysLeft < 0 && s.status !== 'cancelled';

    const q = searchQuery.toLowerCase();
    const matchesQuery =
      s.customerName.toLowerCase().includes(q) ||
      s.customerPhone.toLowerCase().includes(q) ||
      s.platform.toLowerCase().includes(q) ||
      s.accountEmail.toLowerCase().includes(q);

    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Registro de Ventas y Rentas de Pantallas</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión completa de ventas activas, márgenes de ganancia, credenciales entregadas y estados de pago.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          + Nueva Venta / Renta
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, teléfono, servicio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'Todas', count: sales.length },
            {
              id: 'active',
              label: 'Activas',
              count: sales.filter((s) => getDaysRemaining(s.endDate) > 3).length,
            },
            {
              id: 'expiring_soon',
              label: 'Por Vencer (1-3d)',
              count: sales.filter((s) => {
                const d = getDaysRemaining(s.endDate);
                return d <= 3 && d >= 0;
              }).length,
            },
            {
              id: 'expired',
              label: 'Vencidas',
              count: sales.filter((s) => getDaysRemaining(s.endDate) < 0).length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.id
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Sales List Table */}
      {filteredSales.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <Tv className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-semibold text-sm">No hay registros de ventas en este filtro</p>
          <p className="text-zinc-500 text-xs mt-1">
            Genera una nueva venta haciendo clic en "+ Nueva Venta / Renta".
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-800 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Servicio & Perfil</th>
                  <th className="py-3 px-4">Credenciales</th>
                  <th className="py-3 px-4">Venta vs Costo</th>
                  <th className="py-3 px-4">Ganancia</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-center">Estado Pago</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60">
                {filteredSales.map((sale) => {
                  const daysLeft = getDaysRemaining(sale.endDate);
                  const isExpired = daysLeft < 0;
                  const isSoon = daysLeft <= 3 && daysLeft >= 0;

                  const platformConf = getPlatformConfig(sale.platform, customServices);
                  const parentAcc = accounts.find((a) => a.id === sale.accountId);

                  // Template interpolation for message
                  const msgText = interpolateTemplate(
                    defaultTemplateBody ||
                      `Hola {cliente}, tus accesos para {servicio}: Correo: {email_cuenta}, Clave: {password}, Perfil: {perfil}, PIN: {pin}. Vence: {fecha_vencimiento}`,
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
                    <tr key={sale.id} className="hover:bg-zinc-800/40 transition">
                      {/* Customer */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-white">{sale.customerName}</p>
                        <p className="text-[11px] text-zinc-400 font-mono">{sale.customerPhone}</p>
                      </td>

                      {/* Service & Profile */}
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${platformConf.badgeBg}`}>
                          {sale.platform}
                        </span>
                        <p className="text-zinc-200 font-medium mt-1">
                          {sale.profileName || 'Pantalla General'}{' '}
                          {sale.pin ? <span className="text-amber-400 font-mono font-bold">(PIN: {sale.pin})</span> : null}
                        </p>
                      </td>

                      {/* Credentials & Provider */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <p className="text-zinc-300 truncate max-w-[150px]">{sale.accountEmail}</p>
                        <p className="text-zinc-500 truncate max-w-[150px]">{sale.accountPassword}</p>
                        {parentAcc?.providerName && (
                          <p className="text-[10px] text-indigo-400 flex items-center gap-1 font-sans mt-0.5">
                            <Truck className="w-3 h-3" />
                            {parentAcc.providerName}
                          </p>
                        )}
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-white">{formatMoney(sale.salePrice)}</p>
                        <p className="text-[10px] text-zinc-500">Costo: {formatMoney(sale.costPrice)}</p>
                      </td>

                      {/* Profit */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          +{formatMoney(sale.profit)}
                        </span>
                      </td>

                      {/* Expiration */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-zinc-200">{formatDateSpanish(sale.endDate)}</p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block mt-0.5 ${
                            isExpired
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isSoon
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isExpired ? 'VENCIDA' : isSoon ? `VENCE EN ${daysLeft}d` : `${daysLeft} días restantes`}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            sale.paymentStatus === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {sale.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition"
                            title="Enviar WhatsApp con plantilla"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => onRenewSale(sale.id)}
                            className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
                            title="Renovar 30 días"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(sale)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                            title="Editar venta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm('¿Eliminar esta venta/renta?')) onDeleteSale(sale.id);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New / Edit Sale Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-5 my-8 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {editingSale ? 'Editar Venta / Renta' : 'Registrar Nueva Venta / Renta'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Select Account from Stock */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  1. Seleccionar Cuenta del Inventario *
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => handleAccountSelect(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-red-500"
                  required
                >
                  <option value="">-- Seleccionar Cuenta Disponible --</option>
                  {availableAccountsList.map((a) => {
                    const free = a.isFullAccount
                      ? !a.isFullAccountSold
                      : a.profiles?.filter((p) => p.status === 'available').length || 0;

                    return (
                      <option key={a.id} value={a.id}>
                        [{a.platform}] {a.accountEmail} ({free} disponibles) - Costo: {formatMoney(a.cost)}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Select Specific Profile */}
              {selectedAccountId && (
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">2. Perfil / Pantalla Asignada *</label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-red-500"
                    required
                  >
                    {accounts
                      .find((a) => a.id === selectedAccountId)
                      ?.profiles?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.profileName} (PIN: {p.pin || 'Sin PIN'}) - [{p.status === 'sold' ? 'Ocupado' : 'Disponible'}]
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Customer selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Cliente Existente (Opcional)</label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="">-- Nuevo Cliente --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Juan Pérez"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Phone & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Teléfono / WhatsApp Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. +525512345678"
                    value={formCustomerPhone}
                    onChange={(e) => setFormCustomerPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Duración (Días)</label>
                  <select
                    value={formDurationDays}
                    onChange={(e) => setFormDurationDays(parseInt(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-red-500"
                  >
                    <option value={30}>1 Mes (30 días)</option>
                    <option value={15}>15 Días</option>
                    <option value={60}>2 Meses (60 días)</option>
                    <option value={90}>3 Meses (90 días)</option>
                    <option value={365}>1 Año (365 días)</option>
                  </select>
                </div>
              </div>

              {/* Price, Cost & Calculated Margin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Precio de Venta ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formSalePrice}
                    onChange={(e) => setFormSalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Costo ($ Prorrateado)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-300 font-medium text-sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Ganancia Neta Calculada</label>
                  <p className="font-black text-emerald-400 text-sm py-1">
                    {formatMoney(formSalePrice - formCostPrice)}
                  </p>
                </div>
              </div>

              {/* Payment Method & Payment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Método de Pago Recibido</label>
                  <input
                    type="text"
                    placeholder="ej. Transferencia, Zelle, Mercado Pago"
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Estado del Pago</label>
                  <select
                    value={formPaymentStatus}
                    onChange={(e) => setFormPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-red-500"
                  >
                    <option value="paid">PAGADO</option>
                    <option value="pending">PENDIENTE</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/20"
                >
                  Guardar Venta / Renta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
