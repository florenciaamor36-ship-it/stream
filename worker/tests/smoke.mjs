const base = process.env.STREAM_API_URL || 'http://127.0.0.1:8787';
const origin = 'https://florenciaamor36-ship-it.github.io';
const adminEmail = 'stream-smoke-admin@example.test';
const userEmail = `stream-smoke-${Date.now()}@example.test`;
const password = 'Synthetic-Only-Password-2026!';
const bootstrapSecret = 'ci-only-synthetic-bootstrap-secret';
const fail = (message) => { throw new Error(message); };
async function call(path, { method = 'GET', token, body, expect = 200, requestOrigin = origin } = {}) {
  const headers = { Origin: requestOrigin };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let data = {};
  if (response.status !== 204) { try { data = await response.json(); } catch { fail(`Non-JSON response for ${method} ${path}`); } }
  if (response.status !== expect) fail(`Unexpected status for ${method} ${path}: ${response.status}`);
  return { response, data };
}
const assert = (condition, message) => { if (!condition) fail(message); };
const authUser = (data) => {
  assert(data?.success && data.user?.id && data.user?.sessionToken, 'Auth response missing session');
  const result = { user: data.user, token: data.user.sessionToken };
  assert(!('password' in data.user) && !('password_hash' in data.user), 'Password material leaked');
  return result;
};

