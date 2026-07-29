import React, { useState } from 'react';
import { Customer, Sale } from '../types';
import { formatMoney, createWhatsAppUrl } from '../lib/utils';
import { Users, PlusCircle, Search, Phone, Send, Edit2, Trash2, Tv, DollarSign } from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  sales: Sale[];
  onSaveCustomer: (customer: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  sales,
  onSaveCustomer,
  onDeleteCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormNotes(c.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<Customer> = {
      id: editingCustomer?.id,
      name: formName,
      phone: formPhone,
      email: formEmail,
      notes: formNotes,
    };
    onSaveCustomer(payload);
    setModalOpen(false);
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Directorio de Clientes
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Base de datos de compradores, números de WhatsApp, consumo total e historial de rentas.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          + Registrar Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar cliente por nombre, teléfono..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
        />
      </div>

      {/* Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-semibold text-sm">No hay clientes registrados</p>
          <p className="text-zinc-500 text-xs mt-1">Registra a tus clientes o crea una venta para auto-registrarlos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const custSales = sales.filter((s) => s.customerId === cust.id || s.customerPhone === cust.phone);
            const totalSpent = custSales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
            const waUrl = createWhatsAppUrl(cust.phone, `Hola ${cust.name}, ¿cómo estás? Te escribo de la plataforma de streaming.`);

            return (
              <div
                key={cust.id}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 space-y-4 transition shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base text-white">{cust.name}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(cust)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este cliente del directorio?')) onDeleteCustomer(cust.id);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp:
                      </span>
                      <span className="font-mono font-semibold">{cust.phone}</span>
                    </div>

                    {cust.email && (
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-500">Email:</span>
                        <span className="font-mono text-[11px] truncate max-w-[140px]">{cust.email}</span>
                      </div>
                    )}
                  </div>

                  {cust.notes && (
                    <p className="text-xs text-zinc-400 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/60 mt-3 italic leading-relaxed">
                      "{cust.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Tv className="w-3.5 h-3.5 text-indigo-400" /> Servicios Contratados:
                    </span>
                    <span className="font-bold text-white">{custSales.length} ventas</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Facturación Histórica:
                    </span>
                    <span className="font-bold text-emerald-400">{formatMoney(totalSpent)}</span>
                  </div>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                  >
                    <Send className="w-4 h-4" /> Enviar Mensaje WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {editingCustomer ? 'Editar Cliente' : 'Registrar Cliente'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Nombre Completo del Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. María González"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-red-500"
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

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  placeholder="cliente@gmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Notas / Preferencias del Cliente</label>
                <textarea
                  rows={3}
                  placeholder="ej. Paga siempre por Yape los días 15 de cada mes."
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
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
