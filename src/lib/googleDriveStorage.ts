export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const DRIVE_FILE_NAME = 'stream-flow-pro-data-v1.json';
export const SCHEMA_VERSION = 1;
export type DriveFile = { id: string; name: string; version?: string; modifiedTime?: string };
export type DriveFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type AppDataEnvelope = { schemaVersion: 1; app: 'stream-flow-pro'; updatedAt: string; writerId: string; data: Record<string, unknown> };
export class DriveConflictError extends Error { constructor() { super('Google Drive copy changed on another device. Reload or export before replacing it.'); this.name = 'DriveConflictError'; } }
export class DriveStorage {
  private file: DriveFile | null = null;
  constructor(private token: () => string | null, private request: DriveFetch = fetch, private writerId: string = crypto.randomUUID()) {}
  private async call(url: string, init: RequestInit = {}) {
    const token = this.token();
    if (!token) throw new Error('Google Drive is disconnected. Reconnect to sync; local data remains available.');
    const response = await this.request(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
    if (response.status === 401) throw new Error('Google Drive authorization expired. Reconnect to sync; local data remains available.');
    if (!response.ok) throw new Error(`Google Drive request failed (${response.status}).`);
    return response;
  }
  private async find(): Promise<DriveFile | null> {
    const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
    const response = await this.call(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,version,modifiedTime)&q=${q}`);
    return ((await response.json()).files as DriveFile[] | undefined)?.[0] || null;
  }
  async read(): Promise<AppDataEnvelope | null> {
    this.file = await this.find();
    if (!this.file) return null;
    const response = await this.call(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(this.file.id)}?alt=media`);
    const payload = await response.json() as AppDataEnvelope;
    if (payload?.app !== 'stream-flow-pro' || payload.schemaVersion !== SCHEMA_VERSION || !payload.data || typeof payload.data !== 'object') throw new Error('Unsupported or invalid Stream Flow Pro Drive data format.');
    return payload;
  }
  async write(data: Record<string, unknown>): Promise<AppDataEnvelope> {
    // Optimistic conflict detection: compare Drive's monotonically increasing file version before each replacement.
    const latest = await this.find();
    if ((!this.file && latest) || (this.file && (!latest || latest.id !== this.file.id || (this.file.version && latest.version !== this.file.version)))) throw new DriveConflictError();
    this.file = latest;
    const envelope: AppDataEnvelope = { schemaVersion: SCHEMA_VERSION, app: 'stream-flow-pro', updatedAt: new Date().toISOString(), writerId: this.writerId, data };
    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify({ name: DRIVE_FILE_NAME, ...(this.file ? {} : { parents: ['appDataFolder'] }) })], { type: 'application/json' }));
    body.append('file', new Blob([JSON.stringify(envelope)], { type: 'application/json' }));
    const params = 'uploadType=multipart&fields=id,name,version,modifiedTime';
    const url = this.file ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(this.file.id)}?${params}` : `https://www.googleapis.com/upload/drive/v3/files?${params}`;
    const response = await this.call(url, { method: this.file ? 'PATCH' : 'POST', body });
    this.file = await response.json() as DriveFile;
    return envelope;
  }
  get revision(): string | null { return this.file?.version || null; }
}
// No account/password/PIN/token/audit records are uploaded without a user-approved encryption design.
export function removeSensitiveFields(source: any): Record<string, unknown> {
  const data = structuredClone(source || {});
  for (const a of data.accounts || []) { delete a.accountPassword; delete a.accountEmail; delete a.masterPin; for (const p of a.profiles || []) delete p.pin; }
  for (const s of data.sales || []) { delete s.accountPassword; delete s.accountEmail; delete s.pin; delete s.customerName; delete s.customerPhone; delete s.customerId; }
  // Customer/provider directories contain personal contact data; keep local until encryption is designed.
  delete data.customers; delete data.providers; delete data.users; delete data.tokens; delete data.tokenAuditLogs; delete data.user;
  return data;
}
