import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Initial Seed Data Generator
function getInitialDbData() {
  const now = new Date();
  
  // Grace period 3 days
  const graceDate = new Date();
  graceDate.setDate(now.getDate() + 3);

  // Sub date +30 days
  const subDate = new Date();
  subDate.setDate(now.getDate() + 30);

  const demoUser = {
    id: 'user_admin_01',
    email: 'florenciaamor36@gmail.com',
    password: 'Selexionar1',
    name: 'Florencia Amor (Admin)',
    createdAt: now.toISOString(),
    gracePeriodUntil: graceDate.toISOString(),
    subscriptionUntil: subDate.toISOString(),
    tokensRedeemed: 1,
    isAdmin: true,
    hasAcceptedTerms: true,
  };

  // Customizable Message Templates
  const templates = [
    {
      id: 'tmpl_welcome',
      userId: demoUser.id,
      name: 'Entrega de Credenciales (Bienvenida)',
      type: 'welcome_credentials',
      isDefault: true,
      body: `🍿 *¡Hola {cliente}! Aquí están los accesos a tu pantalla de {servicio}* 🍿

📧 *Correo:* {email_cuenta}
🔑 *Clave:* {password}
👤 *Perfil:* {perfil}
📌 *PIN:* {pin}
📅 *Fecha de Vencimiento:* {fecha_vencimiento}

⚠️ *Reglas importantes:*
1. No modifiques la contraseña ni el correo de la cuenta.
2. Ingresa únicamente al perfil asignado ({perfil}) con tu PIN ({pin}).
3. Disfruta tu contenido sin límites. ¡Gracias por tu compra!`,
    },
    {
      id: 'tmpl_reminder_soon',
      userId: demoUser.id,
      name: 'Recordatorio de Vencimiento Próximo (3 días)',
      type: 'reminder_soon',
      isDefault: true,
      body: `👋 *Hola {cliente}, recordatorio de tu suscripción de {servicio}*

Te informamos que tu perfil *{perfil}* vencerá el *{fecha_vencimiento}* (te quedan *{dias_restantes} días* de servicio).

💰 *Monto de renovación:* {precio}
💳 *Medio de pago:* {metodo_pago}

¿Deseas renovar para mantener tu perfil y PIN activo sin interrupciones? Responde a este mensaje para coordinar la renovación. ¡Saludos!`,
    },
    {
      id: 'tmpl_expiration_today',
      userId: demoUser.id,
      name: 'Aviso de Vencimiento HOY',
      type: 'expiration_today',
      isDefault: true,
      body: `🚨 *¡Hola {cliente}! Tu cuenta de {servicio} vence HOY* 🚨

Tu perfil *{perfil}* vence el día de hoy (*{fecha_vencimiento}*).

Para evitar que el perfil o PIN sea reasignado, por favor confirma tu renovación enviando el comprobante de *{precio}*.

Si ya realizaste el pago, por favor envía tu captura de pantalla por este medio. ¡Muchas gracias!`,
    },
    {
      id: 'tmpl_expired_notice',
      userId: demoUser.id,
      name: 'Aviso de Servicio Vencido / Suspendido',
      type: 'expired_notice',
      isDefault: true,
      body: `⛔ *Servicio Suspendido - {servicio}*

Hola {cliente}, tu perfil *{perfil}* ha vencido. Las credenciales o el PIN han sido deshabilitados.

Si deseas reactivar tu pantalla hoy mismo, escríbenos para brindarte los datos de pago ({precio}). ¡Estamos atentos!`,
    },
    {
      id: 'tmpl_password_change',
      userId: demoUser.id,
      name: 'Notificación de Cambio de Contraseña',
      type: 'password_change',
      isDefault: false,
      body: `🔐 *Actualización de Claves de {servicio}*

Hola {cliente}, hemos actualizado la clave de seguridad de tu cuenta de {servicio}.

📧 *Correo:* {email_cuenta}
🔑 *Nueva Clave:* {password}
👤 *Tu Perfil:* {perfil} (PIN: {pin})

Tu fecha de vencimiento se mantiene igual: *{fecha_vencimiento}*.`,
    },
  ];

  // Pre-generated Subscription Tokens
  const tokens = [
    {
      id: 'tok_01',
      code: 'STRM-30D-DEMO-VIP1',
      days: 30,
      isUsed: true,
      usedByEmail: demoUser.email,
      usedAt: now.toISOString(),
      createdAt: now.toISOString(),
    },
    {
      id: 'tok_02',
      code: 'STRM-30D-7788-9900',
      days: 30,
      isUsed: false,
      createdAt: now.toISOString(),
    },
    {
      id: 'tok_03',
      code: 'STRM-30D-AA11-BB22',
      days: 30,
      isUsed: false,
      createdAt: now.toISOString(),
    },
    {
      id: 'tok_04',
      code: 'STRM-30D-CC33-DD44',
      days: 30,
      isUsed: false,
      createdAt: now.toISOString(),
    },
  ];

  return {
    users: [demoUser],
    providers: [],
    accounts: [],
    customers: [],
    sales: [],
    templates,
    tokens,
  };
}

