export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const DRIVE_FILE_NAME = 'stream-flow-pro-safe-settings-v1.json';
export const SCHEMA_VERSION = 1;
export type SafeDriveData = {
  ownerId: string;
  settings: { currency?: string; currencySymbol?: string; theme?: 'theme-dark-red' | 'theme-dark-emerald' | 'theme-dark-violet' | 'theme-dark-blue' | 'theme-dark-gold' | 'theme-dark-rose' | 'theme-light' };
  customServices: Array<{ name: string; color: string; badgeBg?: string; textColor?: string; iconName?: string; defaultProfiles: number }>;
};
export type DriveFile = { id: string; name: string; version?: string; modifiedTime?: string };
export type DriveFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type AppDataEnvelope = { schemaVersion: 1; app: 'stream-flow-pro'; updatedAt: string; writerId: string; data: SafeDriveData };
export class DriveConflictError extends Error { constructor() { super('Google Drive copy changed on another device. Refresh Drive status, then restore or review before replacing it.'); this.name = 'DriveConflictError'; } }

const boundedText = (value: unknown, max = 160): string | undefined => typeof value === 'string' && value.length <= max ? value : undefined;
/** Rebuilds the payload from a strict allowlist. It never copies arbitrary app records or credentials. */
export function createSafeDriveData(source: any): SafeDriveData {
  if (!source || typeof source !== 'object' || typeof source.ownerId !== 'string' || !source.ownerId || source.ownerId.length > 200) {
    throw new Error('Invalid Drive backup: missing app-account owner.');
  }
  const inputSettings = source.settings && typeof source.settings === 'object' ? source.settings : {};
  const settings: SafeDriveData['settings'] = {};
  const currency = boundedText(inputSettings.currency, 12);
  const currencySymbol = boundedText(inputSettings.currencySymbol, 12);
  const theme = inputSettings.theme;
  const allowedThemes = new Set(['theme-dark-red', 'theme-dark-emerald', 'theme-dark-violet', 'theme-dark-blue', 'theme-dark-gold', 'theme-dark-rose', 'theme-light']);
  if (currency && /^[A-Z]{3}$/.test(currency)) settings.currency = currency;
  if (currencySymbol && /^[^<>]{1,6}$/.test(currencySymbol)) settings.currencySymbol = currencySymbol;
  if (typeof theme === 'string' && allowedThemes.has(theme)) settings.theme = theme as SafeDriveData['settings']['theme'];
  const inputServices = Array.isArray(source.customServices) ? source.customServices.slice(0, 200) : [];
  const customServices = inputServices.flatMap((service: any) => {
    if (!service || typeof service !== 'object') return [];
    const name = boundedText(service.name, 80);
    const color = boundedText(service.color, 40);
    const defaultProfiles = Number(service.defaultProfiles);
    if (!name || !color || !Number.isInteger(defaultProfiles) || defaultProfiles < 1 || defaultProfiles > 20) return [];
    const clean: SafeDriveData['customServices'][number] = { name, color, defaultProfiles };
    const badgeBg = boundedText(service.badgeBg, 40);
    const textColor = boundedText(service.textColor, 40);
    const iconName = boundedText(service.iconName, 60);
    if (badgeBg) clean.badgeBg = badgeBg;
    if (textColor) clean.textColor = textColor;
    if (iconName) clean.iconName = iconName;
    return [clean];
  });
  return { ownerId: source.ownerId, settings, customServices };
}

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
    return { ...payload, data: createSafeDriveData(payload.data) };
  }
  async write(input: SafeDriveData): Promise<AppDataEnvelope> {
    const data = createSafeDriveData(input);
    // Optimistic conflict detection: do not replace a file whose Drive version changed after this client read it.
    const latest = await this.find();
    if ((!this.file && latest) || (this.file && (!latest || latest.id !== this.file.id || (!this.file.version || latest.version !== this.file.version)))) throw new DriveConflictError();
    this.file = latest;
    const envelope: AppDataEnvelope = { schemaVersion: 1, app: 'stream-flow-pro', updatedAt: new Date().toISOString(), writerId: this.writerId, data };
    const boundary = `stream-drive-${crypto.randomUUID()}`;
    const metadata = { name: DRIVE_FILE_NAME, ...(this.file ? {} : { parents: ['appDataFolder'] }) };
    const body = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(envelope)}\r\n`,
      `--${boundary}--`,
    ].join('');
    const params = 'uploadType=multipart&fields=id,name,version,modifiedTime';
    const url = this.file ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(this.file.id)}?${params}` : `https://www.googleapis.com/upload/drive/v3/files?${params}`;
    const response = await this.call(url, { method: this.file ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
    this.file = await response.json() as DriveFile;
    return envelope;
  }
  get revision(): string | null { return this.file?.version || null; }
}
