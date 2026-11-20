import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DriveConflictError, DriveStorage, removeSensitiveFields } from './googleDriveStorage';

test('creates appData file with versioned envelope and only appData scope API surface', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const mock = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); calls.push({ url, init });
    if (url.includes('/upload/')) return Response.json({ id: 'f1', name: 'stream-flow-pro-data-v1.json', version: '1' });
    if (url.includes('/files?')) return Response.json({ files: [] });
    throw new Error(`Unexpected request: ${url}`);
  };
  const store = new DriveStorage(() => 'mock-token', mock, '11111111-1111-4111-8111-111111111111');
  const out = await store.write({ customers: [{ id: 'c1' }] });
  assert.equal(out.schemaVersion, 1);
  assert.equal(out.app, 'stream-flow-pro');
  assert.equal(out.writerId, '11111111-1111-4111-8111-111111111111');
  assert.equal(store.revision, '1');
  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.includes('spaces=appDataFolder'));
  assert.equal(calls[1].init?.method, 'POST');
  assert.equal((calls[1].init?.headers as any)?.Authorization, 'Bearer mock-token');
  assert.ok(calls[1].url.includes('uploadType=multipart'));
});

test('reads and detects stale Drive version before replacement', async () => {
  let version = '2';
  const mock = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/files?')) return Response.json({ files: [{ id: 'f1', name: 'x', version }] });
    if (url.includes('?alt=media')) return Response.json({ schemaVersion: 1, app: 'stream-flow-pro', updatedAt: 't', writerId: 'w', data: { customers: [] } });
    throw new Error(url);
  };
  const store = new DriveStorage(() => 'token', mock, '22222222-2222-4222-8222-222222222222');
  assert.deepEqual((await store.read())?.data, { customers: [] });
  version = '3';
  await assert.rejects(() => store.write({ customers: [{ id: 'local' }] }), DriveConflictError);
});

test('fails closed without a token and strips secrets before cloud upload', async () => {
  const store = new DriveStorage(() => null, async () => { throw new Error('must not call network'); }, '33333333-3333-4333-8333-333333333333');
  await assert.rejects(() => store.read(), /disconnected/i);
  const sanitized = removeSensitiveFields({ accounts: [{ accountPassword: 'secret', masterPin: '1234', profiles: [{ pin: '5678' }] }], sales: [{ accountPassword: 'secret', pin: '9999' }], users: [{ id: 'u1', email: 'u@example.test', name: 'Test', createdAt: '', gracePeriodUntil: '', subscriptionUntil: '', tokensRedeemed: 0 }], tokens: [{ code: 'x' }], customers: [] }) as any;
  assert.deepEqual(sanitized.accounts, [{ profiles: [{}] }]);
  assert.deepEqual(sanitized.sales, [{}]);
  assert.equal('users' in sanitized, false);
  assert.equal('tokens' in sanitized, false);
});
