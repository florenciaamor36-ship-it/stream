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
  apiRestoreSession,
  apiRequest,
  clearApiSession,
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
import { InstallAppPrompt } from './components/InstallAppPrompt';
import { getDaysRemaining } from './lib/utils';
import { notifyToast, requestConfirmation } from './lib/feedback';
import { FeedbackLayer } from './FeedbackLayer';
import { disableExpiryPush } from './lib/push';
import { PushNotificationsSettings } from './components/PushNotificationsSettings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const [currentTab, setCurrentTab] = useState<NavigationTab>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'expirations') return 'expirations';
    return 'dashboard';
  });

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

  // Resume a valid server session when the app/WebView is reopened.
  useEffect(() => {
    let active = true;
    apiRestoreSession().then((restoredUser) => {
      if (active && restoredUser) setUser(restoredUser);
    }).finally(() => {
      if (active) setIsRestoringSession(false);
    });
    return () => { active = false; };
  }, []);

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
    if (!user) return;
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
    }
    return res;
  };

  const handleRegister = async (email: string, password?: string, name?: string) => {
    const res = await apiRegister(email, password, name);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const handleAcceptTerms = async () => {
    if (!user) return;
    const res = await apiAcceptTerms(user.id);
    if (res.success && res.user) {
      setUser(res.user);
    }
  };

  const handleLogout = async () => {
    try { await disableExpiryPush(); } catch { /* Best effort: session logout must still complete. */ }
    setUser(null);
    await clearApiSession();
  };

  const handleRedeemToken = async (code: string) => {
    if (!user) return { success: false, error: 'Inicia sesión primero.' };
    const res = await apiRedeemToken(user.id, code);
    if (res.success && res.user) {
      setUser(res.user);
      reloadData();
      notifyToast({ message: 'Token aplicado correctamente.', kind: 'success' });
    }
    return res;
  };

  // CRUD Actions
  const handleSaveProvider = async (provider: Partial<Provider>) => {
    if (!user) return;
    try { await apiSaveProvider({ ...provider, userId: user.id }); await reloadData(); notifyToast({ message: provider.id ? 'Proveedor actualizado.' : 'Proveedor agregado.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo guardar el proveedor.', kind: 'error' }); throw error; }
  };

  const handleDeleteProvider = async (id: string) => {
    try { await apiDeleteProvider(id); await reloadData(); notifyToast({ message: 'Proveedor eliminado.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo eliminar el proveedor.', kind: 'error' }); throw error; }
  };

  const handleSaveAccount = async (account: Partial<Account>) => {
    if (!user) return;
    try { await apiSaveAccount({ ...account, userId: user.id }); await reloadData(); notifyToast({ message: account.id ? 'Cuenta actualizada.' : 'Cuenta agregada al inventario.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo guardar la cuenta.', kind: 'error' }); throw error; }
  };

  const handleDeleteAccount = async (id: string) => {
    try { await apiDeleteAccount(id); await reloadData(); notifyToast({ message: 'Cuenta eliminada del inventario.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo eliminar la cuenta.', kind: 'error' }); throw error; }
  };

  const handleSaveCustomer = async (customer: Partial<Customer>) => {
    if (!user) return;
    try { await apiSaveCustomer({ ...customer, userId: user.id }); await reloadData(); notifyToast({ message: customer.id ? 'Cliente actualizado.' : 'Cliente registrado.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo guardar el cliente.', kind: 'error' }); throw error; }
  };

  const handleDeleteCustomer = async (id: string) => {
    try { await apiDeleteCustomer(id); await reloadData(); notifyToast({ message: 'Cliente eliminado.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo eliminar el cliente.', kind: 'error' }); throw error; }
  };

  const handleSaveSale = async (sale: Partial<Sale>) => {
    if (!user) return;
    try { await apiSaveSale({ ...sale, userId: user.id }); await reloadData(); notifyToast({ message: sale.id ? 'Venta actualizada.' : 'Venta registrada.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo guardar la venta.', kind: 'error' }); throw error; }
  };

  const handleRenewSale = async (saleId: string) => {
    try { await apiRenewSale(saleId, 30); await reloadData(); notifyToast({ message: 'Venta renovada por 30 días.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo renovar la venta.', kind: 'error' }); throw error; }
  };

  const handleDeleteSale = async (id: string) => {
    try { await apiDeleteSale(id); await reloadData(); notifyToast({ message: 'Venta eliminada.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo eliminar la venta.', kind: 'error' }); throw error; }
  };

  const handleSaveTemplate = async (template: Partial<MessageTemplate>) => {
    if (!user) return;
    try { await apiSaveTemplate({ ...template, userId: user.id }); await reloadData(); notifyToast({ message: template.id ? 'Plantilla actualizada.' : 'Plantilla creada.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo guardar la plantilla.', kind: 'error' }); throw error; }
  };

  const handleDeleteTemplate = async (id: string) => {
    try { await apiDeleteTemplate(id); await reloadData(); notifyToast({ message: 'Plantilla eliminada.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo eliminar la plantilla.', kind: 'error' }); throw error; }
  };

  const handleGenerateTokens = async (count: number, days: number) => {
    const generated = await apiGenerateTokens(count, days);
    reloadData();
    notifyToast({ message: `${generated.length} token${generated.length === 1 ? '' : 's'} generado${generated.length === 1 ? '' : 's'}.`, kind: 'success' });
    return generated;
  };

  const handleUpdateSettings = async (newSettings: { currency?: string; currencySymbol?: string; theme?: string }) => {
    if (!user) return;
    const updated = { ...settings, ...newSettings, userId: user.id };
    setSettings(updated);
    try { await apiSaveSettings(updated); await reloadData(); notifyToast({ message: 'Configuración actualizada.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo guardar la configuración.', kind: 'error' }); throw error; }
  };

  const handleAddCustomService = async (service: { name: string; color: string; defaultProfiles: number; iconName: string; category?: 'streaming' | 'tv_digital' | 'other' }) => {
    if (!user) return;
    try { await apiSaveCustomService({ ...service, userId: user.id }); await reloadData(); notifyToast({ message: 'Servicio personalizado agregado.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo guardar el servicio.', kind: 'error' }); throw error; }
  };

  const handleDeleteCustomService = async (id: string) => {
    try { await apiDeleteCustomService(id); await reloadData(); notifyToast({ message: 'Servicio personalizado eliminado.', kind: 'success' }); }
    catch (error) { notifyToast({ message: error instanceof Error ? error.message : 'No se pudo eliminar el servicio.', kind: 'error' }); throw error; }
  };

  const handleExportBackup = async () => {
    if (!user) return;
    try {
      const res = await apiRequest(`/api/backup/export?userId=${user.id}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_streamcontrol_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notifyToast({ message: 'Respaldo descargado.', kind: 'success' });
    } catch (err) {
      notifyToast({ message: 'No se pudo exportar el respaldo.', kind: 'error' });
    }
  };

  const handleRestoreBackup = async (file: File) => {
    if (!user) return;
    const confirmed = await requestConfirmation({ title: 'Restaurar respaldo', message: 'La restauración va a modificar los datos de esta cuenta. ¿Querés continuar?', confirmLabel: 'Restaurar respaldo', danger: true });
    if (!confirmed) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupObj = JSON.parse(e.target?.result as string);
          const res = await apiRequest('/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, backup: backupObj }),
          });
          const data = await res.json();
          if (data.success) {
            reloadData();
            notifyToast({ message: 'Respaldo restaurado con éxito.', kind: 'success' });
          } else {
            notifyToast({ message: 'No se pudo restaurar el respaldo: ' + data.error, kind: 'error' });
          }
        } catch (err) {
          notifyToast({ message: 'El archivo JSON no es válido.', kind: 'error' });
        }
      };
      reader.readAsText(file);
    } catch (err) {
      notifyToast({ message: 'No se pudo leer el archivo de respaldo.', kind: 'error' });
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

  if (isRestoringSession) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-300 flex items-center justify-center">Restaurando sesión segura…</div>;
  }

  if (!user) {
    return <AuthModal onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (user && !user.hasAcceptedTerms) {
    return <TermsModal user={user} onAccept={handleAcceptTerms} />;
  }

  return (
    <div className={`min-h-screen ${getThemeContainerClass(settings.theme)} flex flex-col font-sans transition-colors duration-300 relative`}>
      <FeedbackLayer />
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

      {/* PWA install invitation; hides in standalone/installed app contexts. */}
      <div className="w-full px-4">
        <InstallAppPrompt />
      </div>

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
        <main className="min-w-0 flex-1 p-4 pt-6 md:p-6 md:pt-8 overflow-y-auto">
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
              onManageProviders={() => setCurrentTab('suppliers')}
              onManageServices={() => setCurrentTab('settings')}
              onAddCustomService={handleAddCustomService}
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
            <>
            <PushNotificationsSettings />
            <SettingsView
              user={user}
              onUserUpdated={setUser}
              settings={settings}
              customServices={customServices}
              onUpdateSettings={handleUpdateSettings}
              onAddCustomService={handleAddCustomService}
              onDeleteCustomService={handleDeleteCustomService}
            />
            </>
          )}

          {currentTab === 'info' && <InfoView />}
        </main>
      </div>
    </div>
  );
}