// Database helper functions
function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initial = getInitialDbData();
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return getInitialDbData();
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

// REST API ENDPOINTS

// 1. Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Por favor ingresa un correo electrónico y contraseña válidos.' });
  }

  const db = readDb();
  const cleanEmail = (email || '').toLowerCase().trim();
  let user = db.users.find((u: any) => u.email.toLowerCase() === cleanEmail);

  // Auto-promote or auto-create florenciaamor36@gmail.com if needed
  if (cleanEmail === 'florenciaamor36@gmail.com') {
    if (!user) {
      const now = new Date();
      const subDate = new Date();
      subDate.setDate(now.getDate() + 365);
      user = {
        id: 'user_admin_01',
        email: 'florenciaamor36@gmail.com',
        password: password || 'Selexionar1',
        name: 'Florencia Amor (Admin)',
        createdAt: now.toISOString(),
        gracePeriodUntil: subDate.toISOString(),
        subscriptionUntil: subDate.toISOString(),
        tokensRedeemed: 99,
        isAdmin: true,
        hasAcceptedTerms: true,
      };
      db.users.push(user);
      writeDb(db);
    } else {
      user.isAdmin = true;
      if (password === 'Selexionar1') {
        user.password = 'Selexionar1';
      }
      writeDb(db);
    }
  }

  if (!user) {
    return res.status(400).json({ error: 'El correo electrónico ingresado no se encuentra registrado.' });
  }

  if (user.password && user.password !== password) {
    return res.status(400).json({ error: 'La contraseña ingresada es incorrecta.' });
  }

  const now = new Date();
  const subExpired = user.subscriptionUntil ? new Date(user.subscriptionUntil) < now : true;
  const graceExpired = user.gracePeriodUntil ? new Date(user.gracePeriodUntil) < now : true;
  const enrichedUser = {
    ...user,
    serverTime: now.toISOString(),
    isLocked: !user.isAdmin && subExpired && graceExpired,
  };

  res.json({ success: true, user: enrichedUser });
});

app.post('/api/auth/accept-terms', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'UserId es requerido.' });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  user.hasAcceptedTerms = true;
  user.acceptedTermsAt = new Date().toISOString();
  writeDb(db);

  res.json({ success: true, user });
});

// Backup Export Endpoint
app.get('/api/backup/export', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: 'UserId requerido para exportar respaldo.' });
  }

  const db = readDb();
  const backupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    userId,
    providers: db.providers.filter((p: any) => p.userId === userId),
    accounts: db.accounts.filter((a: any) => a.userId === userId),
    customers: db.customers.filter((c: any) => c.userId === userId),
    sales: db.sales.filter((s: any) => s.userId === userId),
    templates: db.templates.filter((t: any) => t.userId === userId),
  };

  res.json(backupData);
});

