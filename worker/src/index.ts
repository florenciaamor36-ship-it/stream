import { buildPushPayload, type PushSubscription, type VapidKeys } from '@block65/webcrypto-web-push';
export interface Env {
  STORE: DurableObjectNamespace;
  STORE_KEY?: string;
  APP_ORIGIN?: string;
  ADMIN_EMAIL?: string;
  BOOTSTRAP_ADMIN_SECRET?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  PUSH_CRON_SECRET?: string;
  BACKEND_NAME?: string;
}

type User = {
  id: string; email: string; name: string; createdAt: string;
  gracePeriodUntil: string; subscriptionUntil: string; tokensRedeemed: number;
  isAdmin: boolean; hasAcceptedTerms: boolean; acceptedTermsAt?: string;
};
type Row = { user_id: string; kind: string; id: string; body: string };

const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000;
const ALLOWED_KINDS = new Set(['providers', 'accounts', 'customers', 'sales', 'templates', 'customServices', 'settings']);
const ERROR = {
  unauthorized: 'Sesión inválida o vencida. Iniciá sesión nuevamente.',
  locked: 'Tu período de prueba o suscripción venció. Canjeá un token para continuar.',
};

function json(data: unknown, status = 200, origin = '*') {
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
    'vary': 'Origin',
  }});
}
function randomBytes(length: number) { const b = new Uint8Array(length); crypto.getRandomValues(b); return b; }
function b64(b: Uint8Array) { return btoa(String.fromCharCode(...b)); }
function hex(b: Uint8Array) { return [...b].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function sha256(text: string) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))); }
async function passwordHash(password: string, salt = randomBytes(16)) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return `${PBKDF2_ITERATIONS}.${b64(salt)}.${b64(new Uint8Array(bits))}`;
}
async function passwordMatches(password: string, encoded: string) {
  const [iterations, salt, expected] = encoded.split('.');
  if (!iterations || !salt || !expected || Number(iterations) < 100_000 || Number(iterations) > 1_000_000) return false;
  const actual = await passwordHash(password, Uint8Array.from(atob(salt), c => c.charCodeAt(0)));
  return constantTime(actual.split('.')[2], expected);
}
function constantTime(a: string, b: string) {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function safeUser(row: any): User {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at,
    gracePeriodUntil: row.grace_until, subscriptionUntil: row.subscription_until,
    tokensRedeemed: row.tokens_redeemed, isAdmin: row.is_admin === 1,
    hasAcceptedTerms: row.has_accepted_terms === 1, acceptedTermsAt: row.accepted_terms_at || undefined };
}
function validEmail(email: unknown): email is string { return typeof email === 'string' && email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()); }
function datePlusDays(days: number) { const d = new Date(); d.setUTCDate(d.getUTCDate() + days); return d.toISOString(); }
function isLocked(user: User) { return !user.isAdmin && Date.now() > Math.max(Date.parse(user.subscriptionUntil || '1970-01-01'), Date.parse(user.gracePeriodUntil || '1970-01-01')); }
function tokenCode(days: number) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n: number) => Array.from(randomBytes(n), b => alphabet[b % alphabet.length]).join('');
  return `STRM-${days}D-${pick(6)}-${pick(6)}-${pick(4)}`;
}
function routeId(path: string) { return decodeURIComponent(path.split('/').filter(Boolean).at(-1) || ''); }

export default {
  async scheduled(_controller: { cron: string; scheduledTime: number }, env: Env): Promise<void> {
    if (!env.PUSH_CRON_SECRET) return;
    const id = env.STORE.idFromName(env.STORE_KEY || 'stream-flow-preview-smoke-2');
    const stub = env.STORE.get(id);
    const headers = new Headers({ 'x-stream-internal-cron': env.PUSH_CRON_SECRET });
    await stub.fetch(new Request('https://internal/__internal/push-daily', { method: 'POST', headers }));
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.APP_ORIGIN || 'https://florenciaamor36-ship-it.github.io';
    const requestOrigin = request.headers.get('Origin');
    if (requestOrigin && requestOrigin !== origin) return json({ error: 'Origen no permitido.' }, 403, 'null');
    if (request.method === 'OPTIONS') return json({}, 204, origin);
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, backend: env.BACKEND_NAME || 'stream-flow-api-preview' }, 200, origin);
    const id = env.STORE.idFromName(env.STORE_KEY || 'stream-flow-preview-smoke-2');
    const stub = env.STORE.get(id);
    // Durable Object fetch has no RPC-style second argument; pass trusted metadata only on the internal request.
    const forwarded = new Request(request);
    const headers = new Headers(forwarded.headers);
    headers.delete('x-stream-internal-cron');
    headers.set('x-stream-internal-origin', origin);
    if (env.ADMIN_EMAIL) headers.set('x-stream-internal-admin-email', env.ADMIN_EMAIL);
    else headers.delete('x-stream-internal-admin-email');
    if (url.pathname === '/api/auth/bootstrap' && env.BOOTSTRAP_ADMIN_SECRET) headers.set('x-stream-internal-bootstrap-secret', env.BOOTSTRAP_ADMIN_SECRET);
    else headers.delete('x-stream-internal-bootstrap-secret');
    return stub.fetch(new Request(forwarded, { headers }));
  }
};

