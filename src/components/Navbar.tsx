import React, { useState, useRef } from 'react';
import { User, NavigationTab } from '../types';
import {
  Tv,
  KeyRound,
  User as UserIcon,
  LogOut,
  Sparkles,
  Menu,
  X,
  Clock,
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
  Database,
  Download,
  Upload,
  Cloud,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { getDaysRemaining } from '../lib/utils';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onOpenRedeemToken: () => void;
  onOpenNewSale: () => void;
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  expiringCount: number;
  onExportBackup: () => void;
  onRestoreBackup: (file: File) => void;
  isCloudSyncing?: boolean;
  lastCloudSync?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenRedeemToken,
  onOpenNewSale,
  currentTab,
  onSelectTab,
  expiringCount,
  onExportBackup,
  onRestoreBackup,
  isCloudSyncing = false,
  lastCloudSync,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscription calculation
  const subDays = user?.subscriptionUntil ? getDaysRemaining(user.subscriptionUntil) : 0;
  const graceDays = user?.gracePeriodUntil ? getDaysRemaining(user.gracePeriodUntil) : 0;

  let subBadgeBg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  let subStatusText = `Suscripción Activa: ${subDays} días`;
  let isWarning = false;

  if (subDays <= 0) {
    if (graceDays > 0) {
      subBadgeBg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      subStatusText = `Período de Gracia: ${graceDays} días`;
      isWarning = true;
    } else {
      subBadgeBg = 'bg-red-500/15 text-red-400 border-red-500/30';
      subStatusText = 'Suscripción Vencida';
      isWarning = true;
    }
  } else if (subDays <= 3) {
    subBadgeBg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    subStatusText = `Vence pronto: ${subDays} días`;
    isWarning = true;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm('¿Estás seguro de que deseas restaurar este respaldo? Reemplazará tus datos actuales.')) {
        onRestoreBackup(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-6 py-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-indigo-600 p-0.5 shadow-lg shadow-red-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Tv className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
              StreamControl
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                PRO
              </span>
            </span>
            <p className="text-xs text-zinc-400 font-medium">Control de Venta y Renta de Pantallas</p>
          </div>
        </div>

        {/* Center / Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Quick New Sale button */}
          <button
            onClick={onOpenNewSale}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition shadow-md shadow-red-600/20 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Venta / Renta
          </button>

          {/* Cloud Storage Status Badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm"
            title={`Almacenamiento en Nube Activo. Todos tus registros se guardan automáticamente en tu servidor cloud. ${lastCloudSync ? 'Sincronizado: ' + lastCloudSync : ''}`}
          >
            {isCloudSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nube Activa</span>
          </div>

          {/* Backup Buttons */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={onExportBackup}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
              title="Descargar respaldo en JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Respaldo</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Restaurar datos desde un archivo JSON"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restaurar</span>
            </button>
          </div>

          {/* Subscription Status Indicator */}
          <button
            onClick={onOpenRedeemToken}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${subBadgeBg} hover:opacity-90`}
            title="Haz clic para canjear token de 30 días"
          >
            {isWarning ? <ShieldAlert className="w-4 h-4 animate-pulse" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{subStatusText}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-900/60 text-[10px] text-zinc-300 font-mono">
              + Canjear Token
            </span>
          </button>
        </div>

        {/* Right User & Controls */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-1.5">
              <div className="w-8 h-8 rounded-full bg-zinc-800 text-red-400 font-bold flex items-center justify-center border border-zinc-700 text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-semibold text-zinc-200 truncate max-w-[120px]">{user.name}</p>
                <p className="text-[10px] text-zinc-400 truncate max-w-[120px]">{user.email}</p>
              </div>

              <button
                onClick={onLogout}
                className="ml-2 text-zinc-400 hover:text-red-400 p-1 rounded-lg hover:bg-zinc-800 transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={onOpenRedeemToken}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${subBadgeBg}`}
          >
            {subDays > 0 ? `${subDays}d` : `${graceDays}d Gracia`}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-zinc-800 space-y-2 animate-fadeIn">
          <button
            onClick={() => {
              onOpenNewSale();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Venta / Renta
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportBackup}
              className="w-1/2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 text-zinc-200 text-xs font-medium border border-zinc-800"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" /> Descargar Respaldo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-1/2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 text-zinc-200 text-xs font-medium border border-zinc-800"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" /> Restaurar
            </button>
          </div>

          <button
            onClick={() => {
              onOpenRedeemToken();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-zinc-900 text-zinc-200 text-xs font-medium border border-zinc-800"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Estado: {subStatusText}
            </span>
            <span className="text-red-400 font-semibold">+ Canjear</span>
          </button>

          {user && (
            <div className="pt-2 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/60 px-2">
              <span>{user.email}</span>
              <button onClick={onLogout} className="text-red-400 font-medium flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" /> Salir
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