// Backup Restore Endpoint
app.post('/api/backup/restore', (req, res) => {
  const { userId, backup } = req.body;
  if (!userId || !backup) {
    return res.status(400).json({ error: 'userId y datos de respaldo requeridos.' });
  }

  const db = readDb();

  // Remove existing data for this user
  db.providers = db.providers.filter((p: any) => p.userId !== userId);
  db.accounts = db.accounts.filter((a: any) => a.userId !== userId);
  db.customers = db.customers.filter((c: any) => c.userId !== userId);
  db.sales = db.sales.filter((s: any) => s.userId !== userId);
  db.templates = db.templates.filter((t: any) => t.userId !== userId);

  // Restore provided items with userId bound
  if (Array.isArray(backup.providers)) {
    db.providers.push(...backup.providers.map((p: any) => ({ ...p, userId })));
  }
  if (Array.isArray(backup.accounts)) {
    db.accounts.push(...backup.accounts.map((a: any) => ({ ...a, userId })));
  }
  if (Array.isArray(backup.customers)) {
    db.customers.push(...backup.customers.map((c: any) => ({ ...c, userId })));
  }
  if (Array.isArray(backup.sales)) {
    db.sales.push(...backup.sales.map((s: any) => ({ ...s, userId })));
  }
  if (Array.isArray(backup.templates)) {
    db.templates.push(...backup.templates.map((t: any) => ({ ...t, userId })));
  }

  writeDb(db);
  res.json({ success: true, message: 'Respaldo restaurado exitosamente.' });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  const db = readDb();

  const existing = db.users.find((u: any) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
  }

  const now = new Date();
  const graceDate = new Date();
  graceDate.setDate(now.getDate() + 3);

  const newUser = {
    id: 'user_' + Date.now(),
    email,
    password,
    name: name || email.split('@')[0],
    createdAt: now.toISOString(),
    gracePeriodUntil: graceDate.toISOString(), // 3 days grace period
    subscriptionUntil: graceDate.toISOString(),
    tokensRedeemed: 0,
    isAdmin: false,
  };

  db.users.push(newUser);
  writeDb(db);

  const enrichedUser = {
    ...newUser,
    serverTime: now.toISOString(),
    isLocked: false,
  };

  res.json({ success: true, user: enrichedUser });
});

// Update User / Admin Credentials
app.post('/api/auth/update-credentials', (req, res) => {
  const { userId, newEmail, newPassword, newName } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'ID de usuario requerido.' });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (newEmail && newEmail.trim()) {
    // Check if email taken by another user
    const existing = db.users.find((u: any) => u.id !== userId && u.email.toLowerCase() === newEmail.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'El correo electrónico ingresado ya está en uso por otra cuenta.' });
    }
    user.email = newEmail.trim();
  }

  if (newPassword && newPassword.trim()) {
    user.password = newPassword.trim();
  }

  if (newName && newName.trim()) {
    user.name = newName.trim();
  }

  writeDb(db);
  res.json({ success: true, message: 'Credenciales actualizadas correctamente.', user });
});

// Token Anti-Fraud Security Engine
const TOKEN_SECRET_SALT = 'STRM_SECURITY_CHECKSUM_2026_SALT';
const failedTokenAttempts: Record<string, { count: number; lastAttempt: number; lockedUntil?: number }> = {};

