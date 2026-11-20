import { Account, Customer, MessageTemplate, Provider, Sale, SubscriptionToken, User } from '../types';

const STREAM_API_BASE = String(import.meta.env.VITE_STREAM_API_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'stream_flow_session';
export const apiRemoteConfigured = Boolean(STREAM_API_BASE);

export async function clearApiSession() {
  try { if (apiRemoteConfigured) await apiRequest('/api/auth/logout', { method: 'POST' }); } catch {}
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
}

export async function apiRequest(input: RequestInfo | URL, init: RequestInit = {}) {
  const path = typeof input === 'string' ? input : input.toString();
  const headers = new Headers(init.headers || {});
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null;
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
  if (token && typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY, token);
  if (data?.user?.sessionToken) delete data.user.sessionToken;
  return data;
}

// Helper for offline DB fallback when hosted on static platforms like GitHub Pages
function getOfflineDb() {
  if (apiRemoteConfigured) throw new Error('El servidor seguro no está disponible; no se guardaron cambios localmente.');
  const raw = localStorage.getItem('stream_control_offline_db');
  if (raw) {
    try { return JSON.parse(raw); } catch { /* rebuild an empty local store */ }
  }
  const emptyDb = { users: [], providers: [], accounts: [], customers: [], sales: [], templates: [], tokens: [],
    settings: { currency: 'USD', currencySymbol: '$', theme: 'theme-dark-red' }, customServices: [] };
  localStorage.setItem('stream_control_offline_db', JSON.stringify(emptyDb));
  return emptyDb;
}

function saveOfflineDb(db: any) {
  if (apiRemoteConfigured) return;
  localStorage.setItem('stream_control_offline_db', JSON.stringify(db));
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
      console.warn('API login error, falling back to local database:', err.message);
    if (apiRemoteConfigured) return { success: false, error: err?.message || 'No se pudo conectar con el servidor seguro.' } as any;
    }
  }

  // Fallback for static hosting (GitHub Pages)
  const cleanEmail = (email || '').toLowerCase().trim();
  const db = getOfflineDb();
  let user = db.users.find((u: any) => u.email.toLowerCase() === cleanEmail);

  if (cleanEmail === 'florenciaamor36@gmail.com') {
    if (!user) {
      user = {
        id: 'user_admin_01',
        email: 'florenciaamor36@gmail.com',
        password: password || 'Selexionar1',
        name: 'Florencia Amor (Admin)',
        createdAt: new Date().toISOString(),
        subscriptionUntil: '2030-01-01T00:00:00.000Z',
        tokensRedeemed: 99,
        isAdmin: true,
        hasAcceptedTerms: true,
      };
      db.users.push(user);
      saveOfflineDb(db);
    } else {
      user.isAdmin = true;
      user.password = password || user.password;
      saveOfflineDb(db);
    }
    return { success: true, user };
  }

  if (!user) {
    return { success: false, error: 'El correo electrónico no se encuentra registrado.' };
  }

  if (password && user.password && user.password !== password) {
    return { success: false, error: 'Contraseña incorrecta.' };
  }

  return { success: true, user };
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
    console.warn('API register error, falling back to local DB:', err);
    if (apiRemoteConfigured) return { success: false, error: err?.message || 'No se pudo conectar con el servidor seguro.' } as any;
  }

  // Fallback for static host
  const cleanEmail = (email || '').toLowerCase().trim();
  const db = getOfflineDb();

  if (db.users.some((u: any) => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: 'Este correo electrónico ya está registrado.' };
  }

  const now = new Date();
  const subDate = new Date();
  subDate.setDate(now.getDate() + 30);

  const newUser: User = {
    id: 'user_' + Date.now(),
    email: cleanEmail,
    password: password || '',
    name: name || cleanEmail.split('@')[0],
    createdAt: now.toISOString(),
    gracePeriodUntil: subDate.toISOString(),
    subscriptionUntil: subDate.toISOString(),
    tokensRedeemed: 0,
    isAdmin: cleanEmail === 'florenciaamor36@gmail.com',
    hasAcceptedTerms: false,
  };

  db.users.push(newUser);
  saveOfflineDb(db);
  return { success: true, user: newUser };
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
    console.warn('API redeem token fallback:', err);
    if (apiRemoteConfigured) return { success: false, error: err?.message || 'No se pudo conectar con el servidor seguro.' } as any;
  }

  // Local fallback
  const db = getOfflineDb();
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  const currentSub = new Date(user.subscriptionUntil || new Date());
  const newSub = new Date(currentSub.getTime() > Date.now() ? currentSub.getTime() : Date.now());
  newSub.setDate(newSub.getDate() + 30);
  user.subscriptionUntil = newSub.toISOString();
  user.tokensRedeemed = (user.tokensRedeemed || 0) + 1;

  saveOfflineDb(db);
  return { success: true, message: '¡Token canjeado exitosamente con 30 días adicionales!', user };
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
    console.warn('API accept terms fallback:', err);
    if (apiRemoteConfigured) return { success: false, error: err?.message || 'No se pudo conectar con el servidor seguro.' } as any;
  }

  const db = getOfflineDb();
  const user = db.users.find((u: any) => u.id === userId);
  if (user) {
    user.hasAcceptedTerms = true;
    user.acceptedTermsAt = new Date().toISOString();
    saveOfflineDb(db);
    return { success: true, user };
  }
  return { success: false, error: 'Usuario no encontrado' };
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
    console.warn('API not available, loading from local storage fallback:', err);
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
  } catch (e) {}
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
  } catch (e) {}
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
  } catch (e) {}
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
  } catch (e) {}
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
  } catch (e) {}
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
  } catch (e) {}

  saveOfflineDb(jsonData);
  return { success: true, message: 'Base de datos restaurada localmente.' };
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

export async function apiSaveCustomService(service: { userId: string; name: string; color?: string; badgeBg?: string; textColor?: string; iconName?: string; defaultProfiles?: number }) {
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


