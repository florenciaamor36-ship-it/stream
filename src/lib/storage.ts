import { Account, Customer, MessageTemplate, Provider, Sale, SubscriptionToken, User } from '../types';

const STREAM_API_BASE = String(import.meta.env.VITE_STREAM_API_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'stream_flow_session';
export const apiRemoteConfigured = Boolean(STREAM_API_BASE);

// Keep only the opaque authentication token across app/browser restarts. App data stays server-side.
function getStoredSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const persistent = window.localStorage.getItem(SESSION_KEY);
    if (persistent) return persistent;
    // Migrate an existing in-tab login once; sessionStorage disappears when the app is closed.
    const legacy = window.sessionStorage.getItem(SESSION_KEY);
    if (legacy) {
      window.localStorage.setItem(SESSION_KEY, legacy);
      window.sessionStorage.removeItem(SESSION_KEY);
      return legacy;
    }
  } catch { /* Storage may be unavailable in private/restricted browsing. */ }
  return null;
}

function storeSessionToken(token: string) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(SESSION_KEY, token); } catch {}
}

function removeStoredSessionToken() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {}
}

export async function clearApiSession() {
  try { if (apiRemoteConfigured) await apiRequest('/api/auth/logout', { method: 'POST' }); } catch {}
  removeStoredSessionToken();
}

export async function apiRestoreSession(): Promise<User | null> {
  if (!getStoredSessionToken()) return null;
  try {
    const res = await apiRequest('/api/auth/me');
    const data = await res.json();
    return data?.user || null;
  } catch (error: any) {
    if (String(error?.message || '').includes('Sesión inválida o vencida')) removeStoredSessionToken();
    return null;
  }
}

export async function apiRequest(input: RequestInfo | URL, init: RequestInit = {}) {
  const path = typeof input === 'string' ? input : input.toString();
  const headers = new Headers(init.headers || {});
  const token = getStoredSessionToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(STREAM_API_BASE ? `${STREAM_API_BASE}${path}` : input, { ...init, headers });
  if (!response.ok) {
    let message = 'No se pudo completar la solicitud.';
    try { const body = await response.clone().json(); if (body?.error) message = body.error; } catch {}
    throw new Error(message);
  }
  return response;
}

function saveSessionFromAuth(data: any) {
  const token = data?.user?.sessionToken;
  if (token) storeSessionToken(token);
  if (data?.user?.sessionToken) delete data.user.sessionToken;
  return data;
}

// There is no browser database, hard-coded user, or client-side subscription fallback in this branch.
function getOfflineDb(): never {
  throw new Error('El servidor seguro no está disponible; no se guardaron cambios localmente.');
}
function saveOfflineDb(_db: any) {
  // Intentionally a no-op: successful server data must never be copied to localStorage.
}

export async function apiLogin(email: string, password?: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = saveSessionFromAuth(await res.json());
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      return data;
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('Unexpected token')) {
      console.warn('Secure API login request failed:', err.message);
    if (apiRemoteConfigured) return { success: false, error: err?.message || 'No se pudo conectar con el servidor seguro.' } as any;
    }
  }

  return { success: false, error: 'El inicio de sesión requiere el servidor seguro.' };
}

export async function apiRegister(email: string, password?: string, name?: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = saveSessionFromAuth(await res.json());
      if (!res.ok) throw new Error(data.error || 'Error al registrar usuario');
      return data;
    }
  } catch (err: any) {
    console.warn('Secure API registration request failed:', err);
    if (apiRemoteConfigured) return { success: false, error: err?.message || 'No se pudo conectar con el servidor seguro.' } as any;
  }

  return { success: false, error: 'El registro requiere el servidor seguro.' };
}

export async function apiRedeemToken(userId: string, tokenCode: string): Promise<{ success: boolean; message?: string; user?: User; error?: string }> {
  try {
    const res = await apiRequest('/api/auth/redeem-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tokenCode }),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al canjear token');
      return data;
    }
  } catch (err: any) {
    console.warn('Secure API token redemption failed:', err);
    if (apiRemoteConfigured) return { success: false, error: err?.message || 'No se pudo conectar con el servidor seguro.' } as any;
  }

  return { success: false, error: 'El canje requiere el servidor seguro.' };
}

export async function apiAcceptTerms(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await apiRequest('/api/auth/accept-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al aceptar términos');
      return data;
    }
  } catch (err: any) {
    console.warn('Secure API terms update failed:', err);
    if (apiRemoteConfigured) return { success: false, error: err?.message || 'No se pudo conectar con el servidor seguro.' } as any;
  }

  return { success: false, error: 'Aceptar términos requiere el servidor seguro.' };
}