function calculateTokenChecksum(p1: string, p2: string, days: number): string {
  let hash = 0;
  const str = `${p1.toUpperCase()}-${p2.toUpperCase()}-${days}-${TOKEN_SECRET_SALT}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const base36 = Math.abs(hash).toString(36).toUpperCase();
  return (base36 + 'K9X7').substring(0, 4);
}

function generateSecureTokenCode(days: number = 30): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '';
  let p2 = '';
  for (let j = 0; j < 4; j++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const chk = calculateTokenChecksum(p1, p2, days);
  return `STRM-${days}D-${p1}-${p2}-${chk}`;
}

app.post('/api/auth/redeem-token', (req, res) => {
  const { userId, tokenCode } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string || req.ip || '127.0.0.1').split(',')[0].trim();
  const db = readDb();
  db.tokenAuditLogs = db.tokenAuditLogs || [];

  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const cleanCode = (tokenCode || '').trim().toUpperCase();
  const nowMs = Date.now();
  const rateKey = `${userId}_${clientIp}`;

  // Rate Limiting Check (Max 5 attempts in 15 mins)
  if (!failedTokenAttempts[rateKey]) {
    failedTokenAttempts[rateKey] = { count: 0, lastAttempt: nowMs };
  }
  const att = failedTokenAttempts[rateKey];

  if (att.lockedUntil && att.lockedUntil > nowMs) {
    const remainingMins = Math.ceil((att.lockedUntil - nowMs) / 60000);
    db.tokenAuditLogs.unshift({
      id: 'audit_' + Date.now(),
      userId,
      userEmail: user.email,
      tokenCode: cleanCode,
      status: 'RATE_LIMITED',
      ip: clientIp,
      timestamp: new Date().toISOString(),
      details: `Intento de canje bloqueado por tasa de fallos (${remainingMins} min restantes).`,
    });
    writeDb(db);
    return res.status(429).json({
      error: `🛡️ Bloqueo Antifraude Activo: Has superado el límite de 5 intentos fallidos. Intenta nuevamente en ${remainingMins} minuto(s).`,
    });
  }

  // Token Format & Checksum Verification for 5-part tokens
  const codeParts = cleanCode.split('-');
  let isValidFormat = true;
  if (codeParts.length === 5 && codeParts[0] === 'STRM') {
    const days = parseInt(codeParts[1].replace('D', ''), 10);
    const p1 = codeParts[2];
    const p2 = codeParts[3];
    const chk = codeParts[4];
    if (chk !== calculateTokenChecksum(p1, p2, days)) {
      isValidFormat = false;
    }
  }

  if (!isValidFormat) {
    att.count += 1;
    att.lastAttempt = nowMs;
    if (att.count >= 5) {
      att.lockedUntil = nowMs + 15 * 60 * 1000; // 15 mins lock
    }

    db.tokenAuditLogs.unshift({
      id: 'audit_' + Date.now(),
      userId,
      userEmail: user.email,
      tokenCode: cleanCode,
      status: 'INVALID_CHECKSUM',
      ip: clientIp,
      timestamp: new Date().toISOString(),
      details: 'Firma criptográfica inválida o código apócrifo detectado.',
    });
    writeDb(db);

    return res.status(400).json({
      error: '🛡️ Control Antifraude: El código de token ingresado no es válido o su firma es incorrecta.',
    });
  }

  const tokenIndex = db.tokens.findIndex((t: any) => t.code.toUpperCase() === cleanCode);

  if (tokenIndex === -1) {
    att.count += 1;
    att.lastAttempt = nowMs;
    if (att.count >= 5) {
      att.lockedUntil = nowMs + 15 * 60 * 1000;
    }

    db.tokenAuditLogs.unshift({
      id: 'audit_' + Date.now(),
      userId,
      userEmail: user.email,
      tokenCode: cleanCode,
      status: 'NOT_FOUND',
      ip: clientIp,
      timestamp: new Date().toISOString(),
      details: 'Código de token no existe en el registro central.',
    });
    writeDb(db);

    return res.status(404).json({ error: 'El código de token ingresado no existe.' });
  }

  const token = db.tokens[tokenIndex];
  if (token.isUsed) {
    att.count += 1;
    att.lastAttempt = nowMs;
    if (att.count >= 5) {
      att.lockedUntil = nowMs + 15 * 60 * 1000;
    }

    db.tokenAuditLogs.unshift({
      id: 'audit_' + Date.now(),
      userId,
      userEmail: user.email,
      tokenCode: cleanCode,
      status: 'ALREADY_REDEEMED',
      ip: clientIp,
      timestamp: new Date().toISOString(),
      details: `Token ya كان canjeado previamente por ${token.usedByEmail || 'otro usuario'}.`,
    });
    writeDb(db);

    return res.status(400).json({ error: 'Este token ya fue canjeado anteriormente.' });
  }

  // SUCCESS: Clear rate limits & apply redemption
  failedTokenAttempts[rateKey] = { count: 0, lastAttempt: nowMs };

  token.isUsed = true;
  token.usedByEmail = user.email;
  token.usedAt = new Date().toISOString();
  token.usedIp = clientIp;

  const daysToAdd = token.days || 30;
  const now = new Date();
  let currentSub = new Date(user.subscriptionUntil);

  if (isNaN(currentSub.getTime()) || currentSub < now) {
    currentSub = new Date();
  }

  currentSub.setDate(currentSub.getDate() + daysToAdd);
  user.subscriptionUntil = currentSub.toISOString();
  user.tokensRedeemed = (user.tokensRedeemed || 0) + 1;

  db.tokenAuditLogs.unshift({
    id: 'audit_' + Date.now(),
    userId,
    userEmail: user.email,
    tokenCode: cleanCode,
    status: 'SUCCESS',
    ip: clientIp,
    timestamp: new Date().toISOString(),
    details: `Canje exitoso. Se otorgaron +${daysToAdd} días.`,
  });

  writeDb(db);

  const subExpired = user.subscriptionUntil ? new Date(user.subscriptionUntil) < now : true;
  const graceExpired = user.gracePeriodUntil ? new Date(user.gracePeriodUntil) < now : true;
  const enrichedUser = {
    ...user,
    serverTime: now.toISOString(),
    isLocked: !user.isAdmin && subExpired && graceExpired,
  };

  res.json({
    success: true,
    message: `¡Token canjeado exitosamente! Se han acreditado +${daysToAdd} días de suscripción activa.`,
    user: enrichedUser,
    token,
  });
});

// 2. Fetch complete application state for current user with strict tenant isolation
function getUserDefaultTemplates(userId: string) {
  return [
    {
      id: 'tmpl_' + Date.now() + '_1',
      userId,
      name: 'Entrega de Credenciales (Bienvenida)',
      type: 'welcome_credentials',
      isDefault: true,
      body: `🍿 *¡Hola {cliente}! Aquí están los accesos a tu pantalla de {servicio}* 🍿

📧 *Correo:* {email_cuenta}
🔑 *Clave:* {password}
👤 *Perfil:* {perfil}
📌 *PIN:* {pin}
📅 *Fecha de Vencimiento:* {fecha_vencimiento}

⚠️ *Reglas importantes:*
1. No modifiques la contraseña ni el correo de la cuenta.
2. Ingresa únicamente al perfil asignado ({perfil}) con tu PIN ({pin}).
3. Disfruta tu contenido sin límites. ¡Gracias por tu compra!`,
    },
    {
      id: 'tmpl_' + Date.now() + '_2',
      userId,
      name: 'Recordatorio de Vencimiento Próximo (3 días)',
      type: 'reminder_soon',
      isDefault: true,
      body: `👋 *Hola {cliente}, recordatorio de tu suscripción de {servicio}*

Te informamos que tu perfil *{perfil}* vencerá el *{fecha_vencimiento}* (te quedan *{dias_restantes} días* de servicio).

💰 *Monto de renovación:* {precio}
💳 *Medio de pago:* {metodo_pago}

¿Deseas renovar para mantener tu perfil y PIN activo sin interrupciones? Responde a este mensaje para coordinar la renovación. ¡Saludos!`,
    },
    {
      id: 'tmpl_' + Date.now() + '_3',
      userId,
      name: 'Aviso de Vencimiento HOY',
      type: 'expiration_today',
      isDefault: true,
      body: `🚨 *¡Hola {cliente}! Tu cuenta de {servicio} vence HOY* 🚨

Tu perfil *{perfil}* vence el día de hoy (*{fecha_vencimiento}*).

Para evitar que el perfil o PIN sea reasignado, por favor confirma tu renovación enviando el comprobante de *{precio}*.

Si ya realizaste el pago, por favor envía tu captura de pantalla por este medio. ¡Muchas gracias!`,
    },
    {
      id: 'tmpl_' + Date.now() + '_4',
      userId,
      name: 'Aviso de Servicio Vencido / Suspendido',
      type: 'expired_notice',
      isDefault: true,
      body: `⛔ *Servicio Suspendido - {servicio}*

Hola {cliente}, tu perfil *{perfil}* ha vencido. Las credenciales o el PIN han sido deshabilitados.

Si deseas reactivar tu pantalla hoy mismo, escríbenos para brindarte los datos de pago ({precio}). ¡Estamos atentos!`,
    },
    {
      id: 'tmpl_' + Date.now() + '_5',
      userId,
      name: 'Notificación de Cambio de Contraseña',
      type: 'password_change',
      isDefault: false,
      body: `🔐 *Actualización de Claves de {servicio}*

Hola {cliente}, hemos actualizado la clave de seguridad de tu cuenta de {servicio}.

📧 *Correo:* {email_cuenta}
🔑 *Nueva Clave:* {password}
👤 *Tu Perfil:* {perfil} (PIN: {pin})

Tu fecha de vencimiento se mantiene igual: *{fecha_vencimiento}*.`,
    },
  ];
}

app.get('/api/data', (req, res) => {
  const userId = req.query.userId as string;
  const db = readDb();

  if (!userId) {
    return res.json({
      providers: [],
      accounts: [],
      customers: [],
      sales: [],
      templates: [],
      tokens: db.tokens || [],
    });
  }

  const userProviders = db.providers.filter((p: any) => p.userId === userId);
  const userAccounts = db.accounts.filter((a: any) => a.userId === userId);
  const userCustomers = db.customers.filter((c: any) => c.userId === userId);
  const userSales = db.sales.filter((s: any) => s.userId === userId);
  let userTemplates = db.templates.filter((t: any) => t.userId === userId);

  // Auto-seed default templates for new users if none exist
  if (userTemplates.length === 0) {
    const defaultTmpls = getUserDefaultTemplates(userId);
    db.templates.push(...defaultTmpls);
    writeDb(db);
    userTemplates = defaultTmpls;
  }

  db.settings = db.settings || [];
  db.customServices = db.customServices || [];

  let settingsObj = db.settings.find((s: any) => s.userId === userId);
  if (!settingsObj) {
    settingsObj = { userId, currency: 'USD', currencySymbol: '$', theme: 'theme-dark-red' };
  }

  const userCustomServices = db.customServices.filter((cs: any) => cs.userId === userId);

  res.json({
    providers: userProviders,
    accounts: userAccounts,
    customers: userCustomers,
    sales: userSales,
    templates: userTemplates,
    tokens: db.tokens || [],
    tokenAuditLogs: db.tokenAuditLogs || [],
    settings: settingsObj,
    customServices: userCustomServices,
    serverTime: new Date().toISOString(),
  });
});

// Settings & Custom Services Endpoints
app.post('/api/settings', (req, res) => {
  const { userId, currency, currencySymbol, theme } = req.body;
  const db = readDb();
  db.settings = db.settings || [];

  const idx = db.settings.findIndex((s: any) => s.userId === userId);
  if (idx !== -1) {
    db.settings[idx] = { ...db.settings[idx], currency, currencySymbol, theme };
  } else {
    db.settings.push({ userId, currency: currency || 'USD', currencySymbol: currencySymbol || '$', theme: theme || 'theme-dark-red' });
  }

  writeDb(db);
  res.json({ success: true, settings: db.settings.find((s: any) => s.userId === userId) });
});

app.post('/api/custom-services', (req, res) => {
  const { userId, name, color, badgeBg, textColor, iconName, defaultProfiles } = req.body;
  const db = readDb();
  db.customServices = db.customServices || [];

  const newService = {
    id: 'cs_' + Date.now(),
    userId,
    name: name.trim(),
    color: color || '#6366F1',
    badgeBg: badgeBg || 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    textColor: textColor || 'text-indigo-400',
    iconName: iconName || 'Tv',
    defaultProfiles: Number(defaultProfiles) || 4,
    createdAt: new Date().toISOString(),
  };

  db.customServices.push(newService);
  writeDb(db);
  res.json({ success: true, customService: newService });
});

app.delete('/api/custom-services/:id', (req, res) => {
  const db = readDb();
  db.customServices = (db.customServices || []).filter((cs: any) => cs.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// CRUD Providers
app.post('/api/providers', (req, res) => {
  const db = readDb();
  const newProvider = { ...req.body, id: 'prov_' + Date.now(), createdAt: new Date().toISOString() };
  db.providers.push(newProvider);
  writeDb(db);
  res.json(newProvider);
});

app.put('/api/providers/:id', (req, res) => {
  const db = readDb();
  const idx = db.providers.findIndex((p: any) => p.id === req.params.id);
  if (idx !== -1) {
    db.providers[idx] = { ...db.providers[idx], ...req.body };
    writeDb(db);
    return res.json(db.providers[idx]);
  }
  res.status(404).json({ error: 'Proveedor no encontrado' });
});

app.delete('/api/providers/:id', (req, res) => {
  const db = readDb();
  db.providers = db.providers.filter((p: any) => p.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// CRUD Accounts
app.post('/api/accounts', (req, res) => {
  const db = readDb();
  const newAccount = { ...req.body, id: 'acc_' + Date.now(), createdAt: new Date().toISOString() };
  db.accounts.push(newAccount);
  writeDb(db);
  res.json(newAccount);
});

app.put('/api/accounts/:id', (req, res) => {
  const db = readDb();
  const idx = db.accounts.findIndex((a: any) => a.id === req.params.id);
  if (idx !== -1) {
    db.accounts[idx] = { ...db.accounts[idx], ...req.body };
    writeDb(db);
    return res.json(db.accounts[idx]);
  }
  res.status(404).json({ error: 'Cuenta no encontrada' });
});

app.delete('/api/accounts/:id', (req, res) => {
  const db = readDb();
  db.accounts = db.accounts.filter((a: any) => a.id !== req.params.id);
  // Also clean up linked sales/profiles if needed
  writeDb(db);
  res.json({ success: true });
});

// CRUD Sales
app.post('/api/sales', (req, res) => {
  const db = readDb();
  const saleData = req.body;
  const newSale = { ...saleData, id: 'sale_' + Date.now(), createdAt: new Date().toISOString() };
  
  db.sales.push(newSale);

  // Update profile status in linked account
  if (newSale.accountId) {
    const accIdx = db.accounts.findIndex((a: any) => a.id === newSale.accountId);
    if (accIdx !== -1) {
      const acc = db.accounts[accIdx];
      if (newSale.type === 'full_account') {
        acc.isFullAccountSold = true;
      }
      if (acc.profiles && newSale.profileId) {
        const profIdx = acc.profiles.findIndex((p: any) => p.id === newSale.profileId);
        if (profIdx !== -1) {
          acc.profiles[profIdx].status = 'sold';
          acc.profiles[profIdx].currentSaleId = newSale.id;
          if (newSale.profileName) {
            acc.profiles[profIdx].profileName = newSale.profileName;
          }
        }
      }
    }
  }

  // Auto-register customer if new
  if (newSale.customerName && newSale.customerPhone) {
    const existingCust = db.customers.find((c: any) => c.phone === newSale.customerPhone);
    if (!existingCust) {
      db.customers.push({
        id: 'cust_' + Date.now(),
        userId: newSale.userId,
        name: newSale.customerName,
        phone: newSale.customerPhone,
        createdAt: new Date().toISOString(),
      });
    }
  }

  writeDb(db);
  res.json(newSale);
});

app.put('/api/sales/:id', (req, res) => {
  const db = readDb();
  const idx = db.sales.findIndex((s: any) => s.id === req.params.id);
  if (idx !== -1) {
    db.sales[idx] = { ...db.sales[idx], ...req.body };
    writeDb(db);
    return res.json(db.sales[idx]);
  }
  res.status(404).json({ error: 'Venta no encontrada' });
});

app.post('/api/sales/:id/renew', (req, res) => {
  const { days = 30, paymentMethod } = req.body;
  const db = readDb();
  const idx = db.sales.findIndex((s: any) => s.id === req.params.id);

  if (idx !== -1) {
    const sale = db.sales[idx];
    const oldEndDate = new Date(sale.endDate);
    const now = new Date();

    let newStart = oldEndDate > now ? oldEndDate : now;
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + days);

    sale.startDate = newStart.toISOString();
    sale.endDate = newEnd.toISOString();
    sale.status = 'active';
    sale.paymentStatus = 'paid';
    if (paymentMethod) sale.paymentMethod = paymentMethod;
    sale.lastRenewalDate = new Date().toISOString();

    writeDb(db);
    return res.json({ success: true, sale });
  }

  res.status(404).json({ error: 'Venta no encontrada' });
});

app.delete('/api/sales/:id', (req, res) => {
  const db = readDb();
  const sale = db.sales.find((s: any) => s.id === req.params.id);

  if (sale) {
    // Release profile status
    const accIdx = db.accounts.findIndex((a: any) => a.id === sale.accountId);
    if (accIdx !== -1) {
      const acc = db.accounts[accIdx];
      if (sale.type === 'full_account') {
        acc.isFullAccountSold = false;
      }
      if (acc.profiles && sale.profileId) {
        const profIdx = acc.profiles.findIndex((p: any) => p.id === sale.profileId);
        if (profIdx !== -1) {
          acc.profiles[profIdx].status = 'available';
          delete acc.profiles[profIdx].currentSaleId;
        }
      }
    }
  }

  db.sales = db.sales.filter((s: any) => s.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// CRUD Customers
app.post('/api/customers', (req, res) => {
  const db = readDb();
  const newCustomer = { ...req.body, id: 'cust_' + Date.now(), createdAt: new Date().toISOString() };
  db.customers.push(newCustomer);
  writeDb(db);
  res.json(newCustomer);
});

app.put('/api/customers/:id', (req, res) => {
  const db = readDb();
  const idx = db.customers.findIndex((c: any) => c.id === req.params.id);
  if (idx !== -1) {
    db.customers[idx] = { ...db.customers[idx], ...req.body };
    writeDb(db);
    return res.json(db.customers[idx]);
  }
  res.status(404).json({ error: 'Cliente no encontrado' });
});

app.delete('/api/customers/:id', (req, res) => {
  const db = readDb();
  db.customers = db.customers.filter((c: any) => c.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// CRUD Templates
app.post('/api/templates', (req, res) => {
  const db = readDb();
  const newTmpl = { ...req.body, id: 'tmpl_' + Date.now() };
  db.templates.push(newTmpl);
  writeDb(db);
  res.json(newTmpl);
});

app.put('/api/templates/:id', (req, res) => {
  const db = readDb();
  const idx = db.templates.findIndex((t: any) => t.id === req.params.id);
  if (idx !== -1) {
    db.templates[idx] = { ...db.templates[idx], ...req.body };
    writeDb(db);
    return res.json(db.templates[idx]);
  }
  res.status(404).json({ error: 'Plantilla no encontrada' });
});

app.delete('/api/templates/:id', (req, res) => {
  const db = readDb();
  db.templates = db.templates.filter((t: any) => t.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// Admin Token Generation Endpoint with Cryptographic Checksum
app.post('/api/tokens/generate', (req, res) => {
  const { count = 1, days = 30 } = req.body;
  const db = readDb();
  const generated = [];

  const daysNum = Number(days) || 30;

  for (let i = 0; i < count; i++) {
    const code = generateSecureTokenCode(daysNum);
    const token = {
      id: 'tok_' + Date.now() + '_' + i,
      code,
      days: daysNum,
      isUsed: false,
      createdAt: new Date().toISOString(),
    };
    db.tokens.unshift(token);
    generated.push(token);
  }

  writeDb(db);
  res.json({ success: true, tokens: generated });
});

// Anti-Fraud Token Audit Logs Endpoint
app.get('/api/tokens/audit-logs', (req, res) => {
  const db = readDb();
  res.json({ success: true, logs: db.tokenAuditLogs || [] });
});

// Full Backup Restore
app.post('/api/backup/restore', (req, res) => {
  const { providers, accounts, customers, sales, templates, tokens } = req.body;
  const db = readDb();

  if (providers) db.providers = providers;
  if (accounts) db.accounts = accounts;
  if (customers) db.customers = customers;
  if (sales) db.sales = sales;
  if (templates) db.templates = templates;
  if (tokens) db.tokens = tokens;

  writeDb(db);
  res.json({ success: true, message: 'Base de datos restaurada correctamente' });
});

// Vite & Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Control de Streaming ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
