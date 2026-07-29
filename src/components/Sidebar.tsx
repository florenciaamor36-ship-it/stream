import React from 'react';
import { NavigationTab, User } from '../types';
import {
  LayoutDashboard,
  Tv,
  Receipt,
  Clock,
  Truck,
  Users,
  MessageSquareCode,
  Ticket,
  Sliders,
  Info,
} from 'lucide-react';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  expiringCount: number;
  availableProfilesCount: number;
  user?: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  expiringCount,
  availableProfilesCount,
  user,
}) => {
  const isAdmin = user?.isAdmin !== false; // Default to true for demo admin or if specified

  const allMenuItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Inicio / Resumen',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      id: 'accounts' as NavigationTab,
      label: 'Cuentas y Pantallas',
      icon: Tv,
      badge: availableProfilesCount > 0 ? `${availableProfilesCount} Libres` : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      adminOnly: true,
    },
    {
      id: 'sales' as NavigationTab,
      label: 'Ventas y Rentas',
      icon: Receipt,
      adminOnly: false,
    },
    {
      id: 'expirations' as NavigationTab,
      label: 'Vencimientos',
      icon: Clock,
      badge: expiringCount > 0 ? `${expiringCount}` : undefined,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse',
      adminOnly: false,
    },
    {
      id: 'suppliers' as NavigationTab,
      label: 'Proveedores',
      icon: Truck,
      adminOnly: true,
    },
    {
      id: 'customers' as NavigationTab,
      label: 'Clientes',
      icon: Users,
      adminOnly: false,
    },
    {
      id: 'templates' as NavigationTab,
      label: 'Plantillas de Mensajes',
      icon: MessageSquareCode,
      adminOnly: true,
    },
    {
      id: 'tokens' as NavigationTab,
      label: 'Tokens y Suscripción',
      icon: Ticket,
      adminOnly: true,
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Ajustes y Configuración',
      icon: Sliders,
      adminOnly: true,
    },
    {
      id: 'info' as NavigationTab,
      label: 'Acerca de / Manual',
      icon: Info,
      adminOnly: false,
    },
  ];

  const menuItems = allMenuItems.filter((item) => isAdmin || !item.adminOnly);

  return (
    <aside className="w-full md:w-64 bg-zinc-950/60 border-b md:border-b-0 md:border-r border-zinc-800/80 p-3 flex flex-row md:flex-col justify-between shrink-0 overflow-x-auto md:overflow-visible scrollbar-none">
      <nav className="flex md:flex-col gap-1 w-full">
        <div className="hidden md:block px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          Navegación Principal
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition text-left whitespace-nowrap shrink-0 md:shrink ${
                isActive
                  ? 'bg-gradient-to-r from-red-600/90 to-red-700 text-white shadow-lg shadow-red-600/20 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Info */}
      <div className="hidden md:block pt-4 border-t border-zinc-800/60 mt-6 px-3 text-xs text-zinc-400 leading-relaxed">
        <p className="font-semibold text-zinc-300">💡 Control Total</p>
        <p className="text-[11px]">Monitorea costos, proveedores, clientes y rentas en tiempo real.</p>
      </div>
    </aside>
  );
};
