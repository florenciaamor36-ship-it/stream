import React, { useState } from 'react';
import { Account, Provider } from '../types';
import { formatMoney, createWhatsAppUrl } from '../lib/utils';
import {
  Truck,
  PlusCircle,
  Phone,
  Mail,
  Send,
  Edit2,
  Trash2,
  Tv,
  DollarSign,
  Search,
  MessageCircle,
} from 'lucide-react';

interface SuppliersViewProps {
  providers: Provider[];
  accounts: Account[];
  onSaveProvider: (provider: Partial<Provider>) => void;
  onDeleteProvider: (id: string) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  providers,
  accounts,
  onSaveProvider,
  onDeleteProvider,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Partial<Provider> | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelegram, setFormTelegram] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Binance USDT');
  const [formNotes, setFormNotes] = useState('');

  const handleOpenAddModal = () => {
    setEditingProvider(null);
    setFormName('');
    setFormContactName('');
    setFormPhone('');
    setFormEmail('');
    setFormTelegram('');
    setFormPaymentMethod('Binance USDT');
    setFormNotes('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Provider) => {
    setEditingProvider(p);
    setFormName(p.name);
    setFormContactName(p.contactName || '');
    setFormPhone(p.phone);
    setFormEmail(p.email || '');
    setFormTelegram(p.telegram || '');
    setFormPaymentMethod(p.paymentMethod || 'Binance USDT');
    setFormNotes(p.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<Provider> = {
      id: editingProvider?.id,
      name: formName,
      contactName: formContactName,
      phone: formPhone,
      email: formEmail,
      telegram: formTelegram,
      paymentMethod: formPaymentMethod,
      notes: formNotes,
    };
    onSaveProvider(payload);
    setModalOpen(false);
  };

  // Filter
  const filteredProviders = providers.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.contactName && p.contactName.toLowerCase().includes(q)) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.paymentMethod && p.paymentMethod.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Directorio de Proveedores y Distribuidores
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Control de contactos, métodos de pago, notas de garantía y total gastado por distribuidor.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          + Registrar Proveedor
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar proveedor por nombre, teléfono, pago..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
        />
      </div>

      {/* Grid */}
      {filteredProviders.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <Truck className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-semibold text-sm">No hay proveedores registrados</p>
          <p className="text-zinc-500 text-xs mt-1">
            Registra a tus proveedores para asociar tus cuentas maestras y llevar control de costos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map((prov) => {
            // Stats
            const provAccounts = accounts.filter((a) => a.providerId === prov.id);
            const totalSpent = provAccounts.reduce((sum, a) => sum + (a.cost || 0), 0);
            const waUrl = createWhatsAppUrl(prov.phone, `Hola ${prov.contactName || prov.name}, te escribo por una consulta de cuentas.`);

            return (
              <div
                key={prov.id}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 space-y-4 transition shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base text-white">{prov.name}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(prov)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este proveedor?')) onDeleteProvider(prov.id);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {prov.contactName && <p className="text-xs text-zinc-400 mb-2">Contacto: {prov.contactName}</p>}

                  <div className="space-y-1.5 text-xs bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-indigo-400" /> Teléfono:
                      </span>
                      <span className="font-mono font-semibold">{prov.phone}</span>
                    </div>

                    {prov.email && (
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email:
                        </span>
                        <span className="font-mono text-[11px] truncate max-w-[140px]">{prov.email}</span>
                      </div>
                    )}

                    {prov.telegram && (
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 text-cyan-400" /> Telegram:
                        </span>
                        <span className="font-mono font-semibold text-cyan-400">{prov.telegram}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-zinc-300 pt-1 border-t border-zinc-800/60">
                      <span className="text-zinc-500">Medio de Pago:</span>
                      <span className="font-semibold text-amber-400">{prov.paymentMethod}</span>
                    </div>
                  </div>

                  {prov.notes && (
                    <p className="text-xs text-zinc-400 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/60 mt-3 italic leading-relaxed">
                      "{prov.notes}"
                    </p>
                  )}
                </div>

                {/* Footer Stats & WhatsApp */}
                <div className="pt-3 border-t border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Tv className="w-3.5 h-3.5 text-indigo-400" /> Cuentas Compradas:
                    </span>
                    <span className="font-bold text-white">{provAccounts.length} cuentas</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Inversión Total:
                    </span>
                    <span className="font-bold text-emerald-400">{formatMoney(totalSpent)}</span>
                  </div>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                  >
                    <Send className="w-4 h-4" /> Escribir al Proveedor (WhatsApp)
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {editingProvider ? 'Editar Proveedor' : 'Registrar Proveedor'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Nombre del Proveedor / Empresa *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Distribuidor Streaming MX"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Nombre de Contacto</label>
                <input
                  type="text"
                  placeholder="ej. Carlos Rivas"
                  value={formContactName}
                  onChange={(e) => setFormContactName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Teléfono / WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. +525512345678"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Correo (Opcional)</label>
                  <input
                    type="email"
                    placeholder="correo@proveedor.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Telegram (Opcional)</label>
                  <input
                    type="text"
                    placeholder="@usuario_tg"
                    value={formTelegram}
                    onChange={(e) => setFormTelegram(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Medio de Pago Habitual</label>
                <input
                  type="text"
                  placeholder="ej. Binance USDT, Transferencia, Zelle"
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Notas / Políticas de Garantía</label>
                <textarea
                  rows={3}
                  placeholder="ej. Reemplazos rápidos en 2 horas. Garantía 30 días."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

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
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
