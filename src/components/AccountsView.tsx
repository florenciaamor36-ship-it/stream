import React, { useState } from 'react';
import { Account, CustomService, PlatformType, Provider, Sale } from '../types';
import { PLATFORMS, getPlatformConfig, formatMoney, formatDateSpanish } from '../lib/utils';
import {
  Tv,
  PlusCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  Trash2,
  Search,
  KeyRound,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Truck,
  User,
} from 'lucide-react';

interface AccountsViewProps {
  accounts: Account[];
  providers: Provider[];
  sales?: Sale[];
  customServices?: CustomService[];
  currency?: string;
  onSaveAccount: (account: Partial<Account>) => void;
  onDeleteAccount: (id: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  providers,
  sales = [],
  customServices = [],
  currency = 'USD',
  onSaveAccount,
  onDeleteAccount,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);

  // Form Fields
  const [formPlatform, setFormPlatform] = useState<PlatformType>('Netflix');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formMasterPin, setFormMasterPin] = useState('');
  const [formProviderId, setFormProviderId] = useState('');
  const [formCost, setFormCost] = useState<number>(10);
  const [formIsFullAccount, setFormIsFullAccount] = useState(false);
  const [formTotalProfiles, setFormTotalProfiles] = useState(5);
  const [formRenewalDate, setFormRenewalDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formNotes, setFormNotes] = useState('');
  const [customProfiles, setCustomProfiles] = useState<{ profileName: string; pin: string }[]>([
    { profileName: 'Perfil 1', pin: '1010' },
    { profileName: 'Perfil 2', pin: '2020' },
    { profileName: 'Perfil 3', pin: '3030' },
    { profileName: 'Perfil 4', pin: '4040' },
    { profileName: 'Perfil 5', pin: '5050' },
  ]);

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setFormPlatform('Netflix');
    setFormEmail('');
    setFormPassword('');
    setFormMasterPin('');
    setFormProviderId(providers[0]?.id || '');
    setFormCost(10);
    setFormIsFullAccount(false);
    setFormTotalProfiles(5);
    setFormRenewalDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFormNotes('');
    setCustomProfiles(
      Array.from({ length: 5 }, (_, i) => ({
        profileName: `Perfil ${i + 1}`,
        pin: `${(i + 1) * 1111}`.slice(0, 4),
      }))
    );
    setModalOpen(true);
  };

  const handlePlatformChange = (plat: PlatformType) => {
    setFormPlatform(plat);
    if (!editingAccount) {
      const conf = getPlatformConfig(plat, customServices);
      const defaultCount = conf.defaultProfiles || 4;
      setFormTotalProfiles(defaultCount);
      setCustomProfiles(
        Array.from({ length: defaultCount }, (_, i) => ({
          profileName: `Perfil ${i + 1}`,
          pin: `${(i + 1) * 1111}`.slice(0, 4),
        }))
      );
    }
  };

  const handleOpenEditModal = (acc: Account) => {
    setFormPlatform(acc.platform);
    setFormEmail(acc.accountEmail);
    setFormPassword(acc.accountPassword);
    setFormMasterPin(acc.masterPin || '');
    setFormProviderId(acc.providerId || '');
    setFormCost(acc.cost || 0);
    setFormIsFullAccount(acc.isFullAccount || false);
    setFormTotalProfiles(acc.totalProfiles || 5);
    setFormRenewalDate(acc.renewalDate ? acc.renewalDate.split('T')[0] : '');
    setFormNotes(acc.notes || '');
    setCustomProfiles(
      acc.profiles && acc.profiles.length > 0
        ? acc.profiles.map((p) => ({ profileName: p.profileName, pin: p.pin || '' }))
        : Array.from({ length: acc.totalProfiles || 5 }, (_, i) => ({
            profileName: `Perfil ${i + 1}`,
            pin: '0000',
          }))
    );
    setModalOpen(true);
  };

  const handleTotalProfilesChange = (count: number) => {
    setFormTotalProfiles(count);
    const newProfiles = [...customProfiles];
    if (count > newProfiles.length) {
      for (let i = newProfiles.length; i < count; i++) {
        newProfiles.push({ profileName: `Perfil ${i + 1}`, pin: `${(i + 1) * 1000}`.slice(0, 4) });
      }
    } else {
      newProfiles.splice(count);
    }
    setCustomProfiles(newProfiles);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const providerObj = providers.find((p) => p.id === formProviderId);

    let profilesData = [];
    if (!formIsFullAccount) {
      profilesData = customProfiles.map((cp, idx) => {
        const existingProf = editingAccount?.profiles?.[idx];
        return {
          id: existingProf?.id || `prof_${Date.now()}_${idx}`,
          profileName: cp.profileName || `Perfil ${idx + 1}`,
          pin: cp.pin || '',
          status: existingProf?.status || 'available',
          currentSaleId: existingProf?.currentSaleId,
        };
      });
    } else {
      profilesData = [
        {
          id: editingAccount?.profiles?.[0]?.id || `prof_full_${Date.now()}`,
          profileName: 'Cuenta Completa',
          pin: formMasterPin || '',
          status: (editingAccount?.isFullAccountSold ? 'sold' : 'available') as any,
        },
      ];
    }

    const payload: Partial<Account> = {
      id: editingAccount?.id,
      platform: formPlatform,
      accountEmail: formEmail,
      accountPassword: formPassword,
      masterPin: formMasterPin,
      providerId: formProviderId,
      providerName: providerObj?.name || 'Proveedor General',
      cost: Number(formCost) || 0,
      totalProfiles: formIsFullAccount ? 1 : Number(formTotalProfiles),
      isFullAccount: formIsFullAccount,
      renewalDate: new Date(formRenewalDate).toISOString(),
      notes: formNotes,
      profiles: profilesData as any,
    };

    onSaveAccount(payload);
    setModalOpen(false);
  };

  // Filtering
  const filteredAccounts = accounts.filter((acc) => {
    const matchesPlat = selectedPlatform === 'ALL' || acc.platform === selectedPlatform;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      acc.accountEmail.toLowerCase().includes(q) ||
      (acc.providerName && acc.providerName.toLowerCase().includes(q)) ||
      (acc.notes && acc.notes.toLowerCase().includes(q));
    return matchesPlat && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Inventario de Cuentas Maestras y Pantallas
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Administra cuentas de origen, proveedores, costos de compra, claves y PINs asignados.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          + Agregar Nueva Cuenta
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por correo, proveedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Platform tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedPlatform('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedPlatform === 'ALL'
                ? 'bg-zinc-200 text-zinc-950 font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Todas ({accounts.length})
          </button>

          {Object.keys(PLATFORMS).map((pKey) => {
            const count = accounts.filter((a) => a.platform === pKey).length;
            if (count === 0) return null;
            return (
              <button
                key={pKey}
                onClick={() => setSelectedPlatform(pKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedPlatform === pKey
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {pKey} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Accounts List */}
      {filteredAccounts.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <Tv className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-semibold text-sm">No se encontraron cuentas maestras</p>
          <p className="text-zinc-500 text-xs mt-1">
            Haz clic en "+ Agregar Nueva Cuenta" para registrar tu primera cuenta con su proveedor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAccounts.map((acc) => {
            const platformConf = getPlatformConfig(acc.platform, customServices);
            const isPasswordVisible = !!showPasswordMap[acc.id];

            let soldProfiles = 0;
            if (acc.isFullAccount) {
              soldProfiles = acc.isFullAccountSold ? 1 : 0;
            } else if (acc.profiles) {
              soldProfiles = acc.profiles.filter((p) => p.status === 'sold').length;
            }
            const freeProfiles = acc.totalProfiles - soldProfiles;

            return (
              <div
                key={acc.id}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 space-y-4 transition shadow-md"
              >
                {/* Account Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${platformConf.badgeBg}`}>
                      {acc.platform}
                    </span>
                    {acc.isFullAccount ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        CUENTA COMPLETA
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {acc.totalProfiles} Pantallas
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(acc)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      title="Editar cuenta"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar esta cuenta del inventario?')) onDeleteAccount(acc.id);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Account Credentials Card */}
                <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">Correo de Acceso:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono font-semibold">{acc.accountEmail}</span>
                      <button
                        onClick={() => copyToClipboard(acc.accountEmail, `email_${acc.id}`)}
                        className="text-zinc-400 hover:text-white"
                        title="Copiar correo"
                      >
                        {copiedId === `email_${acc.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">Contraseña:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono font-semibold">
                        {isPasswordVisible ? acc.accountPassword : '••••••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(acc.id)}
                        className="text-zinc-400 hover:text-white"
                        title="Mostrar/ocultar clave"
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(acc.accountPassword, `pass_${acc.id}`)}
                        className="text-zinc-400 hover:text-white"
                        title="Copiar clave"
                      >
                        {copiedId === `pass_${acc.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {acc.masterPin && (
                    <div className="flex items-center justify-between border-t border-zinc-800/60 pt-1.5">
                      <span className="text-zinc-500 font-medium">Master PIN / Clave Maestra:</span>
                      <span className="text-amber-400 font-mono font-bold">{acc.masterPin}</span>
                    </div>
                  )}
                </div>

                {/* Account Details & Provider */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/50">
                  <div>
                    <p className="text-zinc-500">Proveedor:</p>
                    <p className="font-semibold text-zinc-200 truncate flex items-center gap-1 mt-0.5">
                      <Truck className="w-3 h-3 text-indigo-400" />
                      {acc.providerName || 'Sin especificar'}
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Costo de Compra:</p>
                    <p className="font-bold text-emerald-400 mt-0.5">{formatMoney(acc.cost)}</p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Renovación Proveedor:</p>
                    <p className="font-medium text-zinc-300 mt-0.5">{formatDateSpanish(acc.renewalDate)}</p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Estado de Stock:</p>
                    <p className="font-semibold text-white mt-0.5">
                      {freeProfiles > 0 ? (
                        <span className="text-emerald-400 font-bold">{freeProfiles} Libres</span>
                      ) : (
                        <span className="text-amber-400 font-bold">Agotada / Vendida</span>
                      )}
                    </p>
                  </div>

                  {acc.isFullAccount && acc.isFullAccountSold && (() => {
                    const fullSale = sales.find((s) => s.accountId === acc.id);
                    return fullSale ? (
                      <div className="col-span-2 border-t border-zinc-800/60 pt-2 mt-1">
                        <p className="text-zinc-500">Cliente Asignado (Cuenta Completa):</p>
                        <p className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          {fullSale.customerName} ({fullSale.customerPhone})
                        </p>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Profiles Breakdown */}
                {!acc.isFullAccount && acc.profiles && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Perfiles / Pantallas Asignadas ({soldProfiles}/{acc.totalProfiles} vendidas)
                    </p>

                    <div className="space-y-1.5">
                      {acc.profiles.map((prof, idx) => {
                        const assignedSale = sales.find(
                          (s) => s.accountId === acc.id && (s.profileId === prof.id || s.profileName === prof.profileName)
                        );

                        return (
                          <div
                            key={prof.id || idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-950/60 px-3 py-2 rounded-lg text-xs border border-zinc-800/60 gap-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  prof.status === 'sold' ? 'bg-red-500' : 'bg-emerald-500'
                                }`}
                              />
                              <span className="font-medium text-zinc-200">{prof.profileName}</span>

                              {prof.status === 'sold' && assignedSale && (
                                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 ml-1">
                                  <User className="w-3 h-3" />
                                  {assignedSale.customerName}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2.5 self-end sm:self-auto">
                              {prof.pin && (
                                <span className="text-zinc-400 font-mono text-[11px] bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                  PIN: <strong className="text-white">{prof.pin}</strong>
                                </span>
                              )}

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  prof.status === 'sold'
                                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {prof.status === 'sold' ? 'Ocupado' : 'Disponible'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-5 my-8 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {editingAccount ? 'Editar Cuenta Maestro' : 'Agregar Nueva Cuenta Maestro'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Platform & Account Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Plataforma / Servicio *</label>
                  <select
                    value={formPlatform}
                    onChange={(e) => handlePlatformChange(e.target.value as PlatformType)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-red-500"
                  >
                    {Array.from(
                      new Set([...Object.keys(PLATFORMS), ...customServices.map((cs) => cs.name)])
                    ).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Proveedor (Origen) *</label>
                  <select
                    value={formProviderId}
                    onChange={(e) => setFormProviderId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                    required
                  >
                    <option value="">-- Seleccionar Proveedor --</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.paymentMethod})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Correo de Acceso *</label>
                  <input
                    type="email"
                    required
                    placeholder="ej. netflix.cuenta@gmail.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Contraseña *</label>
                  <input
                    type="text"
                    required
                    placeholder="Clave de la cuenta"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              {/* Master PIN & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">PIN Maestro / Hogar</label>
                  <input
                    type="text"
                    placeholder="ej. 9988"
                    value={formMasterPin}
                    onChange={(e) => setFormMasterPin(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Costo de Compra ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Fecha Renovación Proveedor</label>
                  <input
                    type="date"
                    required
                    value={formRenewalDate}
                    onChange={(e) => setFormRenewalDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Full Account Checkbox */}
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">¿Es Venta de Cuenta Completa?</p>
                  <p className="text-zinc-500 text-[11px]">
                    Si se marca, la cuenta se venderá entera a 1 solo cliente sin dividir en pantallas.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formIsFullAccount}
                  onChange={(e) => setFormIsFullAccount(e.target.checked)}
                  className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                />
              </div>

              {/* Profiles & PIN Configuration */}
              {!formIsFullAccount && (
                <div className="space-y-3 bg-zinc-950/50 p-3.5 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-200">Cantidad de Pantallas / Perfiles</label>
                    <select
                      value={formTotalProfiles}
                      onChange={(e) => handleTotalProfilesChange(parseInt(e.target.value))}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-white font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                        <option key={num} value={num}>
                          {num} Pantallas
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {customProfiles.map((cp, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                        <input
                          type="text"
                          placeholder={`Perfil ${idx + 1}`}
                          value={cp.profileName}
                          onChange={(e) => {
                            const newP = [...customProfiles];
                            newP[idx].profileName = e.target.value;
                            setCustomProfiles(newP);
                          }}
                          className="w-2/3 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-xs font-medium"
                        />
                        <input
                          type="text"
                          placeholder="PIN"
                          value={cp.pin}
                          onChange={(e) => {
                            const newP = [...customProfiles];
                            newP[idx].pin = e.target.value;
                            setCustomProfiles(newP);
                          }}
                          className="w-1/3 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-amber-400 font-mono text-xs text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