export async function fetchAppData(userId?: string) {
  try {
    const url = userId ? `/api/data?userId=${encodeURIComponent(userId)}` : '/api/data';
    const res = await apiRequest(url);
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (data) saveOfflineDb(data);
      return data;
    }
  } catch (err) {
    console.warn('Secure API data request failed:', err);
  }

  return getOfflineDb();
}

export async function apiUpdateCredentials(userId: string, creds: { newEmail?: string; newPassword?: string; newName?: string }) {
  try {
    const res = await apiRequest('/api/auth/update-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...creds }),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {}

  const db = getOfflineDb();
  const user = db.users.find((u: any) => u.id === userId);
  if (user) {
    if (creds.newEmail) user.email = creds.newEmail;
    if (creds.newPassword) user.password = creds.newPassword;
    if (creds.newName) user.name = creds.newName;
    saveOfflineDb(db);
    return { success: true, user };
  }
  return { success: false, error: 'Error al actualizar credenciales' };
}

export async function apiSaveProvider(provider: Partial<Provider>): Promise<Provider> {
  try {
    const method = provider.id ? 'PUT' : 'POST';
    const url = provider.id ? `/api/providers/${provider.id}` : '/api/providers';
    const res = await apiRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(provider),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {}

  const db = getOfflineDb();
  if (!provider.id) provider.id = 'prov_' + Date.now();
  const idx = db.providers.findIndex((p: any) => p.id === provider.id);
  if (idx >= 0) db.providers[idx] = { ...db.providers[idx], ...provider };
  else db.providers.push(provider);
  saveOfflineDb(db);
  return provider as Provider;
}

export async function apiDeleteProvider(id: string) {
  try {
    await apiRequest(`/api/providers/${id}`, { method: 'DELETE' });
    return;
  } catch (e) { throw e; }
  const db = getOfflineDb();
  db.providers = db.providers.filter((p: any) => p.id !== id);
  saveOfflineDb(db);
}

export async function apiSaveAccount(account: Partial<Account>): Promise<Account> {
  try {
    const method = account.id ? 'PUT' : 'POST';
    const url = account.id ? `/api/accounts/${account.id}` : '/api/accounts';
    const res = await apiRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {}

  const db = getOfflineDb();
  if (!account.id) account.id = 'acc_' + Date.now();
  const idx = db.accounts.findIndex((a: any) => a.id === account.id);
  if (idx >= 0) db.accounts[idx] = { ...db.accounts[idx], ...account };
  else db.accounts.push(account);
  saveOfflineDb(db);
  return account as Account;
}

export async function apiDeleteAccount(id: string) {
  try {
    await apiRequest(`/api/accounts/${id}`, { method: 'DELETE' });
    return;
  } catch (e) { throw e; }
  const db = getOfflineDb();
  db.accounts = db.accounts.filter((a: any) => a.id !== id);
  saveOfflineDb(db);
}

export async function apiSaveCustomer(customer: Partial<Customer>): Promise<Customer> {
  try {
    const method = customer.id ? 'PUT' : 'POST';
    const url = customer.id ? `/api/customers/${customer.id}` : '/api/customers';
    const res = await apiRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {}

  const db = getOfflineDb();
  if (!customer.id) customer.id = 'cust_' + Date.now();
  const idx = db.customers.findIndex((c: any) => c.id === customer.id);
  if (idx >= 0) db.customers[idx] = { ...db.customers[idx], ...customer };
  else db.customers.push(customer);
  saveOfflineDb(db);
  return customer as Customer;
}

export async function apiDeleteCustomer(id: string) {
  try {
    await apiRequest(`/api/customers/${id}`, { method: 'DELETE' });
    return;
  } catch (e) { throw e; }
  const db = getOfflineDb();
  db.customers = db.customers.filter((c: any) => c.id !== id);
  saveOfflineDb(db);
}

export async function apiSaveSale(sale: Partial<Sale>): Promise<Sale> {
  try {
    const method = sale.id ? 'PUT' : 'POST';
    const url = sale.id ? `/api/sales/${sale.id}` : '/api/sales';
    const res = await apiRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {}

  const db = getOfflineDb();
  if (!sale.id) sale.id = 'sale_' + Date.now();
  const idx = db.sales.findIndex((s: any) => s.id === sale.id);
  if (idx >= 0) db.sales[idx] = { ...db.sales[idx], ...sale };
  else db.sales.push(sale);
  saveOfflineDb(db);
  return sale as Sale;
}

export async function apiRenewSale(saleId: string, days = 30, paymentMethod?: string) {
  try {
    const res = await apiRequest(`/api/sales/${saleId}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days, paymentMethod }),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {}

  const db = getOfflineDb();
  const sale = db.sales.find((s: any) => s.id === saleId);
  if (sale) {
    const curr = new Date(sale.endDate || new Date());
    const base = curr.getTime() > Date.now() ? curr : new Date();
    base.setDate(base.getDate() + days);
    sale.endDate = base.toISOString();
    sale.status = 'active';
    sale.paymentStatus = 'paid';
    if (paymentMethod) sale.paymentMethod = paymentMethod;
    saveOfflineDb(db);
    return { success: true, sale };
  }
  return { success: false, error: 'Venta no encontrada' };
}

export async function apiDeleteSale(id: string) {
  try {
    await apiRequest(`/api/sales/${id}`, { method: 'DELETE' });
    return;
  } catch (e) { throw e; }
  const db = getOfflineDb();
  db.sales = db.sales.filter((s: any) => s.id !== id);
  saveOfflineDb(db);
}

export async function apiSaveTemplate(template: Partial<MessageTemplate>): Promise<MessageTemplate> {
  try {
    const method = template.id ? 'PUT' : 'POST';
    const url = template.id ? `/api/templates/${template.id}` : '/api/templates';
    const res = await apiRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {}

  const db = getOfflineDb();
  if (!template.id) template.id = 'tmpl_' + Date.now();
  const idx = db.templates.findIndex((t: any) => t.id === template.id);
  if (idx >= 0) db.templates[idx] = { ...db.templates[idx], ...template };
  else db.templates.push(template);
  saveOfflineDb(db);
  return template as MessageTemplate;
}

export async function apiDeleteTemplate(id: string) {
  try {
    await apiRequest(`/api/templates/${id}`, { method: 'DELETE' });
    return;
  } catch (e) { throw e; }
  const db = getOfflineDb();
  db.templates = db.templates.filter((t: any) => t.id !== id);
  saveOfflineDb(db);
}

export async function apiGenerateTokens(count = 1, days = 30): Promise<SubscriptionToken[]> {
  try {
    const res = await apiRequest('/api/tokens/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, days }),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      return data.tokens || [];
    }
  } catch (e) {}

  const db = getOfflineDb();
  const newTokens: SubscriptionToken[] = [];
  for (let i = 0; i < count; i++) {
    const code = `STRM-${days}D-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const token: SubscriptionToken = {
      id: 'tok_' + Date.now() + '_' + i,
      code,
      days,
      isUsed: false,
      createdAt: new Date().toISOString(),
    };
    newTokens.push(token);
    db.tokens.push(token);
  }
  saveOfflineDb(db);
  return newTokens;
}

export async function apiRestoreBackup(jsonData: any) {
  try {
    const res = await apiRequest('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonData),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e: any) { return { success: false, error: e?.message || 'No se pudo restaurar el respaldo en el servidor.' }; }
  return { success: false, error: 'El servidor seguro no devolvió una respuesta válida.' };
}

export async function apiSaveSettings(settings: { userId: string; currency?: string; currencySymbol?: string; theme?: string }) {
  try {
    const res = await apiRequest('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {}

  const db = getOfflineDb();
  db.settings = { ...db.settings, ...settings };
  saveOfflineDb(db);
  return { success: true, settings: db.settings };
}

export async function apiSaveCustomService(service: { userId: string; name: string; color?: string; badgeBg?: string; textColor?: string; iconName?: string; defaultProfiles?: number; category?: 'streaming' | 'tv_digital' | 'other' }) {
  try {
    const res = await apiRequest('/api/custom-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {}

  const db = getOfflineDb();
  if (!db.customServices) db.customServices = [];
  const newService = { id: 'srv_' + Date.now(), ...service };
  db.customServices.push(newService);
  saveOfflineDb(db);
  return newService;
}

export async function apiDeleteCustomService(id: string) {
  try {
    const res = await apiRequest(`/api/custom-services/${id}`, { method: 'DELETE' });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {}

  const db = getOfflineDb();
  if (db.customServices) {
    db.customServices = db.customServices.filter((s: any) => s.id !== id);
    saveOfflineDb(db);
  }
  return { success: true };
}


