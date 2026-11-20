import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestDriveAccessToken, GisOAuth2 } from './googleDriveAuth';

function mockGIS(response: any) {
  let options: any;
  let promptOptions: any;
  const oauth2: GisOAuth2 = { initTokenClient(value) { options = value; return { requestAccessToken(value) { promptOptions = value; options.callback(response); } }; } };
  return { oauth2, get options() { return options; }, get promptOptions() { return promptOptions; } };
}

test('GIS requests explicit Drive appData-only consent and retains expiry in memory result', async () => {
  const gis = mockGIS({ access_token: 'temporary-mock-token', expires_in: 3600 });
  const start = Date.now();
  const result = await requestDriveAccessToken('example.apps.googleusercontent.com', gis.oauth2);
  assert.equal(result.accessToken, 'temporary-mock-token');
  assert.ok(result.expiresAt >= start + 3_599_000 && result.expiresAt <= Date.now() + 3_600_000);
  assert.equal(gis.options.scope, 'https://www.googleapis.com/auth/drive.appdata');
  assert.equal(gis.options.include_granted_scopes, false);
  assert.equal(gis.options.client_id, 'example.apps.googleusercontent.com');
  assert.deepEqual(gis.promptOptions, { prompt: 'consent select_account' });
});

test('GIS denied consent and missing client ID are explicit failures', async () => {
  const denied = mockGIS({ error: 'access_denied', error_description: 'User denied access' });
  await assert.rejects(() => requestDriveAccessToken('example.apps.googleusercontent.com', denied.oauth2), /User denied access/);
  await assert.rejects(() => requestDriveAccessToken('', denied.oauth2), /VITE_GOOGLE_CLIENT_ID/);
});