export class StreamFlowStore {
  private sql: SqlStorage;
  constructor(private ctx: DurableObjectState, private env: any) {
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL, grace_until TEXT NOT NULL, subscription_until TEXT NOT NULL, tokens_redeemed INTEGER NOT NULL DEFAULT 0, is_admin INTEGER NOT NULL DEFAULT 0, has_accepted_terms INTEGER NOT NULL DEFAULT 0, accepted_terms_at TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS items (user_id TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(user_id,kind,id))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS tokens (code_hash TEXT PRIMARY KEY, days INTEGER NOT NULL, created_at TEXT NOT NULL, used_by TEXT, used_at TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS audits (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_email TEXT NOT NULL, token_fingerprint TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, details TEXT NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS attempts (attempt_key TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start INTEGER NOT NULL, locked_until INTEGER NOT NULL DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS push_subscriptions (user_id TEXT NOT NULL, endpoint_hash TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id,endpoint_hash))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS push_deliveries (user_id TEXT NOT NULL, day_key TEXT NOT NULL, sent_at TEXT NOT NULL, PRIMARY KEY(user_id,day_key))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS agent_keys (id TEXT PRIMARY KEY, target_user_id TEXT NOT NULL, created_by TEXT NOT NULL, label TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, key_prefix TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT)`);
    this.sql.exec(`UPDATE agent_keys SET expires_at=(SELECT subscription_until FROM users WHERE users.id=agent_keys.target_user_id) WHERE EXISTS (SELECT 1 FROM users WHERE users.id=agent_keys.target_user_id)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS agent_audit (id TEXT PRIMARY KEY, agent_key_id TEXT NOT NULL, target_user_id TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, status INTEGER NOT NULL, created_at TEXT NOT NULL)`);
  }

  async fetch(request: Request): Promise<Response> {
    const options = { origin: request.headers.get('x-stream-internal-origin') || 'https://florenciaamor36-ship-it.github.io', adminEmail: request.headers.get('x-stream-internal-admin-email') || '', bootstrapSecret: request.headers.get('x-stream-internal-bootstrap-secret') || '' };
    const url = new URL(request.url);
    const path = url.pathname;
    const now = new Date();
    try {
      if (request.method === 'POST' && path === '/api/auth/register') return await this.register(request, options.origin, options.adminEmail);
      if (request.method === 'POST' && path === '/api/auth/login') return await this.login(request, options.origin);
      if (request.method === 'POST' && path === '/api/auth/bootstrap') return await this.bootstrap(request, options, options.origin);
      if (request.method === 'POST' && path === '/api/auth/redeem-token') return await this.redeem(request, options.origin);
      if (request.method === 'POST' && path === '/api/auth/accept-terms') return await this.authMutation(request, options.origin, 'terms');
      if (request.method === 'POST' && path === '/api/auth/update-credentials') return await this.authMutation(request, options.origin, 'credentials', options.adminEmail);
      if (request.method === 'GET' && path === '/api/push/public-key') {
        if (!this.env.VAPID_PUBLIC_KEY || !this.env.VAPID_PRIVATE_KEY || !this.env.PUSH_CRON_SECRET) return json({ enabled: false }, 200, options.origin);
        return json({ enabled: true, publicKey: this.env.VAPID_PUBLIC_KEY }, 200, options.origin);
      }

      if (request.method === 'POST' && path === '/__internal/push-daily') {
        const supplied = request.headers.get('x-stream-internal-cron') || '';
        if (!this.env.PUSH_CRON_SECRET || !constantTime(supplied, this.env.PUSH_CRON_SECRET)) return json({ error: 'Not found.' }, 404, options.origin);
        return await this.sendDailyExpiryPushes(options.origin);
      }

      if (path.startsWith('/api/agent/v1/')) return await this.handleAgentApi(request, path, options.origin);

      const auth = await this.authenticate(request);
      if (!auth) return json({ error: ERROR.unauthorized }, 401, options.origin);
      const user = auth.user;
      if (path === '/api/admin/agent-keys' && request.method === 'GET') return await this.listAgentKeys(user, options.origin);
      if (path === '/api/admin/agent-audit' && request.method === 'GET') return await this.listAgentAudit(user, options.origin);
      if (path === '/api/admin/agent-keys' && request.method === 'POST') return await this.createAgentKey(request, user, options.origin);
      const agentKeyMatch = path.match(/^\/api\/admin\/agent-keys\/([^/]+)$/);
      if (agentKeyMatch && request.method === 'DELETE') return await this.revokeAgentKey(agentKeyMatch[1], user, options.origin);
      if (path === '/api/notifications/expirations' && request.method === 'GET') return this.expirationNotificationSummary(user.id, options.origin);
      if (path === '/api/auth/me' && request.method === 'GET') return json({ success: true, user: this.enriched(user) }, 200, options.origin);
      if (path === '/api/auth/logout' && request.method === 'POST') {
        // Remove only this browser's push subscription; other devices on the same
        // account remain opted in. The endpoint is still scoped to the authenticated user.
        const body = await this.body(request);
        const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
        if (endpoint && endpoint.length <= 2048) {
          this.sql.exec('DELETE FROM push_subscriptions WHERE user_id=? AND endpoint_hash=?', user.id, await sha256(endpoint));
        }
        this.sql.exec('DELETE FROM sessions WHERE token_hash=?', auth.tokenHash);
        return json({ success: true }, 200, options.origin);
      }
      if (isLocked(user) && !((path === '/api/backup/export' || path === '/api/notifications/expirations') && request.method === 'GET')) return json({ error: ERROR.locked }, 402, options.origin);
      if (path === '/api/data' && request.method === 'GET') {
        const items = this.sql.exec('SELECT kind,id,body FROM items WHERE user_id=?', user.id).toArray() as Row[];
        const result: any = { providers: [], accounts: [], customers: [], sales: [], templates: [], customServices: [], tokens: [], tokenAuditLogs: [], settings: { userId: user.id, currency: 'USD', currencySymbol: '$', theme: 'theme-dark-red' }, serverTime: now.toISOString() };
        for (const row of items) {
          const body = JSON.parse(row.body);
          if (row.kind === 'settings') result.settings = body;
          else (result[row.kind] ||= []).push(body);
        }
        if (user.isAdmin) {
          result.tokens = this.sql.exec('SELECT code_hash,days,created_at,used_by,used_at FROM tokens ORDER BY created_at DESC').toArray().map((t: any) => ({ id: `tok_${t.code_hash}`, code: '', days: t.days, isUsed: !!t.used_by, createdAt: t.created_at, usedByEmail: t.used_by }));
          result.tokenAuditLogs = this.sql.exec('SELECT id,user_id,user_email,token_fingerprint,status,created_at,details FROM audits ORDER BY created_at DESC LIMIT 300').toArray().map((a: any) => ({ id: a.id, userId: a.user_id, userEmail: a.user_email, tokenCode: a.token_fingerprint, status: a.status, timestamp: a.created_at, details: a.details }));
        }
        return json(result, 200, options.origin);
      }
      if (path === '/api/tokens/generate' && request.method === 'POST') {
        const body = await this.body(request);
        if (!user.isAdmin) return json({ error: 'Acceso denegado.' }, 403, options.origin);
        const count = Math.min(100, Math.max(1, Number(body.count) || 1)); const days = Math.min(3650, Math.max(1, Number(body.days) || 30));
        const created: any[] = [];
        for (let i = 0; i < count; i++) {
          let code = tokenCode(days), hash = await sha256(code);
          while (this.sql.exec('SELECT code_hash FROM tokens WHERE code_hash=?', hash).toArray().length) { code = tokenCode(days); hash = await sha256(code); }
          this.sql.exec('INSERT INTO tokens(code_hash,days,created_at) VALUES(?,?,?)', hash, days, now.toISOString());
          // Plain token is returned once to the administrator and is never persisted.
          created.push({ id: `tok_${hash}`, code, days, isUsed: false, createdAt: now.toISOString() });
        }
        return json({ success: true, tokens: created }, 200, options.origin);
      }
      if (path === '/api/tokens/audit-logs' && request.method === 'GET') {
        if (!user.isAdmin) return json({ error: 'Acceso denegado.' }, 403, options.origin);
        const logs = this.sql.exec('SELECT id,user_id,user_email,token_fingerprint,status,created_at,details FROM audits ORDER BY created_at DESC LIMIT 300').toArray().map((a: any) => ({ id:a.id,userId:a.user_id,userEmail:a.user_email,tokenCode:a.token_fingerprint,status:a.status,timestamp:a.created_at,details:a.details }));
        return json({ success: true, logs }, 200, options.origin);
      }
      if (path === '/api/push/subscriptions' && request.method === 'POST') return await this.savePushSubscription(request, user, options.origin);
      if (path === '/api/push/subscriptions' && request.method === 'DELETE') return await this.deletePushSubscription(request, user, options.origin);
      if (path === '/api/push/subscriptions/status' && request.method === 'POST') return await this.pushSubscriptionStatus(request, user, options.origin);
      if (path === '/api/backup/export' && request.method === 'GET') return this.exportData(user, options.origin);
      if (path === '/api/backup/restore' && request.method === 'POST') return await this.restoreData(request, user, options.origin);
      if (path === '/api/settings' && request.method === 'POST') return await this.saveSettings(request, user, options.origin);
      const custom = path.match(/^\/api\/custom-services(?:\/([^/]+))?$/);
      if (custom) return await this.collection(request, user, 'customServices', custom[1], options.origin);
      for (const kind of ['providers','accounts','customers','sales','templates']) {
        const match = path.match(new RegExp(`^/api/${kind}(?:/([^/]+)(?:/renew)?)?$`));
        if (match) return await this.collection(request, user, kind, match[1], options.origin, path.endsWith('/renew'));
      }
      return json({ error: 'Ruta no encontrada.' }, 404, options.origin);
    } catch (error) {
      // Never return database, password, token, or stack details to callers.
      const message = error instanceof Error ? error.message : '';
      if (message === 'bad JSON' || message === 'request too large') return json({error:'Solicitud inválida o demasiado grande.'},400,options.origin);
      const saleStatus=(error as any)?.saleStatus; if(saleStatus)return json({error:message},saleStatus,options.origin);
      return json({ error: 'No se pudo completar la solicitud. Intentá de nuevo.' }, 500, options.origin);
    }
  }

  private async listAgentKeys(admin: User, origin: string) {
    if (!admin.isAdmin) return json({error:'Acceso denegado.'},403,origin);
    const rows=this.sql.exec(`SELECT k.id,k.target_user_id,u.email AS target_email,u.subscription_until,k.label,k.key_prefix,k.created_at,k.revoked_at FROM agent_keys k JOIN users u ON u.id=k.target_user_id ORDER BY k.created_at DESC LIMIT 500`).toArray();
    return json({success:true,keys:rows.map((r:any)=>({id:r.id,targetUserId:r.target_user_id,targetEmail:r.target_email,label:r.label,keyPrefix:r.key_prefix,createdAt:r.created_at,expiresAt:r.subscription_until,revokedAt:r.revoked_at||null,active:!r.revoked_at&&Date.parse(r.subscription_until)>Date.now()}))},200,origin);
  }

  private async listAgentAudit(admin: User, origin: string) {
    if (!admin.isAdmin) return json({error:'Acceso denegado.'},403,origin);
    const rows=this.sql.exec(`SELECT a.id,a.method,a.path,a.status,a.created_at,a.target_user_id,u.email AS target_email,k.label,k.key_prefix FROM agent_audit a LEFT JOIN users u ON u.id=a.target_user_id LEFT JOIN agent_keys k ON k.id=a.agent_key_id ORDER BY a.created_at DESC LIMIT 300`).toArray();
    return json({success:true,events:rows.map((r:any)=>({id:r.id,method:r.method,path:r.path,status:r.status,createdAt:r.created_at,targetUserId:r.target_user_id,targetEmail:r.target_email||'Cuenta eliminada',label:r.label||'Clave revocada',keyPrefix:r.key_prefix||'',}))},200,origin);
  }

  private async createAgentKey(request: Request, admin: User, origin: string) {
    const b=await this.body(request);
    if (!admin.isAdmin) return json({error:'Acceso denegado.'},403,origin);
    const email=String(b.targetEmail||'').trim().toLowerCase(), label=String(b.label||'').trim();
    if(!validEmail(email)) return json({error:'Ingresá el email válido de una cuenta cliente existente.'},400,origin);
    if(!label||label.length>80) return json({error:'El nombre del agente debe tener entre 1 y 80 caracteres.'},400,origin);
    const target=this.sql.exec('SELECT id,is_admin,subscription_until FROM users WHERE lower(email)=?',email).toArray()[0] as any;
    if(!target) return json({error:'No existe una cuenta con ese email. El cliente debe registrarse primero.'},404,origin);
    if(target.is_admin===1) return json({error:'Las claves de agente se asignan a cuentas cliente, no a otras cuentas administradoras.'},400,origin);
    const expires=String(target.subscription_until||'');
    if(!Number.isFinite(Date.parse(expires))||Date.parse(expires)<=Date.now()) return json({error:'La suscripción de esta cuenta ya venció. Primero debe activar o renovar su suscripción para emitir una API.'},400,origin);
    const key='sf_agent_'+b64(randomBytes(32)).replace(/[+/=]/g,c=>c==='+'?'-':c==='/'?'_':'');
    const keyHash=await sha256(key), id=crypto.randomUUID(), now=new Date(), prefix=key.slice(0,18);
    this.sql.exec('INSERT INTO agent_keys(id,target_user_id,created_by,label,key_hash,key_prefix,created_at,expires_at,revoked_at) VALUES(?,?,?,?,?,?,?,?,NULL)',id,target.id,admin.id,label,keyHash,prefix,now.toISOString(),expires);
    this.sql.exec('INSERT INTO agent_audit(id,agent_key_id,target_user_id,method,path,status,created_at) VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),id,target.id,'ADMIN','KEY_CREATED',201,now.toISOString());
    return json({success:true,key,agent:{id,targetEmail:email,label,keyPrefix:prefix,createdAt:now.toISOString(),expiresAt:expires,scopes:['data:read','data:write']},warning:'Esta clave se muestra una sola vez. Copiala y guardala en el gestor seguro del agente.'},201,origin);
  }

  private async revokeAgentKey(id: string, admin: User, origin: string) {
    if (!admin.isAdmin) return json({error:'Acceso denegado.'},403,origin);
    const row=this.sql.exec('SELECT id FROM agent_keys WHERE id=?',id).toArray()[0];
    if(!row) return json({error:'No se encontró esa clave.'},404,origin);
    const target=this.sql.exec('SELECT target_user_id FROM agent_keys WHERE id=?',id).toArray()[0] as any;
    const now=new Date().toISOString();
    this.sql.exec('UPDATE agent_keys SET revoked_at=? WHERE id=? AND revoked_at IS NULL',now,id);
    this.sql.exec('INSERT INTO agent_audit(id,agent_key_id,target_user_id,method,path,status,created_at) VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),id,target.target_user_id,'ADMIN','KEY_REVOKED',200,now);
    return json({success:true},200,origin);
  }

  private async handleAgentApi(request: Request, path: string, origin: string): Promise<Response> {
    const header=request.headers.get('authorization')||'', key=header.startsWith('Bearer ')?header.slice(7):'';
    if(!/^sf_agent_[A-Za-z0-9_-]{40,60}$/.test(key)) return json({error:'Clave de agente inválida o vencida.'},401,origin);
    const row=this.sql.exec(`SELECT k.id AS agent_key_id,k.target_user_id,k.expires_at,k.revoked_at,u.* FROM agent_keys k JOIN users u ON u.id=k.target_user_id WHERE k.key_hash=?`,await sha256(key)).toArray()[0] as any;
    if(!row||row.revoked_at||Date.parse(row.expires_at)<=Date.now()||Date.parse(row.subscription_until)<=Date.now()) return json({error:'Clave de agente inválida o vencida.'},401,origin);
    const user=safeUser(row);
    const audit=(status:number)=>this.sql.exec('INSERT INTO agent_audit(id,agent_key_id,target_user_id,method,path,status,created_at) VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),row.agent_key_id,user.id,request.method,path,status,new Date().toISOString());
    if(isLocked(user)) { audit(402); return json({error:ERROR.locked},402,origin); }
    if(request.method==='GET'&&path==='/api/agent/v1/data') {
      const items=this.sql.exec('SELECT kind,id,body FROM items WHERE user_id=?',user.id).toArray() as Row[];
      const result:any={providers:[],accounts:[],customers:[],sales:[],templates:[],customServices:[],settings:{userId:user.id,currency:'USD',currencySymbol:'$',theme:'theme-dark-red'},serverTime:new Date().toISOString(),agentContext:{userId:user.id,email:user.email,scopes:['data:read','data:write']}};
      for(const item of items){const body=JSON.parse(item.body);if(item.kind==='settings')result.settings=body;else if(item.kind!=='tokens'&&item.kind!=='tokenAuditLogs')(result[item.kind] ||= []).push(body);}
      audit(200); return json(result,200,origin);
    }
    const match=path.match(/^\/api\/agent\/v1\/(providers|accounts|customers|sales|templates|custom-services)(?:\/([^/]+)(?:\/renew)?)?$/);
    if(!match) { audit(404); return json({error:'Ruta de agente no encontrada.'},404,origin); }
    const kind=match[1]==='custom-services'?'customServices':match[1], rest=path.slice('/api/agent/v1/'.length), mappedPath='/api/'+rest.replace(/^custom-services/, 'custom-services');
    if(match[2]) {
      const ownItem=this.sql.exec('SELECT id FROM items WHERE user_id=? AND kind=? AND id=?',user.id,kind,decodeURIComponent(match[2])).toArray()[0];
      if(!ownItem) { audit(404); return json({error:'No se encontró el registro en la cuenta vinculada.'},404,origin); }
    }
    const mapped=new Request(new URL(mappedPath,request.url),request);
    const response=await this.collection(mapped,user,kind,match[2]?decodeURIComponent(match[2]):undefined,origin,path.endsWith('/renew'));
    audit(response.status); return response;
  }

  private expirationNotificationSummary(userId: string, origin: string): Response {
    const today = new Date().toISOString().slice(0, 10);
    const sales = this.sql.exec('SELECT body FROM items WHERE user_id=? AND kind=?', userId, 'sales').toArray() as any[];
    const days = sales.map((row) => JSON.parse(row.body)).filter((sale: any) => sale.status !== 'cancelled' && sale.endDate).map((sale: any) => {
      const target = new Date(String(sale.endDate));
      return Math.floor((Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
    }).filter((days: number) => days >= 0 && days <= 3);
    return json({ dayKey: today, count: days.length, earliestDays: days.length ? Math.min(...days) : null }, 200, origin);
  }

  private async savePushSubscription(request: Request, user: User, origin: string) {
    if (!this.env.VAPID_PUBLIC_KEY || !this.env.VAPID_PRIVATE_KEY || !this.env.PUSH_CRON_SECRET) return json({ error: 'Las notificaciones push todavía no están configuradas en el servidor.' }, 503, origin);
    const b = await this.body(request);
    const endpoint = typeof b.endpoint === 'string' ? b.endpoint.trim() : '';
    const p256dh = typeof b.keys?.p256dh === 'string' ? b.keys.p256dh : '';
    const auth = typeof b.keys?.auth === 'string' ? b.keys.auth : '';
    let parsed: URL;
    try { parsed = new URL(endpoint); } catch { return json({ error: 'Suscripción de notificaciones inválida.' }, 400, origin); }
    const host = parsed.hostname.toLowerCase();
    const allowedHost = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' || host.endsWith('.push.services.mozilla.com') || host === 'web.push.apple.com' || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com');
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port && parsed.port !== '443' || endpoint.length > 2048 || !allowedHost || !/^[A-Za-z0-9_-]{80,100}$/.test(p256dh) || !/^[A-Za-z0-9_-]{16,32}$/.test(auth)) return json({ error: 'El navegador envió una suscripción de notificaciones inválida.' }, 400, origin);
    const endpointHash = await sha256(endpoint);
    this.sql.exec('INSERT INTO push_subscriptions(user_id,endpoint_hash,endpoint,p256dh,auth,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,endpoint_hash) DO UPDATE SET endpoint=excluded.endpoint,p256dh=excluded.p256dh,auth=excluded.auth', user.id, endpointHash, endpoint, p256dh, auth, new Date().toISOString());
    return json({ success: true }, 200, origin);
  }

  private async deletePushSubscription(request: Request, user: User, origin: string) {
    const b = await this.body(request);
    const endpoint = typeof b.endpoint === 'string' ? b.endpoint.trim() : '';
    if (!endpoint || endpoint.length > 2048) return json({ error: 'Suscripción inválida.' }, 400, origin);
    this.sql.exec('DELETE FROM push_subscriptions WHERE user_id=? AND endpoint_hash=?', user.id, await sha256(endpoint));
    return json({ success: true }, 200, origin);
  }

  private async pushSubscriptionStatus(request: Request, user: User, origin: string) {
    const b = await this.body(request);
    const endpoint = typeof b.endpoint === 'string' ? b.endpoint.trim() : '';
    if (!endpoint || endpoint.length > 2048) return json({ error: 'Suscripción inválida.' }, 400, origin);
    const endpointHash = await sha256(endpoint);
    const rows = this.sql.exec('SELECT endpoint_hash FROM push_subscriptions WHERE user_id=? AND endpoint_hash=?', user.id, endpointHash).toArray();
    return json({ subscribed: rows.length > 0 }, 200, origin);
  }

  private async sendDailyExpiryPushes(origin: string): Promise<Response> {
    if (!this.env.VAPID_PUBLIC_KEY || !this.env.VAPID_PRIVATE_KEY) return json({ success: false, sent: 0, reason: 'push-not-configured' }, 503, origin);
    const today = new Date().toISOString().slice(0, 10);
    const users = this.sql.exec('SELECT DISTINCT user_id FROM items WHERE kind=?', 'sales').toArray() as any[];
    let sent = 0, stale = 0, failed = 0;
    const vapid: VapidKeys = { subject: this.env.VAPID_SUBJECT || 'mailto:florenciaamor36@gmail.com', publicKey: this.env.VAPID_PUBLIC_KEY, privateKey: this.env.VAPID_PRIVATE_KEY };
    for (const row of users) {
      const userId = String(row.user_id);
      if (this.sql.exec('SELECT user_id FROM push_deliveries WHERE user_id=? AND day_key=?', userId, today).toArray().length) continue;
      const sales = this.sql.exec('SELECT body FROM items WHERE user_id=? AND kind=?', userId, 'sales').toArray() as any[];
      const relevant = sales.map(r => JSON.parse(r.body)).filter((sale: any) => sale.status !== 'cancelled' && sale.endDate);
      const expiring = relevant.filter((sale: any) => {
        const target = new Date(String(sale.endDate));
        const remaining = Math.floor((Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()) - Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())) / 86400000);
        return remaining >= 0 && remaining <= 3;
      });
      if (!expiring.length) continue;
      const subscriptions = this.sql.exec('SELECT endpoint_hash,endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=?', userId).toArray() as any[];
      if (!subscriptions.length) continue;
      const title = expiring.length === 1 ? 'Un servicio está por vencer' : `${expiring.length} servicios están por vencer`;
      const earliest = Math.min(...expiring.map((sale: any) => Math.max(0, Math.floor((Date.parse(`${String(sale.endDate).slice(0,10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000))));
      const body = earliest === 0 ? 'Hay un servicio que vence hoy. Abrí Stream Flow Pro para ver el detalle.' : earliest === 1 ? 'Hay servicios que vencen mañana. Abrí Stream Flow Pro para ver el detalle.' : 'Hay servicios que vencen en los próximos 3 días. Abrí Stream Flow Pro para ver el detalle.';
      const payload = { title, body, url: '/stream/?tab=expirations', tag: `expiry-${today}`, count: expiring.length };
      let userSent = false;
      for (const sub of subscriptions) {
        try {
          const subscription: PushSubscription = { endpoint: String(sub.endpoint), expirationTime: null, keys: { p256dh: String(sub.p256dh), auth: String(sub.auth) } };
          const push = await buildPushPayload({ data: JSON.stringify(payload), options: { ttl: 86400, urgency: 'normal' } }, subscription, vapid);
          const response = await fetch(subscription.endpoint, push);
          if (response.status === 404 || response.status === 410) {
            this.sql.exec('DELETE FROM push_subscriptions WHERE user_id=? AND endpoint_hash=?', userId, sub.endpoint_hash); stale++;
          } else if (!response.ok) { failed++; }
          else { sent++; userSent = true; }
        } catch { failed++; }
      }
      if (userSent) this.sql.exec('INSERT OR IGNORE INTO push_deliveries(user_id,day_key,sent_at) VALUES(?,?,?)', userId, today, new Date().toISOString());
    }
    return json({ success: true, sent, stale, failed, day: today }, 200, origin);
  }

  private async body(request: Request) {
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > 1_000_000) throw new Error('request too large');
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 1_000_000) throw new Error('request too large');
    try { const value = text ? JSON.parse(text) : {}; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid body'); return value; } catch { throw new Error('bad JSON'); }
  }
  private userByEmail(email: string) { return this.sql.exec('SELECT * FROM users WHERE email=?', email).toArray()[0] as any; }
  private async hitRateLimit(scope: string, ip: string, max: number, windowMs: number) {
    const key = await sha256(`${scope}|${ip}`), now = Date.now();
    const row = this.sql.exec('SELECT count,window_start,locked_until FROM attempts WHERE attempt_key=?', key).toArray()[0] as any;
    if (row && row.locked_until > now) return true;
    const active = row && now - row.window_start < windowMs;
    const count = active ? row.count + 1 : 1;
    const start = active ? row.window_start : now;
    const locked = count >= max ? start + windowMs : 0;
    this.sql.exec('INSERT INTO attempts(attempt_key,count,window_start,locked_until) VALUES(?,?,?,?) ON CONFLICT(attempt_key) DO UPDATE SET count=excluded.count,window_start=excluded.window_start,locked_until=excluded.locked_until', key,count,start,locked);
    return count > max;
  }
  private async issueSession(userId: string) {
    const token = b64(randomBytes(32)).replace(/[+/=]/g, c => c === '+' ? '-' : c === '/' ? '_' : '');
    this.sql.exec('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', await sha256(token), userId, Date.now() + SESSION_DAYS * 86400_000);
    return token;
  }
  private async authenticate(request: Request) {
    const bearer = request.headers.get('authorization') || '';
    const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
    if (!token || token.length > 200) return null;
    const hash = await sha256(token);
    const session = this.sql.exec('SELECT user_id,expires_at FROM sessions WHERE token_hash=?', hash).toArray()[0] as any;
    if (!session || session.expires_at < Date.now()) { if (session) this.sql.exec('DELETE FROM sessions WHERE token_hash=?', hash); return null; }
    const row = this.sql.exec('SELECT * FROM users WHERE id=?', session.user_id).toArray()[0] as any;
    return row ? { user: safeUser(row), tokenHash: hash } : null;
  }
  private enriched(user: User, token?: string) { return { ...user, serverTime: new Date().toISOString(), isLocked: isLocked(user), ...(token ? { sessionToken: token } : {}) }; }
  private async register(request: Request, origin: string, adminEmail: string) {
    const ip=request.headers.get('cf-connecting-ip')||'unknown';
    if (await this.hitRateLimit('register',ip,5,3_600_000)) return json({error:'Demasiados registros desde esta conexión. Probá más tarde.'},429,origin);
    const b = await this.body(request); const email = String(b.email || '').trim().toLowerCase(); const password = String(b.password || ''); const name = String(b.name || email.split('@')[0]).trim().slice(0, 120);
    if (!validEmail(email) || password.length < 10 || password.length > 256) return json({ error: 'Ingresá un correo válido y una contraseña de al menos 10 caracteres.' }, 400, origin);
    if (this.userByEmail(email)) return json({ error: 'El correo electrónico ya está registrado.' }, 409, origin);
    if (adminEmail && email === adminEmail.toLowerCase()) return json({ error: 'Esta cuenta requiere la configuración segura del administrador.' }, 403, origin);
    const id = `user_${crypto.randomUUID()}`, created = new Date().toISOString(), grace = datePlusDays(3), hash = await passwordHash(password);
    this.sql.exec('INSERT INTO users(id,email,password_hash,name,created_at,grace_until,subscription_until) VALUES(?,?,?,?,?,?,?)', id,email,hash,name,created,grace,grace);
    const user = safeUser(this.sql.exec('SELECT * FROM users WHERE id=?', id).toArray()[0]);
    return json({ success: true, user: this.enriched(user, await this.issueSession(id)) }, 201, origin);
  }
  private async login(request: Request, origin: string) {
    const b = await this.body(request); const email = String(b.email || '').trim().toLowerCase(); const pass = String(b.password || '');
    if (!validEmail(email) || !pass || pass.length > 256) return json({ error: 'Correo o contraseña incorrectos.' }, 401, origin);
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'; const key = await sha256(`${email}|${ip}`); const row = this.sql.exec('SELECT count,window_start,locked_until FROM attempts WHERE attempt_key=?', key).toArray()[0] as any;
    if (row && row.locked_until > Date.now()) return json({ error: 'Demasiados intentos. Esperá 15 minutos y probá de nuevo.' }, 429, origin);
    const user = this.userByEmail(email);
    const matched = user ? await passwordMatches(pass, user.password_hash) : await passwordMatches(pass, await passwordHash('not-a-real-password-for-timing'));
    if (!user || !matched) {
      const now = Date.now(), cnt = row && now - row.window_start < 900_000 ? row.count + 1 : 1;
      this.sql.exec('INSERT INTO attempts(attempt_key,count,window_start,locked_until) VALUES(?,?,?,?) ON CONFLICT(attempt_key) DO UPDATE SET count=excluded.count,window_start=excluded.window_start,locked_until=excluded.locked_until', key,cnt, row && now-row.window_start<900_000 ? row.window_start : now, cnt>=5 ? now+900_000 : 0);
      return json({ error: 'Correo o contraseña incorrectos.' }, 401, origin);
    }
    this.sql.exec('DELETE FROM attempts WHERE attempt_key=?', key);
    const safe = safeUser(user), session = await this.issueSession(safe.id);
    return json({ success: true, user: this.enriched(safe, session) }, 200, origin);
  }
  private async bootstrap(request: Request, options: { origin:string; adminEmail:string; bootstrapSecret:string }) {
    const ip=request.headers.get('cf-connecting-ip')||'unknown';
    if (await this.hitRateLimit('bootstrap',ip,5,3_600_000)) return json({error:'Demasiados intentos. Probá más tarde.'},429,options.origin);
    const b = await this.body(request), secret = String(b.secret || ''), email = String(b.email || '').trim().toLowerCase(), password = String(b.password || ''), name = String(b.name || 'Administrador').trim().slice(0,120);
    if (!options.bootstrapSecret || !constantTime(secret, options.bootstrapSecret) || !options.adminEmail || email !== options.adminEmail.toLowerCase()) return json({ error:'Configuración de administrador inválida.' }, 403, options.origin);
    if (this.sql.exec('SELECT id FROM users WHERE is_admin=1 LIMIT 1').toArray().length) return json({ error:'El administrador inicial ya fue creado.' }, 409, options.origin);
    if (!validEmail(email) || password.length < 10 || password.length > 256) return json({ error:'Correo o contraseña inválidos.' }, 400, options.origin);
    const id=`user_${crypto.randomUUID()}`, created=new Date().toISOString(), sub=datePlusDays(3), hash=await passwordHash(password);
    this.sql.exec('INSERT INTO users(id,email,password_hash,name,created_at,grace_until,subscription_until,is_admin,has_accepted_terms) VALUES(?,?,?,?,?,?,?,?,1)', id,email,hash,name,created,sub,sub,1);
    const user=safeUser(this.sql.exec('SELECT * FROM users WHERE id=?', id).toArray()[0]);
    return json({success:true,user:this.enriched(user,await this.issueSession(id))},201,options.origin);
  }
  private async authMutation(request: Request, origin: string, kind: 'terms'|'credentials', adminEmail = '') {
    const auth = await this.authenticate(request); if (!auth) return json({error:ERROR.unauthorized},401,origin);
    const b=await this.body(request), user=auth.user;
    if (kind==='terms') {
      const accepted=new Date().toISOString(); this.sql.exec('UPDATE users SET has_accepted_terms=1,accepted_terms_at=? WHERE id=?',accepted,user.id);
      return json({success:true,user:{...user,hasAcceptedTerms:true,acceptedTermsAt:accepted}},200,origin);
    }
    const row=this.sql.exec('SELECT * FROM users WHERE id=?',user.id).toArray()[0] as any;
    const currentPassword=typeof b.currentPassword==='string'?b.currentPassword:'';
    if (await this.hitRateLimit('update-credentials',user.id,5,900_000)) return json({error:'Demasiados intentos. Probá nuevamente en 15 minutos.'},429,origin);
    if (!currentPassword || currentPassword.length>256 || !await passwordMatches(currentPassword,row.password_hash)) return json({error:'La contraseña actual es incorrecta.'},403,origin);
    const newEmail=typeof b.newEmail==='string'?b.newEmail.trim().toLowerCase():'', newPassword=typeof b.newPassword==='string'?b.newPassword:'', newName=typeof b.newName==='string'?b.newName.trim().slice(0,120):'';
    if (newEmail && adminEmail && newEmail===adminEmail.toLowerCase() && !user.isAdmin) return json({error:'Este correo está reservado.'},403,origin);
    if (newEmail && (!validEmail(newEmail) || (this.userByEmail(newEmail) && newEmail!==user.email))) return json({error:'El correo electrónico ingresado ya está en uso o no es válido.'},400,origin);
    if (newPassword && (newPassword.length < 10 || newPassword.length > 256)) return json({error:'La contraseña debe tener al menos 10 caracteres.'},400,origin);
    const hash=newPassword ? await passwordHash(newPassword) : row.password_hash;
    this.sql.exec('UPDATE users SET email=?,password_hash=?,name=? WHERE id=?',newEmail||user.email,hash,newName||user.name,user.id);
    if (newPassword || (newEmail && newEmail!==user.email)) this.sql.exec('DELETE FROM sessions WHERE user_id=? AND token_hash<>?',user.id,auth.tokenHash);
    const updated=safeUser(this.sql.exec('SELECT * FROM users WHERE id=?',user.id).toArray()[0]);
    return json({success:true,message:'Credenciales actualizadas correctamente.',user:updated},200,origin);
  }
  private async redeem(request: Request, origin: string) {
    const auth=await this.authenticate(request); if(!auth) return json({error:ERROR.unauthorized},401,origin);
    if(isLocked(auth.user) && Date.now() > Date.parse(auth.user.gracePeriodUntil)) { /* users may still redeem while expired */ }
    const b=await this.body(request), code=String(b.tokenCode||'').trim().toUpperCase();
    if (!/^STRM-\d{1,4}D-[A-HJ-NP-Z2-9]{6}-[A-HJ-NP-Z2-9]{6}-[A-HJ-NP-Z2-9]{4}$/.test(code)) return json({error:'El código de token ingresado no es válido.'},400,origin);
    const ip=request.headers.get('cf-connecting-ip')||'unknown', key=await sha256(`${auth.user.id}|${ip}`), now=Date.now();
    const at=this.sql.exec('SELECT count,window_start,locked_until FROM attempts WHERE attempt_key=?',key).toArray()[0] as any;
    if(at && at.locked_until>now) return json({error:'Demasiados intentos de canje. Esperá 15 minutos.'},429,origin);
    const hash=await sha256(code), token=this.sql.exec('SELECT code_hash,days,used_by FROM tokens WHERE code_hash=?',hash).toArray()[0] as any;
    if(!token || token.used_by) {
      const cnt=at && now-at.window_start<900_000?at.count+1:1;
      this.sql.exec('INSERT INTO attempts(attempt_key,count,window_start,locked_until) VALUES(?,?,?,?) ON CONFLICT(attempt_key) DO UPDATE SET count=excluded.count,window_start=excluded.window_start,locked_until=excluded.locked_until',key,cnt,at&&now-at.window_start<900_000?at.window_start:now,cnt>=5?now+900_000:0);
      const fingerprint=(await sha256(code)).slice(0,12);
      this.sql.exec('INSERT INTO audits(id,user_id,user_email,token_fingerprint,status,created_at,details) VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),auth.user.id,auth.user.email,fingerprint,token?'ALREADY_REDEEMED':'NOT_FOUND',new Date().toISOString(),token?'Token previamente canjeado.':'Token no encontrado.');
      return json({error:token?'Este token ya fue canjeado anteriormente.':'El código de token ingresado no existe.'},token?400:404,origin);
    }
    const start=Math.max(Date.parse(auth.user.subscriptionUntil||''),Date.now()), end=new Date(start); end.setUTCDate(end.getUTCDate()+token.days);
    this.sql.exec('UPDATE tokens SET used_by=?,used_at=? WHERE code_hash=? AND used_by IS NULL',auth.user.email,new Date().toISOString(),hash);
    this.sql.exec('UPDATE users SET subscription_until=?,tokens_redeemed=tokens_redeemed+1 WHERE id=?',end.toISOString(),auth.user.id);
    this.sql.exec('UPDATE agent_keys SET expires_at=? WHERE target_user_id=? AND revoked_at IS NULL',end.toISOString(),auth.user.id);
    this.sql.exec('DELETE FROM attempts WHERE attempt_key=?',key);
    this.sql.exec('INSERT INTO audits(id,user_id,user_email,token_fingerprint,status,created_at,details) VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),auth.user.id,auth.user.email,(await sha256(code)).slice(0,12),'SUCCESS',new Date().toISOString(),`Canje exitoso: +${token.days} días.`);
    const updated=safeUser(this.sql.exec('SELECT * FROM users WHERE id=?',auth.user.id).toArray()[0]);
    return json({success:true,message:`¡Token canjeado exitosamente! Se han acreditado +${token.days} días de suscripción activa.`,user:this.enriched(updated)},200,origin);
  }
  private async collection(request: Request, user: User, kind: string, id: string|undefined, origin: string, renew=false) {
    if (!ALLOWED_KINDS.has(kind) && kind!=='customServices') return json({error:'Ruta no encontrada.'},404,origin);
    const findItem=(k:string,itemId:string)=>this.sql.exec('SELECT body FROM items WHERE user_id=? AND kind=? AND id=?',user.id,k,itemId).toArray()[0] as any;
    const release=(sale:any)=>{
      if (!sale?.accountId) return;
      const row=findItem('accounts',String(sale.accountId)); if(!row)return;
      const account=JSON.parse(row.body);
      if(sale.type==='full_account') {
        const other=this.sql.exec('SELECT body FROM items WHERE user_id=? AND kind=?',user.id,'sales').toArray().some((r:any)=>{const x=JSON.parse(r.body);return x.id!==sale.id&&x.accountId===sale.accountId&&x.type==='full_account'});
        if(!other) account.isFullAccountSold=false;
      }
      if(sale.profileId && Array.isArray(account.profiles)) {
        const profile=account.profiles.find((p:any)=>p.id===sale.profileId);
        if(profile){
          const linkedElsewhere=this.sql.exec('SELECT body FROM items WHERE user_id=? AND kind=?',user.id,'sales').toArray().some((r:any)=>{const x=JSON.parse(r.body);return x.id!==sale.id&&x.accountId===sale.accountId&&x.profileId===sale.profileId&&x.status!=='cancelled'});
          if(profile.currentSaleId===sale.id || (profile.status==='sold'&&!profile.currentSaleId&&!linkedElsewhere)){profile.status='available';delete profile.currentSaleId;}
        }
      }
      this.sql.exec('UPDATE items SET body=? WHERE user_id=? AND kind=? AND id=?',JSON.stringify(account),user.id,'accounts',account.id);
    };
    const reserve=(sale:any, excludeId?:string)=>{
      if(!sale.accountId)return null; // Older/imported unlinked sales remain supported.
      const row=findItem('accounts',String(sale.accountId)); if(!row)return {status:404,error:'No se encontró la cuenta del inventario.'};
      const account=JSON.parse(row.body);
      if(sale.type==='full_account') {
        if(account.isFullAccountSold && excludeId===undefined)return {status:409,error:'La cuenta completa ya está vendida.'};
        if(!account.isFullAccount)return {status:400,error:'El inventario seleccionado no es una cuenta completa.'};
        const active=this.sql.exec('SELECT body FROM items WHERE user_id=? AND kind=?',user.id,'sales').toArray().some((r:any)=>{const x=JSON.parse(r.body);return x.id!==excludeId&&x.accountId===sale.accountId&&x.type==='full_account'});
        if(active)return {status:409,error:'La cuenta completa ya está asignada a otra venta.'};
        account.isFullAccountSold=true;
      } else {
        if(account.isFullAccount)return {status:400,error:'La cuenta completa no se puede vender como perfil.'};
        if(!sale.profileId)return {status:400,error:'Seleccioná un perfil para esta venta.'};
        const profile=Array.isArray(account.profiles)?account.profiles.find((p:any)=>p.id===sale.profileId):null;
        if(!profile)return {status:404,error:'No se encontró el perfil en esa cuenta.'};
        if(profile.status!=='available' && profile.currentSaleId!==excludeId)return {status:409,error:'Ese perfil ya no está disponible. Actualizá el inventario.'};
        profile.status='sold'; profile.currentSaleId=sale.id;
        if(sale.profileName)profile.profileName=sale.profileName;
      }
      this.sql.exec('UPDATE items SET body=? WHERE user_id=? AND kind=? AND id=?',JSON.stringify(account),user.id,'accounts',account.id);
      return null;
    };
    const ensureCustomer=(sale:any)=>{
      const phone=String(sale.customerPhone||'').trim(), name=String(sale.customerName||'').trim();
      if(!name || !phone)return sale;
      const customers=this.sql.exec('SELECT id,body FROM items WHERE user_id=? AND kind=?',user.id,'customers').toArray() as any[];
      let existing=customers.find(r=>String(JSON.parse(r.body).phone||'').trim()===phone);
      if(!existing){const customer={id:`cust_${crypto.randomUUID()}`,userId:user.id,name,phone,createdAt:new Date().toISOString()};this.sql.exec('INSERT INTO items(user_id,kind,id,body) VALUES(?,?,?,?)',user.id,'customers',customer.id,JSON.stringify(customer));existing={id:customer.id,body:JSON.stringify(customer)};}
      sale.customerId=existing.id;
      return sale;
    };
    if(request.method==='POST' && !id) {
      const b=await this.body(request); const now=new Date().toISOString();
      const item:any={...b,id:`${kind.slice(0,4)}_${crypto.randomUUID()}`,userId:user.id,createdAt:now};
      if(kind==='customServices')item.id=`cs_${crypto.randomUUID()}`;
      if(kind==='sales'){
        if(!item.accountId || !['profile','full_account'].includes(item.type))return json({error:'Seleccioná una cuenta y un tipo de venta válido.'},400,origin);
        if(!String(item.customerName||'').trim())return json({error:'Ingresá el nombre del cliente.'},400,origin);
        if(!Number.isFinite(Number(item.salePrice))||Number(item.salePrice)<0)return json({error:'El precio de venta no es válido.'},400,origin);
        item.customerName=String(item.customerName).trim(); item.customerPhone=String(item.customerPhone||'').trim();
        const failure=this.ctx.storage.transactionSync(()=>{const err=reserve(item);if(err)return err;ensureCustomer(item);this.sql.exec('INSERT INTO items(user_id,kind,id,body) VALUES(?,?,?,?)',user.id,kind,item.id,JSON.stringify(item));return null;});
        if(failure)return json({error:failure.error},failure.status,origin);
      } else this.sql.exec('INSERT INTO items(user_id,kind,id,body) VALUES(?,?,?,?)',user.id,kind,item.id,JSON.stringify(item));
      return json(item,201,origin);
    }
    if(!id)return json({error:'Identificador requerido.'},400,origin);
    const row=findItem(kind,id);
    if(request.method==='DELETE') {
      if(kind==='sales'&&row){const item=JSON.parse(row.body);this.ctx.storage.transactionSync(()=>{release(item);this.sql.exec('DELETE FROM items WHERE user_id=? AND kind=? AND id=?',user.id,kind,id);});}
      else this.sql.exec('DELETE FROM items WHERE user_id=? AND kind=? AND id=?',user.id,kind,id);
      return json({success:true},200,origin);
    }
    if(!row)return json({error:'No se encontró el registro.'},404,origin);
    const item=JSON.parse(row.body);
    if(renew && request.method==='POST') { const b=await this.body(request), days=Math.min(3650,Math.max(1,Number(b.days)||30)), oldEnd=Date.parse(item.endDate||''), base=Math.max(Number.isFinite(oldEnd)?oldEnd:0,Date.now()), end=new Date(base); end.setUTCDate(end.getUTCDate()+days); item.startDate=new Date(base).toISOString(); item.endDate=end.toISOString(); item.status='active'; item.paymentStatus='paid'; if(b.paymentMethod)item.paymentMethod=String(b.paymentMethod).slice(0,80); item.lastRenewalDate=new Date().toISOString(); this.sql.exec('UPDATE items SET body=? WHERE user_id=? AND kind=? AND id=?',JSON.stringify(item),user.id,kind,id); return json({success:true,sale:item},200,origin); }
    if(request.method==='PUT') {
      const b=await this.body(request); const updated:any={...item,...b,id:item.id,userId:user.id};
      if(kind==='sales'){
        if(!updated.accountId || !['profile','full_account'].includes(updated.type))return json({error:'Seleccioná una cuenta y un tipo de venta válido.'},400,origin);
        if(!String(updated.customerName||'').trim())return json({error:'Ingresá el nombre del cliente.'},400,origin);
        if(!Number.isFinite(Number(updated.salePrice))||Number(updated.salePrice)<0)return json({error:'El precio de venta no es válido.'},400,origin);
        updated.customerName=String(updated.customerName).trim();updated.customerPhone=String(updated.customerPhone||'').trim();
        try {
          this.ctx.storage.transactionSync(()=>{release(item);const err=reserve(updated,item.id);if(err)throw Object.assign(new Error(err.error),{saleStatus:err.status});ensureCustomer(updated);this.sql.exec('UPDATE items SET body=? WHERE user_id=? AND kind=? AND id=?',JSON.stringify(updated),user.id,kind,id);});
        } catch(error:any) {
          if(Number.isInteger(error?.saleStatus))return json({error:error.message},error.saleStatus,origin);
          throw error;
        }
        return json(updated,200,origin);
      }
      this.sql.exec('UPDATE items SET body=? WHERE user_id=? AND kind=? AND id=?',JSON.stringify(updated),user.id,kind,id); return json(updated,200,origin);
    }
    return json({error:'Método no permitido.'},405,origin);
  }
  private exportData(user: User, origin: string) {
    const rows=this.sql.exec('SELECT kind,body FROM items WHERE user_id=?',user.id).toArray() as any[]; const data:any={version:'1.0',exportedAt:new Date().toISOString(),userId:user.id};
    for(const k of ALLOWED_KINDS) {
      const values=rows.filter(r=>r.kind===k).map(r=>JSON.parse(r.body));
      data[k]=k==='settings' ? (values[0] || {userId:user.id,currency:'USD',currencySymbol:'$',theme:'theme-dark-red'}) : values;
    }
    return json(data,200,origin);
  }
  private async restoreData(request: Request,user: User,origin: string) {
    const b=await this.body(request), data=b.backup||b;
    if(!data || typeof data!=='object' || Array.isArray(data)) return json({error:'El formato del respaldo no es válido.'},400,origin);
    const kinds=['providers','accounts','customers','sales','templates','customServices'];
    const prepared:Record<string,any[]>={};
    for(const kind of kinds) {
      if(!Object.prototype.hasOwnProperty.call(data,kind)) continue;
      if(!Array.isArray(data[kind]) || data[kind].length>5000) return json({error:`La lista ${kind} del respaldo no es válida.`},400,origin);
      prepared[kind]=[];
      for(const item of data[kind]) {
        if(!item || typeof item!=='object' || Array.isArray(item)) return json({error:`Un registro de ${kind} no es válido.`},400,origin);
        const suppliedId=String(item.id||'');
        if(suppliedId.length>200 || /[\u0000-\u001f\u007f]/.test(suppliedId)) return json({error:`El identificador de un registro de ${kind} no es válido.`},400,origin);
        const fixed={...item,userId:user.id,id:suppliedId||`${kind}_${crypto.randomUUID()}`};
        const body=JSON.stringify(fixed);
        if(!body || body.length>262144) return json({error:`Un registro de ${kind} supera el tamaño permitido.`},400,origin);
        prepared[kind].push({id:fixed.id,body});
      }
    }
    const hasSettings=Object.prototype.hasOwnProperty.call(data,'settings');
    if(hasSettings && (!data.settings || typeof data.settings!=='object' || Array.isArray(data.settings))) return json({error:'La configuración del respaldo no es válida.'},400,origin);
    const settingsBody=hasSettings ? JSON.stringify({...data.settings,userId:user.id}) : null;
    this.ctx.storage.transactionSync(()=>{
      for(const kind of kinds) if(prepared[kind]) {
        this.sql.exec('DELETE FROM items WHERE user_id=? AND kind=?',user.id,kind);
        for(const item of prepared[kind]) this.sql.exec('INSERT OR REPLACE INTO items(user_id,kind,id,body) VALUES(?,?,?,?)',user.id,kind,item.id,item.body);
      }
      if(settingsBody) this.sql.exec('INSERT OR REPLACE INTO items(user_id,kind,id,body) VALUES(?,?,?,?)',user.id,'settings',user.id,settingsBody);
    });
    return json({success:true,message:'Respaldo restaurado exitosamente.'},200,origin);
  }
  private async saveSettings(request: Request,user: User,origin: string) {
    const b=await this.body(request), item={userId:user.id,currency:String(b.currency||'USD').slice(0,12),currencySymbol:String(b.currencySymbol||'$').slice(0,8),theme:String(b.theme||'theme-dark-red').slice(0,80)};
    this.sql.exec('INSERT OR REPLACE INTO items(user_id,kind,id,body) VALUES(?,?,?,?)',user.id,'settings',user.id,JSON.stringify(item));
    return json({success:true,settings:item},200,origin);
  }
}

