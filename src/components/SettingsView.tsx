import React, { useState } from 'react';
import { CustomService, User, UserSettings } from '../types';
import {
  Sliders,
  Coins,
  Palette,
  Tv,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Shield,
  Zap,
  Globe,
  Radio,
  Gamepad,
  Music,
  Film,
  PlaySquare,
  LayoutGrid,
  Sun,
  Moon,
} from 'lucide-react';
import { formatMoney } from '../lib/utils';

interface SettingsViewProps {
  user: User | null;
  settings: UserSettings;
  customServices: CustomService[];
  onUpdateSettings: (newSettings: { currency?: string; currencySymbol?: string; theme?: string }) => Promise<void>;
  onAddCustomService: (service: { name: string; color: string; defaultProfiles: number; iconName: string }) => Promise<void>;
  onDeleteCustomService: (id: string) => Promise<void>;
}

export const CURRENCY_OPTIONS = [
  { code: 'USD', name: 'Dólar Estadounidense ($)', symbol: '$', flag: '🇺🇸' },
  { code: 'ARS', name: 'Peso Argentino ($)', symbol: '$', flag: '🇦🇷' },
  { code: 'MXN', name: 'Peso Mexicano ($)', symbol: '$', flag: '🇲🇽' },
  { code: 'COP', name: 'Peso Colombiano ($)', symbol: '$', flag: '🇨🇴' },
  { code: 'PEN', name: 'Sol Peruano (S/)', symbol: 'S/', flag: '🇵🇪' },
  { code: 'CLP', name: 'Peso Chileno ($)', symbol: '$', flag: '🇨🇱' },
  { code: 'EUR', name: 'Euro (€)', symbol: '€', flag: '🇪🇺' },
  { code: 'BRL', name: 'Real Brasileño (R$)', symbol: 'R$', flag: '🇧🇷' },
  { code: 'DOP', name: 'Peso Dominicano (RD$)', symbol: 'RD$', flag: '🇩🇴' },
  { code: 'VES', name: 'Bolívar Venezolano (Bs.)', symbol: 'Bs.', flag: '🇻🇪' },
  { code: 'GTQ', name: 'Quetzal Guatemalteco (Q)', symbol: 'Q', flag: '🇬🇹' },
  { code: 'HNL', name: 'Lempira Hondureño (L)', symbol: 'L', flag: '🇭🇳' },
  { code: 'CRC', name: 'Colón Costarricense (₡)', symbol: '₡', flag: '🇨🇷' },
];

export const THEME_PRESETS = [
  {
    id: 'theme-dark-red',
    name: 'Rojo Obsidian (Predeterminado)',
    description: 'Estilo clásico streaming en rojo intenso sobre negro profundo.',
    bgPreview: 'bg-zinc-950',
    accentColor: 'bg-red-600',
    borderColor: 'border-red-500/50',
    textColor: 'text-red-400',
    isDark: true,
  },
  {
    id: 'theme-dark-emerald',
    name: 'Esmeralda Neón / Ciber',
    description: 'Estilo ciberfuturista con destellos verde neón y esmeralda.',
    bgPreview: 'bg-slate-950',
    accentColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500/50',
    textColor: 'text-emerald-400',
    isDark: true,
  },
  {
    id: 'theme-dark-violet',
    name: 'Púrpura Imperial / Amatista',
    description: 'Elegancia de lujo con acentos púrpuras y tonos violetas.',
    bgPreview: 'bg-zinc-950',
    accentColor: 'bg-purple-600',
    borderColor: 'border-purple-500/50',
    textColor: 'text-purple-400',
    isDark: true,
  },
  {
    id: 'theme-dark-blue',
    name: 'Azul Zafiro / Noche Oceánica',
    description: 'Diseño moderno, corporativo y limpio en tonos azul noche.',
    bgPreview: 'bg-slate-900',
    accentColor: 'bg-blue-600',
    borderColor: 'border-blue-500/50',
    textColor: 'text-blue-400',
    isDark: true,
  },
  {
    id: 'theme-dark-gold',
    name: 'Dorado Calidez / Ébano',
    description: 'Sofisticación cálida con tonos ámbar y acentos dorados.',
    bgPreview: 'bg-stone-950',
    accentColor: 'bg-amber-500',
    borderColor: 'border-amber-500/50',
    textColor: 'text-amber-400',
    isDark: true,
  },
  {
    id: 'theme-dark-rose',
    name: 'Rosa Carmesí / Borgoña',
    description: 'Atmósfera rosada vibrante y estilizada de alta visibilidad.',
    bgPreview: 'bg-zinc-950',
    accentColor: 'bg-rose-600',
    borderColor: 'border-rose-500/50',
    textColor: 'text-rose-400',
    isDark: true,
  },
  {
    id: 'theme-light',
    name: 'Modo Claro Moderno',
    description: 'Interfaz limpia, luminosa de alto contraste para ambientes iluminados.',
    bgPreview: 'bg-gray-100',
    accentColor: 'bg-indigo-600',
    borderColor: 'border-indigo-500/50',
    textColor: 'text-indigo-600',
    isDark: false,
  },
];