// API health, origin policy and preflight.
let { data } = await call('/health');
assert(data.ok === true, 'health endpoint failed');
let blocked = await call('/health', { requestOrigin: 'https://example.org', expect: 403 });
assert(blocked.data.error, 'untrusted browser origin accepted');
let preflight = await fetch(`${base}/api/data`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
assert(preflight.status === 204 && preflight.headers.get('access-control-allow-origin') === origin, 'CORS preflight failed');

// Bootstrap an isolated synthetic admin; no production admin data is used.
const admin = authUser((await call('/api/auth/bootstrap', { method: 'POST', body: { email: adminEmail, password, name: 'Synthetic admin', secret: bootstrapSecret }, expect: 201 })).data);
const secondBootstrap = await call('/api/auth/bootstrap', { method: 'POST', body: { email: adminEmail, password, secret: bootstrapSecret }, expect: 409 });
assert(secondBootstrap.data.error, 'bootstrap was not one-time');
const createdTokens = await call('/api/tokens/generate', { method: 'POST', token: admin.token, body: { count: 1, days: 30 } });
const redeemCode = createdTokens.data.tokens?.[0]?.code;
assert(typeof redeemCode === 'string' && redeemCode.length > 15, 'server did not issue a token');

// Registration, password login, wrong-password rejection, bearer protection and terms.
const registered = authUser((await call('/api/auth/register', { method: 'POST', body: { email: userEmail, password, name: 'Synthetic User' }, expect: 201 })).data);
await call('/api/auth/login', { method: 'POST', body: { email: userEmail, password: 'Wrong-Synthetic-Password!' }, expect: 401 });
const loggedIn = authUser((await call('/api/auth/login', { method: 'POST', body: { email: userEmail, password } })).data);
const other = authUser((await call('/api/auth/register', { method: 'POST', body: { email: `stream-isolation-${Date.now()}@example.test`, password, name: 'Isolated User' }, expect: 201 })).data);
await call('/api/data', { expect: 401 });
await call('/api/auth/accept-terms', { method: 'POST', token: loggedIn.token, body: { userId: 'untrusted-id' } });

// Every collection route persists and remains tenant-scoped across independent requests.
for (const [kind, idPrefix, payload] of [
  ['providers', 'prov_', { name: 'Synthetic Provider', email: 'fake@example.test' }],
  ['accounts', 'acco_', { service: 'Synthetic Service', email: 'fake@example.test' }],
  ['customers', 'cust_', { name: 'Synthetic Customer', phone: '0000000000' }],
  ['sales', 'sale_', { customerName: 'Synthetic Customer', customerPhone: '0000000000', endDate: new Date(Date.now()+86400000).toISOString() }],
  ['templates', 'temp_', { name: 'Synthetic Template', body: 'synthetic only' }],
]) {
  const created = await call(`/api/${kind}`, { method: 'POST', token: loggedIn.token, body: payload, expect: 201 });
  const item = created.data;
  assert(item.id && item.userId === loggedIn.user.id, `${kind} owner/id invalid`);
  let current = item;
  if (kind === 'sales') {
    const renewed = await call(`/api/sales/${item.id}/renew`, { method: 'POST', token: loggedIn.token, body: { days: 7, paymentMethod: 'Synthetic' } });
    current = renewed.data.sale;
    assert(current.status === 'active' && current.paymentStatus === 'paid', 'sale renewal failed');
  } else {
    current = (await call(`/api/${kind}/${item.id}`, { method: 'PUT', token: loggedIn.token, body: { ...item, name: 'Updated synthetic item' } })).data;
  }
  const dataAfter = (await call('/api/data', { token: loggedIn.token })).data;
  assert(Array.isArray(dataAfter[kind]) && dataAfter[kind].some((x) => x.id === item.id), `${kind} did not persist across requests`);
  const otherData = (await call('/api/data', { token: other.token })).data;
  assert(!Array.isArray(otherData[kind]) || !otherData[kind].some((x) => x.id === item.id), `${kind} tenant isolation failed`);
  if (kind !== 'sales') await call(`/api/${kind}/${item.id}`, { method: 'DELETE', token: loggedIn.token });
  else await call(`/api/sales/${item.id}`, { method: 'DELETE', token: loggedIn.token });
}
const custom = await call('/api/custom-services', { method: 'POST', token: loggedIn.token, body: { name: 'Synthetic Custom', userId: 'forged-owner' }, expect: 201 });
assert(custom.data.userId === loggedIn.user.id, 'custom-service owner not enforced');
await call('/api/custom-services', { method: 'DELETE', token: loggedIn.token, expect: 400 });
await call(`/api/custom-services/${custom.data.id}`, { method: 'DELETE', token: loggedIn.token });
await call('/api/settings', { method: 'POST', token: loggedIn.token, body: { userId: 'forged-owner', currency: 'ARS', currencySymbol: '$', theme: 'theme-light' } });
let state = (await call('/api/data', { token: loggedIn.token })).data;
assert(state.settings.userId === loggedIn.user.id && state.settings.currency === 'ARS', 'settings owner/persistence failed');
assert(!state.providers.some((x) => x.id.startsWith('prov_') && x.userId !== loggedIn.user.id), 'tenant data leaked');

// Backup is authenticated, user-scoped, and contains no token codes.
let backup = (await call('/api/backup/export', { token: loggedIn.token })).data;
assert(Array.isArray(backup.providers) && !('tokens' in backup), 'backup contract invalid or token codes leaked');
await call('/api/backup/restore', { method: 'POST', token: loggedIn.token, body: { backup } });

// Subscription tokens are one-time and entitlement state is server supplied.
const redemption = await call('/api/auth/redeem-token', { method: 'POST', token: loggedIn.token, body: { userId: 'forged-owner', tokenCode: redeemCode } });
assert(redemption.data.success && redemption.data.user.tokensRedeemed === 1, 'token redemption did not update entitlement');
await call('/api/auth/redeem-token', { method: 'POST', token: registered.token, body: { tokenCode: redeemCode }, expect: 400 });
const logs = (await call('/api/tokens/audit-logs', { token: admin.token })).data.logs;
assert(Array.isArray(logs) && logs.some((x) => x.status === 'SUCCESS'), 'token audit missing');

// Session revocation is enforced server-side.
await call('/api/auth/logout', { method: 'POST', token: loggedIn.token });
await call('/api/data', { token: loggedIn.token, expect: 401 });
console.log('Stream Flow synthetic Worker smoke passed: auth, token, owner isolation, CRUD, backup, CORS, logout and persistence.');
