import React, { useState, useEffect } from 'react';
import {
  Account,
  Customer,
  CustomService,
  MessageTemplate,
  NavigationTab,
  Provider,
  Sale,
  SubscriptionToken,
  TokenAuditLog,
  User,
  UserSettings,
} from './types';
import {
  apiLogin,
  apiRegister,
  apiRedeemToken,
  fetchAppData,
  apiSaveProvider,
  apiDeleteProvider,
  apiSaveAccount,
  apiDeleteAccount,
  apiSaveCustomer,
  apiDeleteCustomer,
  apiSaveSale,
  apiRenewSale,
  apiDeleteSale,
  apiSaveTemplate,
  apiDeleteTemplate,
  apiGenerateTokens,
  apiSaveSettings,
  apiSaveCustomService,
  apiDeleteCustomService,
  apiAcceptTerms,
} from './lib/storage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { GracePeriodBanner } from './components/GracePeriodBanner';
import { DashboardView } from './components/DashboardView';
import { AccountsView } from './components/AccountsView';
import { SalesView } from './components/SalesView';
import { ExpirationsView } from './components/ExpirationsView';
import { SuppliersView } from './components/SuppliersView';
import { CustomersView } from './components/CustomersView';
import { TemplatesView } from './components/TemplatesView';
import { TokensView } from './components/TokensView';
import { SettingsView } from './components/SettingsView';
import { InfoView } from './components/InfoView';
import { AuthModal } from './components/AuthModal';
import { TermsModal } from './components/TermsModal';
import { SubscriptionLockModal } from './components/SubscriptionLockModal';
import { getDaysRemaining } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('stream_control_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');

  // Collections state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [tokens, setTokens] = useState<SubscriptionToken[]>([]);
  const [tokenAuditLogs, setTokenAuditLogs] = useState<TokenAuditLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    userId: user?.id || '',
    currency: 'USD',
    currencySymbol: '$',
    theme: 'theme-dark-red',
    customServices: [],
  });
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);

  // Modals
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);

  // Initial Data Load
  const reloadData = async () => {
    setIsCloudSyncing(true);
    const data = await fetchAppData(user?.id);
    if (data) {
      if (data.providers) setProviders(data.providers);
      if (data.accounts) setAccounts(data.accounts);
      if (data.customers) setCustomers(data.customers);
      if (data.sales) setSales(data.sales);
      if (data.templates) setTemplates(data.templates);
      if (data.tokens) setTokens(data.tokens);
      if (data.tokenAuditLogs) setTokenAuditLogs(data.tokenAuditLogs);
      if (data.settings) setSettings(data.settings);
      if (data.customServices) setCustomServices(data.customServices);
      setLastCloudSync(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    setIsCloudSyncing(false);
  };

  useEffect(() => {
    reloadData();
  }, [user]);

  // Sync Theme to HTML Root
  useEffect(() => {
    const activeTheme = settings.theme || 'theme-dark-red';
    document.documentElement.className = activeTheme;
  }, [settings.theme]);

  const getThemeContainerClass = (theme?: string) => {
    switch (theme) {
      case 'theme-dark-emerald':
        return 'bg-slate-950 text-emerald-100 selection:bg-emerald-500';
      case 'theme-dark-violet':
        return 'bg-zinc-950 text-purple-100 selection:bg-purple-600';
      case 'theme-dark-blue':
        return 'bg-slate-900 text-blue-100 selection:bg-blue-600';
      case 'theme-dark-gold':
        return 'bg-stone-950 text-amber-100 selection:bg-amber-500';
      case 'theme-dark-rose':
        return 'bg-zinc-950 text-rose-100 selection:bg-rose-600';
      case 'theme-light':
        return 'bg-slate-100 text-slate-900 selection:bg-indigo-600';
      default:
        return 'bg-zinc-950 text-zinc-100 selection:bg-red-600';
    }
  };

  // Auth Handlers
  const handleLogin = async (email: string, password?: string) => {
    const res = await apiLogin(email, password);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem('stream_control_user', JSON.stringify(res.user));
    }
    return res;
  };

  const handleRegister = async (email: string, password?: string, name?: string) => {
    const res = await apiRegister(email, password, name);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem('stream_control_user', JSON.stringify(res.user));
    }
    return res;
  };

  const handleAcceptTerms = async () => {
    if (!user) return;
    const res = await apiAcceptTerms(user.id);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem('stream_control_user', JSON.stringify(res.user));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('stream_control_user');
  };

  const handleRedeemToken = async (code: string) => {
    if (!user) return { success: false, error: 'Inicia sesión primero.' };
    const res = await apiRedeemToken(user.id, code);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem('stream_control_user', JSON.stringify(res.user));
      reloadData();
    }
    return res;
  };

  // CRUD Actions
  const handleSaveProvider = async (provider: Partial<Provider>) => {
    if (!user) return;
    await apiSaveProvider({ ...provider, userId: user.id });
    reloadData();
  };

  const handleDeleteProvider = async (id: string) => {
    await apiDeleteProvider(id);
    reloadData();
  };

  const handleSaveAccount = async (account: Partial<Account>) => {
    if (!user) return;
    await apiSaveAccount({ ...account, userId: user.id });
    reloadData();
  };

  const handleDeleteAccount = async (id: string) => {
    await apiDeleteAccount(id);
    reloadData();
  };

  const handleSaveCustomer = async (customer: Partial<Customer>) => {
    if (!user) return;
    await apiSaveCustomer({ ...customer, userId: user.id });
    reloadData();
  };

  const handleDeleteCustomer = async (id: string) => {
    await apiDeleteCustomer(id);
    reloadData();
  };

  const handleSaveSale = async (sale: Partial<Sale>) => {
    if (!user) return;
    await apiSaveSale({ ...sale, userId: user.id });
    reloadData();
  };

  const handleRenewSale = async (saleId: string) => {
    await apiRenewSale(saleId, 30);
    reloadData();
  };

  const handleDeleteSale = async (id: string) => {
    await apiDeleteSale(id);
    reloadData();
  };

  const handleSaveTemplate = async (template: Partial<MessageTemplate>) => {
    if (!user) return;
    await apiSaveTemplate({ ...template, userId: user.id });
    reloadData();
  };

  const handleDeleteTemplate = async (id: string) => {
    await apiDeleteTemplate(id);
    reloadData();
  };

  const handleGenerateTokens = async (count: number, days: number) => {
    const generated = await apiGenerateTokens(count, days);
    reloadData();
    return generated;
  };

  const handleUpdateSettings = async (newSettings: { currency?: string; currencySymbol?: string; theme?: string }) => {
    if (!user) return;
    const updated = { ...settings, ...newSettings, userId: user.id };
    setSettings(updated);
    await apiSaveSettings(updated);
    reloadData();
  };

  const handleAddCustomService = async (service: { name: string; color: string; defaultProfiles: number; iconName: string }) => {
    if (!user) return;
    await apiSaveCustomService({ ...service, userId: user.id });
    reloadData();
  };

  const handleDeleteCustomService = async (id: string) => {
    await apiDeleteCustomService(id);
    reloadData();
  };

  const handleExportBackup = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/backup/export?userId=${user.id}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_streamcontrol_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar respaldo.');
    }
  };

  const handleRestoreBackup = async (file: File) => {
    if (!user) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupObj = JSON.parse(e.target?.result as string);
          const res = await fetch('/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, backup: backupObj }),
          });
          const data = await res.json();
          if (data.success) {
            alert('¡Respaldo restaurado con éxito!');
            reloadData();
          } else {
            alert('Error: ' + data.error);
          }
        } catch (err) {
          alert('Archivo JSON no válido.');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      alert('Error al leer el archivo de respaldo.');
    }
  };

  // Counts for Badges
  const expiringCount = sales.filter((s) => {
    if (s.status === 'cancelled') return false;
    const days = getDaysRemaining(s.endDate);
    return days <= 3;
  }).length;

  let availableProfilesCount = 0;
  accounts.forEach((acc) => {
    if (acc.isFullAccount) {
      if (!acc.isFullAccountSold) availableProfilesCount += 1;
    } else if (acc.profiles) {
      availableProfilesCount += acc.profiles.filter((p) => p.status === 'available').length;
    }
  });

  const defaultTemplateBody = templates.find((t) => t.isDefault)?.body || templates[0]?.body;

  const subDays = user?.subscriptionUntil ? getDaysRemaining(user.subscriptionUntil, (user as any).serverTime) : 0;
  const graceDays = user?.gracePeriodUntil ? getDaysRemaining(user.gracePeriodUntil, (user as any).serverTime) : 0;
  const isAppLocked = user ? ((user as any).isLocked || (!user.isAdmin && subDays <= 0 && graceDays <= 0)) : false;

  if (!user) {
    return <AuthModal onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (user && !user.hasAcceptedTerms) {
    return <TermsModal user={user} onAccept={handleAcceptTerms} />;
  }

  return (
    <div className={`min-h-screen ${getThemeContainerClass(settings.theme)} flex flex-col font-sans transition-colors duration-300 relative`}>
      {/* App Lock Overlay if Subscription & Grace expired */}
      {isAppLocked && (
        <SubscriptionLockModal
          user={user}
          onRedeemToken={async (code) => {
            const res = await handleRedeemToken(code);
            return res;
          }}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenRedeemToken={() => setCurrentTab('tokens')}
        onOpenNewSale={() => {
          setCurrentTab('sales');
          setNewSaleModalOpen(true);
        }}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        expiringCount={expiringCount}
        onExportBackup={handleExportBackup}
        onRestoreBackup={handleRestoreBackup}
        isCloudSyncing={isCloudSyncing}
        lastCloudSync={lastCloudSync}
      />

      {/* Main Body Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          expiringCount={expiringCount}
          availableProfilesCount={availableProfilesCount}
          user={user}
        />

        {/* Main Workspace View */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Grace Period & Subscription Warning Banner */}
          <GracePeriodBanner user={user} onOpenRedeemToken={() => setCurrentTab('tokens')} />

          {/* Render Active View Tab */}
          {currentTab === 'dashboard' && (
            <DashboardView
              sales={sales}
              accounts={accounts}
              providers={providers}
              customers={customers}
              customServices={customServices}
              currency={settings.currency}
              onOpenNewSale={() => {
                setCurrentTab('sales');
                setNewSaleModalOpen(true);
              }}
              onOpenNewAccount={() => {
                setCurrentTab('accounts');
              }}
              onRenewSale={handleRenewSale}
              onSelectTab={setCurrentTab}
              defaultTemplateBody={defaultTemplateBody}
            />
          )}

          {currentTab === 'accounts' && (
            <AccountsView
              accounts={accounts}
              providers={providers}
              sales={sales}
              customServices={customServices}
              currency={settings.currency}
              onSaveAccount={handleSaveAccount}
              onDeleteAccount={handleDeleteAccount}
            />
          )}

          {currentTab === 'sales' && (
            <SalesView
              sales={sales}
              accounts={accounts}
              customers={customers}
              customServices={customServices}
              currency={settings.currency}
              onSaveSale={handleSaveSale}
              onRenewSale={handleRenewSale}
              onDeleteSale={handleDeleteSale}
              defaultTemplateBody={defaultTemplateBody}
              modalOpen={newSaleModalOpen}
              setModalOpen={setNewSaleModalOpen}
            />
          )}

          {currentTab === 'expirations' && (
            <ExpirationsView
              sales={sales}
              accounts={accounts}
              templates={templates}
              onRenewSale={handleRenewSale}
            />
          )}

          {currentTab === 'suppliers' && (
            <SuppliersView
              providers={providers}
              accounts={accounts}
              onSaveProvider={handleSaveProvider}
              onDeleteProvider={handleDeleteProvider}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              customers={customers}
              sales={sales}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {currentTab === 'templates' && (
            <TemplatesView
              templates={templates}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          )}

          {currentTab === 'tokens' && (
            <TokensView
              user={user}
              tokens={tokens}
              tokenAuditLogs={tokenAuditLogs}
              onRedeemToken={handleRedeemToken}
              onGenerateTokens={handleGenerateTokens}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              customServices={customServices}
              onUpdateSettings={handleUpdateSettings}
              onAddCustomService={handleAddCustomService}
              onDeleteCustomService={handleDeleteCustomService}
            />
          )}

          {currentTab === 'info' && <InfoView />}
        </main>
      </div>
    </div>
  );
}
