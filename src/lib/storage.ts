import { Account, Customer, MessageTemplate, Provider, Sale, SubscriptionToken, User } from '../types';

// Helper for offline DB fallback when hosted on static platforms like GitHub Pages
function getOfflineDb() {
  const raw = localStorage.getItem('stream_control_offline_db');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      // parse error
    }
  }

  const now = new Date();
  const subDate = new Date();
  subDate.setDate(now.getDate() + 365);

  const defaultDb = {
    users: [
      {
        id: 'user_admin_01',
        email: 'florenciaamor36@gmail.com',
        password: 'Selexionar1',
        name: 'Florencia Amor (Admin)',
        createdAt: now.toISOString(),
        gracePeriodUntil: subDate.toISOString(),
        subscriptionUntil: subDate.toISOString(),
        tokensRedeemed: 99,
        isAdmin: true,
        hasAcceptedTerms: true,
      },
    ],
    providers: [],
    accounts: [],
    customers: [],
    sales: [],
    templates: [
      {
        id: 'tmpl_welcome',
        userId: 'user_admin_01',
        name: 'Entrega de Credenciales (Bienvenida)',
        type: 'welcome_credentials',
        isDefault: true,
        body: '🍿 *¡Hola {cliente}! Aquí están los accesos a tu pantalla de {servicio}* 🍿\n\n📧 *Correo:* {email_cuenta}\n🔑 *Clave:* {password}\n👤 *Perfil:* {perfil}\n📌 *PIN:* {pin}\n📅 *Fecha de Vencimiento:* {fecha_vencimiento}\n\n⚠️ *Reglas importantes:*\n1. No modifiques la contraseña ni el correo de la cuenta.\n2. Ingresa únicamente al perfil asignado ({perfil}) con tu PIN ({pin}).\n3. Disfruta tu contenido sin límites. ¡Gracias por tu compra!',
      },
    ],
    tokens: [],
    settings: {
      userId: 'user_admin_01',
      currency: 'USD',
      currencySymbol: '$',
      theme: 'theme-dark-red',
    },
    customServices: [],
  };

  localStorage.setItem('stream_control_offline_db', JSON.stringify(defaultDb));
  return defaultDb;
}

function saveOfflineDb(db: any) {
  localStorage.setItem('stream_control_offline_db', JSON.stringify(db));
}

export async function apiLogin(email: string, password?: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      return data;
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('Unexpected token')) {
      console.warn('API login error, falling back to local database:', err.message);
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
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar usuario');
      return data;
    }
  } catch (err: any) {
    console.warn('API register error, falling back to local DB:', err);
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
    const res = await fetch('/api/auth/redeem-token', {
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
    const res = await fetch('/api/auth/accept-terms', {
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
    const res = await fetch(url);
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
    const res = await fetch('/api/auth/update-credentials', {
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
    const res = await fetch(url, {
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
    await fetch(`/api/providers/${id}`, { method: 'DELETE' });
  } catch (e) {}
  const db = getOfflineDb();
  db.providers = db.providers.filter((p: any) => p.id !== id);
  saveOfflineDb(db);
}

export async function apiSaveAccount(account: Partial<Account>): Promise<Account> {
  try {
    const method = account.id ? 'PUT' : 'POST';
    const url = account.id ? `/api/accounts/${account.id}` : '/api/accounts';
    const res = await fetch(url, {
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
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
  } catch (e) {}
  const db = getOfflineDb();
  db.accounts = db.accounts.filter((a: any) => a.id !== id);
  saveOfflineDb(db);
}

export async function apiSaveCustomer(customer: Partial<Customer>): Promise<Customer> {
  try {
    const method = customer.id ? 'PUT' : 'POST';
    const url = customer.id ? `/api/customers/${customer.id}` : '/api/customers';
    const res = await fetch(url, {
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
    await fetch(`/api/customers/${id}`, { method: 'DELETE' });
  } catch (e) {}
  const db = getOfflineDb();
  db.customers = db.customers.filter((c: any) => c.id !== id);
  saveOfflineDb(db);
}

export async function apiSaveSale(sale: Partial<Sale>): Promise<Sale> {
  try {
    const method = sale.id ? 'PUT' : 'POST';
    const url = sale.id ? `/api/sales/${sale.id}` : '/api/sales';
    const res = await fetch(url, {
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
    const res = await fetch(`/api/sales/${saleId}/renew`, {
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
    await fetch(`/api/sales/${id}`, { method: 'DELETE' });
  } catch (e) {}
  const db = getOfflineDb();
  db.sales = db.sales.filter((s: any) => s.id !== id);
  saveOfflineDb(db);
}

export async function apiSaveTemplate(template: Partial<MessageTemplate>): Promise<MessageTemplate> {
  try {
    const method = template.id ? 'PUT' : 'POST';
    const url = template.id ? `/api/templates/${template.id}` : '/api/templates';
    const res = await fetch(url, {
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
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  } catch (e) {}
  const db = getOfflineDb();
  db.templates = db.templates.filter((t: any) => t.id !== id);
  saveOfflineDb(db);
}

export async function apiGenerateTokens(count = 1, days = 30): Promise<SubscriptionToken[]> {
  try {
    const res = await fetch('/api/tokens/generate', {
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
    const res = await fetch('/api/backup/restore', {
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
    const res = await fetch('/api/settings', {
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
    const res = await fetch('/api/custom-services', {
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
    const res = await fetch(`/api/custom-services/${id}`, { method: 'DELETE' });
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

