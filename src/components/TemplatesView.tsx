import React, { useState } from 'react';
import { MessageTemplate } from '../types';
import { interpolateTemplate } from '../lib/utils';
import { MessageSquareCode, PlusCircle, Edit2, Trash2, Copy, Check, Sparkles, Send } from 'lucide-react';

interface TemplatesViewProps {
  templates: MessageTemplate[];
  onSaveTemplate: (tmpl: Partial<MessageTemplate>) => void;
  onDeleteTemplate: (id: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<MessageTemplate> | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<any>('custom');
  const [formBody, setFormBody] = useState('');

  // Tester sample values
  const [testCliente, setTestCliente] = useState('María González');
  const [testServicio, setTestServicio] = useState('Netflix');
  const [testEmail, setTestEmail] = useState('netflix.vip@strmdomain.com');
  const [testPassword, setTestPassword] = useState('ClaveSegura2026!');
  const [testPerfil, setTestPerfil] = useState('Perfil 1 - María');
  const [testPin, setTestPin] = useState('1234');
  const [testFecha, setTestFecha] = useState('2026-08-25');
  const [testPrecio, setTestPrecio] = useState('$3.50');

  const variableTags = [
    { tag: '{cliente}', desc: 'Nombre completo del cliente' },
    { tag: '{servicio}', desc: 'Plataforma o servicio (ej. Netflix)' },
    { tag: '{email_cuenta}', desc: 'Correo de acceso a la cuenta' },
    { tag: '{password}', desc: 'Contraseña de la cuenta' },
    { tag: '{perfil}', desc: 'Nombre del perfil asignado' },
    { tag: '{pin}', desc: 'PIN de acceso al perfil' },
    { tag: '{fecha_vencimiento}', desc: 'Fecha límite de servicio' },
    { tag: '{dias_restantes}', desc: 'Días faltantes para vencer' },
    { tag: '{precio}', desc: 'Monto a cobrar' },
    { tag: '{metodo_pago}', desc: 'Método de pago recibido' },
  ];

  const handleOpenAddModal = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormType('custom');
    setFormBody('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (t: MessageTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormType(t.type);
    setFormBody(t.body);
    setModalOpen(true);
  };

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<MessageTemplate> = {
      id: editingTemplate?.id,
      name: formName,
      type: formType,
      body: formBody,
    };
    onSaveTemplate(payload);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Plantillas Personalizables para Mensajes de WhatsApp
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configura mensajes automáticos para bienvenida, cobros, recordatorios de vencimiento y claves.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          + Nueva Plantilla
        </button>
      </div>

      {/* Available Variables Guide */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Etiquetas Dinámicas Disponibles (haz clic para copiar):
        </h3>

        <div className="flex flex-wrap gap-2">
          {variableTags.map((v) => (
            <button
              key={v.tag}
              onClick={() => copyTag(v.tag)}
              className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-amber-400 flex items-center gap-1.5 transition active:scale-95"
              title={v.desc}
            >
              <span>{v.tag}</span>
              {copiedTag === v.tag ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {templates.map((tmpl) => {
          const sampleText = interpolateTemplate(tmpl.body, {
            cliente: testCliente,
            servicio: testServicio,
            email_cuenta: testEmail,
            password: testPassword,
            perfil: testPerfil,
            pin: testPin,
            fecha_vencimiento: testFecha,
            dias_restantes: 3,
            precio: testPrecio,
          });

          return (
            <div
              key={tmpl.id}
              className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 space-y-4 transition shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">{tmpl.name}</h3>
                    {tmpl.isDefault && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Predeterminada
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(tmpl)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!tmpl.isDefault && (
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar esta plantilla?')) onDeleteTemplate(tmpl.id);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Body Raw */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-line leading-relaxed">
                  {tmpl.body}
                </div>
              </div>

              {/* Sample Rendered Preview */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  Vista Previa con Datos de Prueba:
                </span>
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl text-xs font-sans text-zinc-200 whitespace-pre-line leading-relaxed">
                  {sampleText}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {editingTemplate ? 'Editar Plantilla de Mensaje' : 'Nueva Plantilla de Mensaje'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Nombre de la Plantilla *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Aviso Especial de Renovación"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Cuerpo del Mensaje (Usa etiquetas dinámicas) *</label>
                <textarea
                  rows={8}
                  required
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Hola {cliente}, aquí están tus credenciales de {servicio}: Correo: {email_cuenta}, Clave: {password}, Perfil: {perfil}, PIN: {pin}..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-red-500 leading-relaxed"
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
                  Guardar Plantilla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
