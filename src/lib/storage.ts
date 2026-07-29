import { Account, Customer, MessageTemplate, Provider, Sale, SubscriptionToken, User } from '../types';

export async function apiLogin(email: string, password?: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

export async function apiRegister(email: string, password?: string, name?: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrar usuario');
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

export async function apiRedeemToken(userId: string, tokenCode: string): Promise<{ success: boolean; message?: string; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/redeem-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tokenCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al canjear token');
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

export async function apiAcceptTerms(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/accept-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al aceptar términos');
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

export async function fetchAppData(userId?: string) {
  try {
    const url = userId ? `/api/data?userId=${encodeURIComponent(userId)}` : '/api/data';
    const res = await fetch(url);
    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    // Cache locally for offline/static use
    if (data) localStorage.setItem('stream_control_offline_db', JSON.stringify(data));
    return data;
  } catch (err) {
    console.warn('API not available, loading from local storage fallback:', err);
    const offlineData = localStorage.getItem('stream_control_offline_db');
    if (offlineData) {
      try {
        return JSON.parse(offlineData);
      } catch (e) {
        // invalid
      }
    }
    return {
      providers: [],
      accounts: [],
      customers: [],
      sales: [],
      templates: [
        {
          id: 'tpl_default',
          userId: userId || 'demo',
          title: 'Renovación de Cuenta',
          body: 'Hola {nombre_cliente}, tu suscripción de {plataforma} vence el {fecha_vencimiento}. Para renovar responde a este mensaje. ¡Gracias!',
          isDefault: true,
        },
      ],
      tokens: [],
      tokenAuditLogs: [],
      settings: {
        userId: userId || 'demo',
        currency: 'USD',
        currencySymbol: '$',
        theme: 'theme-dark-red',
        customServices: [],
      },
      customServices: [],
    };
  }
}

export async function apiUpdateCredentials(userId: string, creds: { newEmail?: string; newPassword?: string; newName?: string }) {
  const res = await fetch('/api/auth/update-credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...creds }),
  });
  return await res.json();
}

export async function apiSaveProvider(provider: Partial<Provider>): Promise<Provider> {
  const method = provider.id ? 'PUT' : 'POST';
  const url = provider.id ? `/api/providers/${provider.id}` : '/api/providers';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(provider),
  });
  return await res.json();
}

export async function apiDeleteProvider(id: string) {
  await fetch(`/api/providers/${id}`, { method: 'DELETE' });
}

export async function apiSaveAccount(account: Partial<Account>): Promise<Account> {
  const method = account.id ? 'PUT' : 'POST';
  const url = account.id ? `/api/accounts/${account.id}` : '/api/accounts';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  });
  return await res.json();
}

export async function apiDeleteAccount(id: string) {
  await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
}

export async function apiSaveCustomer(customer: Partial<Customer>): Promise<Customer> {
  const method = customer.id ? 'PUT' : 'POST';
  const url = customer.id ? `/api/customers/${customer.id}` : '/api/customers';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  });
  return await res.json();
}

export async function apiDeleteCustomer(id: string) {
  await fetch(`/api/customers/${id}`, { method: 'DELETE' });
}

export async function apiSaveSale(sale: Partial<Sale>): Promise<Sale> {
  const method = sale.id ? 'PUT' : 'POST';
  const url = sale.id ? `/api/sales/${sale.id}` : '/api/sales';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sale),
  });
  return await res.json();
}

export async function apiRenewSale(saleId: string, days = 30, paymentMethod?: string) {
  const res = await fetch(`/api/sales/${saleId}/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days, paymentMethod }),
  });
  return await res.json();
}

export async function apiDeleteSale(id: string) {
  await fetch(`/api/sales/${id}`, { method: 'DELETE' });
}

export async function apiSaveTemplate(template: Partial<MessageTemplate>): Promise<MessageTemplate> {
  const method = template.id ? 'PUT' : 'POST';
  const url = template.id ? `/api/templates/${template.id}` : '/api/templates';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  return await res.json();
}

export async function apiDeleteTemplate(id: string) {
  await fetch(`/api/templates/${id}`, { method: 'DELETE' });
}

export async function apiGenerateTokens(count = 1, days = 30): Promise<SubscriptionToken[]> {
  const res = await fetch('/api/tokens/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, days }),
  });
  const data = await res.json();
  return data.tokens || [];
}

export async function apiRestoreBackup(jsonData: any) {
  const res = await fetch('/api/backup/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jsonData),
  });
  return await res.json();
}

export async function apiSaveSettings(settings: { userId: string; currency?: string; currencySymbol?: string; theme?: string }) {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return await res.json();
}

export async function apiSaveCustomService(service: { userId: string; name: string; color?: string; badgeBg?: string; textColor?: string; iconName?: string; defaultProfiles?: number }) {
  const res = await fetch('/api/custom-services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service),
  });
  return await res.json();
}

export async function apiDeleteCustomService(id: string) {
  const res = await fetch(`/api/custom-services/${id}`, { method: 'DELETE' });
  return await res.json();
}
