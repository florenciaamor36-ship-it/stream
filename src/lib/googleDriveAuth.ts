import { DRIVE_SCOPE } from './googleDriveStorage';

export type DriveToken = { accessToken: string; expiresAt: number };
export type GisTokenResponse = { access_token?: string; expires_in?: number; error?: string; error_description?: string };
export type GisTokenClient = { requestAccessToken(options?: { prompt?: string }): void };
export type GisOAuth2 = {
  initTokenClient(options: {
    client_id: string;
    scope: string;
    include_granted_scopes: boolean;
    callback: (response: GisTokenResponse) => void;
    error_callback?: (error: { type?: string; message?: string }) => void;
  }): GisTokenClient;
  revoke?(token: string, callback?: () => void): void;
};

/** Start an explicit GIS user-consent flow; access tokens are returned to the caller, never persisted here. */
export function requestDriveAccessToken(clientId: string, oauth2: GisOAuth2): Promise<DriveToken> {
  if (!clientId.trim()) return Promise.reject(new Error('Google Drive is not configured: set VITE_GOOGLE_CLIENT_ID to a Google OAuth Web client ID.'));
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      include_granted_scopes: false,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Google Drive authorization was not granted.'));
          return;
        }
        const seconds = Number(response.expires_in);
        if (!Number.isFinite(seconds) || seconds <= 0) {
          reject(new Error('Google did not return a valid access-token expiry. Reconnect to Google Drive.'));
          return;
        }
        resolve({ accessToken: response.access_token, expiresAt: Date.now() + seconds * 1000 });
      },
      error_callback: (error) => reject(new Error(error.message || 'Google Drive authorization failed.')),
    });
    try {
      client.requestAccessToken({ prompt: 'consent select_account' });
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Google Drive authorization failed.'));
    }
  });
}

let gisPromise: Promise<GisOAuth2> | null = null;
export function loadGisOAuth2(): Promise<GisOAuth2> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Drive authorization is only available in a browser.'));
  const existing = (window as any).google?.accounts?.oauth2 as GisOAuth2 | undefined;
  if (existing) return Promise.resolve(existing);
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const fail = () => { gisPromise = null; reject(new Error('Could not load Google Identity Services. Check your connection and retry.')); };
      let script = document.querySelector<HTMLScriptElement>('script[data-google-identity-services]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentityServices = 'true';
        document.head.appendChild(script);
      }
      const settle = () => {
        const oauth2 = (window as any).google?.accounts?.oauth2 as GisOAuth2 | undefined;
        if (oauth2) { resolve(oauth2); return true; }
        return false;
      };
      script.addEventListener('load', () => { if (!settle()) fail(); }, { once: true });
      script.addEventListener('error', fail, { once: true });
      // Cover an already-loaded script and report a bounded failure if GIS never initializes.
      if (settle()) return;
      const poll = window.setInterval(() => { if (settle()) window.clearInterval(poll); }, 50);
      window.setTimeout(() => { window.clearInterval(poll); if (!settle()) fail(); }, 10000);
    });
  }
  return gisPromise;
}

export async function authorizeDrive(clientId: string): Promise<DriveToken> {
  const oauth2 = await loadGisOAuth2();
  return requestDriveAccessToken(clientId, oauth2);
}

export async function revokeDriveToken(token: string): Promise<void> {
  const oauth2 = await loadGisOAuth2();
  if (!oauth2.revoke) return;
  await new Promise<void>((resolve) => oauth2.revoke!(token, resolve));
}
