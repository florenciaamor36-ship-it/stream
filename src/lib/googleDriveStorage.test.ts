import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DriveConflictError, DriveStorage, createSafeDriveData, DRIVE_SCOPE, type SafeDriveData } from './googleDriveStorage';

const safe: SafeDriveData = { ownerId: 'app-user-1', settings: { currency: 'ARS', currencySymbol: '$', theme: 'theme-dark-red' }, customServices: [{ name: 'Streaming X', color: 'purple', defaultProfiles: 4, iconName: 'Tv' }] };

test('allowlist payload excludes all unrelated records, credentials, contacts and unknown fields', () => {
  const cleaned = createSafeDriveData({ ...safe, password: 'secret-pass', token: 'secret-token', customers: [{ name: 'SECRET CUSTOMER', phone: '555' }], providers: [{ phone: 'SECRET PROVIDER' }], accounts: [{ accountPassword: 'SECRET ACCOUNT', masterPin: '1111' }], sales: [{ customerName: 'SECRET CUSTOMER', pin: '2222' }], users: [{ email: 'secret@example.test' }], templates: [{ body: 'literal secret' }], customServices: [{ ...safe.customServices[0], id: 'internal-id', userId: 'u1', notes: 'private note' }] });
  const serialized = JSON.stringify(cleaned);
  for (const marker of ['secret-pass', 'secret-token', 'SECRET CUSTOMER', 'SECRET PROVIDER', 'SECRET ACCOUNT', '1111', '2222', 'secret@example.test', 'literal secret', 'internal-id', 'private note']) assert.equal(serialized.includes(marker), false, marker);
  assert.deepEqual(cleaned, safe);
});

test('creates appData file with versioned allowlisted envelope and minimum scope', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const mock = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); calls.push({ url, init });
    if (url.includes('/upload/')) return Response.json({ id: 'f1', name: 'safe-settings', version: '1' });
    if (url.includes('/files?')) return Response.json({ files: [] });
    throw new Error(`Unexpected request: ${url}`);
  };
  const store = new DriveStorage(() => 'mock-token', mock, 'writer-1');
  const out = await store.write({ ...safe, customServices: [{ ...safe.customServices[0], password: 'not-uploaded' } as any] });
  assert.equal(out.schemaVersion, 1);
  assert.equal(out.app, 'stream-flow-pro');
  assert.equal(out.writerId, 'writer-1');
  assert.equal(store.revision, '1');
  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.includes('spaces=appDataFolder'));
  assert.equal(calls[1].init?.method, 'POST');
  assert.equal((calls[1].init?.headers as any)?.Authorization, 'Bearer mock-token');
  assert.ok(calls[1].url.includes('uploadType=multipart'));
  assert.ok(String((calls[1].init?.headers as any)?.['Content-Type']).startsWith('multipart/related; boundary='));
  assert.ok(String(calls[1].init?.body).includes('"ownerId":"app-user-1"'));
  assert.ok(String(calls[1].init?.body).includes('appDataFolder'));
  assert.equal(JSON.stringify(out).includes('not-uploaded'), false);
  assert.equal(DRIVE_SCOPE, 'https://www.googleapis.com/auth/drive.appdata');
});

test('reads data and refuses stale revision before replacement', async () => {
  let version = '2';
  const mock = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/files?')) return Response.json({ files: [{ id: 'f1', name: 'safe-settings', version }] });
    if (url.includes('?alt=media')) return Response.json({ schemaVersion: 1, app: 'stream-flow-pro', updatedAt: 't', writerId: 'w', data: safe });
    throw new Error(url);
  };
  const store = new DriveStorage(() => 'token', mock, 'writer-2');
  assert.deepEqual((await store.read())?.data, safe);
  version = '3';
  await assert.rejects(() => store.write(safe), DriveConflictError);
});

test('fails closed without token and surfaces expired authorization', async () => {
  const noToken = new DriveStorage(() => null, async () => { throw new Error('network must not run'); }, 'writer-3');
  await assert.rejects(() => noToken.read(), /disconnected/i);
  const expired = new DriveStorage(() => 'expired', async () => new Response('', { status: 401 }), 'writer-4');
  await assert.rejects(() => expired.read(), /authorization expired/i);
});