const PRESET_COLORS = [
  { hex: '#E50914', label: 'Rojo Streaming' },
  { hex: '#10B981', label: 'Verde Esmeralda' },
  { hex: '#3B82F6', label: 'Azul Eléctrico' },
  { hex: '#8B5CF6', label: 'Púrpura Místico' },
  { hex: '#F59E0B', label: 'Ámbar Cálido' },
  { hex: '#EC4899', label: 'Rosa Neón' },
  { hex: '#06B6D4', label: 'Cian Neón' },
  { hex: '#64748B', label: 'Gris Grafito' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  settings,
  customServices,
  onUpdateSettings,
  onAddCustomService,
  onDeleteCustomService,
}) => {
  // Service Form state
  const [serviceName, setServiceName] = useState('');
  const [serviceColor, setServiceColor] = useState('#8B5CF6');
  const [serviceProfiles, setServiceProfiles] = useState(4);
  const [serviceIcon, setServiceIcon] = useState('Tv');
  const [isAddingService, setIsAddingService] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    setIsAddingService(true);
    try {
      await onAddCustomService({
        name: serviceName.trim(),
        color: serviceColor,
        defaultProfiles: serviceProfiles,
        iconName: serviceIcon,
      });
      setServiceName('');
      setSaveSuccessMsg('¡Nuevo servicio agregado con éxito!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch {
      alert('Error al agregar el servicio.');
    } finally {
      setIsAddingService(false);
    }
  };

  const handleCurrencyChange = async (code: string) => {
    const selected = CURRENCY_OPTIONS.find((c) => c.code === code);
    await onUpdateSettings({
      currency: code,
      currencySymbol: selected?.symbol || '$',
    });
    setSaveSuccessMsg(`Moneda actualizada a ${code}`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleThemeChange = async (themeId: string) => {
    await onUpdateSettings({ theme: themeId });
    setSaveSuccessMsg('¡Tema visual actualizado!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
              <Sliders className="w-4 h-4" /> Personalización & Ajustes Globales
            </div>
            <h2 className="text-2xl font-black text-white">Configuración del Sistema</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Administra nuevos servicios personalizados, ajusta tu moneda preferida y personaliza el tema visual.
            </p>
          </div>

          {saveSuccessMsg && (
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-bounce">
              <Check className="w-4 h-4" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 1: CUSTOM SERVICES (Anotar nuevos servicios) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Servicios Personalizados</h3>
                  <p className="text-xs text-zinc-400">
                    Añade nuevas plataformas (IPTV, Canva, VPN, AI, Licencias) para venderlas libremente.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {customServices.length} Registrados
              </span>
            </div>

            {/* Add Service Form */}
            <form onSubmit={handleAddService} className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/80 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-purple-400" /> Registrar Nuevo Servicio / Plataforma
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Nombre del Servicio *</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="Ej. Magis TV 4K, ChatGPT Plus, IPTV VIP"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Pantallas / Perfiles por Defecto</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={serviceProfiles}
                    onChange={(e) => setServiceProfiles(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Color Distintivo de la Marca</label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setServiceColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-7 h-7 rounded-lg transition transform hover:scale-110 flex items-center justify-center border ${
                        serviceColor === c.hex ? 'ring-2 ring-white scale-110' : 'border-black/30'
                      }`}
                      title={c.label}
                    >
                      {serviceColor === c.hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={serviceColor}
                    onChange={(e) => setServiceColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-zinc-700"
                    title="Color personalizado"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isAddingService || !serviceName.trim()}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingService ? 'Guardando...' : 'Guardar Servicio'}</span>
                </button>
              </div>
            </form>

            {/* List of Registered Custom Services */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Lista de Servicios Personalizados
              </h4>

              {customServices.length === 0 ? (
                <div className="text-center py-8 bg-zinc-950/50 rounded-xl border border-zinc-800/50 text-zinc-500 text-xs">
                  No has registrado servicios personalizados todavía. Usa el formulario arriba para agregar uno.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customServices.map((cs) => (
                    <div
                      key={cs.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-md"
                          style={{ backgroundColor: cs.color }}
                        >
                          {cs.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{cs.name}</p>
                          <p className="text-[11px] text-zinc-400">{cs.defaultProfiles} perfiles por defecto</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar el servicio personalizado "${cs.name}"?`)) {
                            onDeleteCustomService(cs.id);
                          }
                        }}
                        className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-900 transition"
                        title="Eliminar servicio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: THEMES (Varios temas) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-md space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Temas Visuales & Apariencia</h3>
                <p className="text-xs text-zinc-400">
                  Selecciona la paleta de colores y ambiente visual que prefieras para tu panel.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {THEME_PRESETS.map((t) => {
                const isActive = settings.theme === t.id || (!settings.theme && t.id === 'theme-dark-red');

                return (
                  <button
                    key={t.id}
                    onClick={() => handleThemeChange(t.id)}
                    className={`text-left p-4 rounded-xl border transition flex flex-col justify-between gap-3 relative overflow-hidden ${
                      t.bgPreview
                    } ${
                      isActive
                        ? `ring-2 ring-indigo-500 border-indigo-500 shadow-lg`
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${t.accentColor}`} />
                        <span className="font-bold text-sm text-white">{t.name}</span>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Activo
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>

                    {/* Mini Color Strip */}
                    <div className="flex items-center gap-1.5 pt-2">
                      <div className={`h-2 flex-1 rounded ${t.accentColor}`} />
                      <div className="h-2 flex-1 rounded bg-zinc-800" />
                      <div className="h-2 flex-1 rounded bg-zinc-700" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 3: CURRENCY SELECTOR & ACCOUNT SUMMARY */}
        <div className="space-y-6">
          {/* Currency Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-md space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Moneda del Sistema</h3>
                <p className="text-xs text-zinc-400">Elige la divisa para reportes, precios y WhatsApp.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-400">Seleccionar Divisa *</label>
              <select
                value={settings.currency || 'USD'}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code} className="bg-zinc-900 text-white">
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Money Preview */}
            <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Vista Previa de Formato Monetario
              </span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {formatMoney(1250.5, settings.currency || 'USD', settings.currencySymbol)}
              </div>
              <p className="text-[11px] text-zinc-400">
                Todos los ingresos, costos y ganancias de la aplicación se mostrarán automáticamente en este formato.
              </p>
            </div>
          </div>

          {/* Account & Security Credentials Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Cambiar Credenciales Admin</h3>
                <p className="text-xs text-zinc-400">Actualiza tu correo y contraseña de acceso seguro.</p>
              </div>
            </div>

            {user && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const newEmail = target.email.value;
                  const newPassword = target.password.value;
                  const newName = target.name.value;

                  try {
                    const res = await fetch('/api/auth/update-credentials', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.id, newEmail, newPassword, newName }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Error al actualizar');
                    setSaveSuccessMsg('¡Credenciales de Administrador actualizadas con éxito!');
                    setTimeout(() => setSaveSuccessMsg(''), 4000);
                  } catch (err: any) {
                    alert(err.message || 'Error al guardar credenciales');
                  }
                }}
                className="space-y-3 pt-1"
              >
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={user.name}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Correo Electrónico (Login)</label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={user.email}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Nueva Contraseña de Acceso</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Dejar en blanco para mantener la actual"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition active:scale-95"
                >
                  Guardar Nuevas Credenciales
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
