# Stream Flow Pro per-user Google Drive app data

Status: runtime Drive adapter and mocked API tests are implemented on `feature/google-drive-appdata`. The current app UI/storage CRUD path is not yet wired to this adapter; do not enable it for end users until that integration and OAuth code exchange are added. Existing sign-in and persistence remain unchanged.

## Android interoperability contract (schema v1)

Both clients must use Drive's private `appDataFolder`, filename `stream-flow-pro-data-v1.json`, and this JSON envelope:

```json
{
  "schemaVersion": 1,
  "app": "stream-flow-pro",
  "updatedAt": "ISO-8601 UTC timestamp",
  "writerId": "random per-install identifier",
  "data": { "providers": [], "accounts": [], "customers": [], "sales": [], "templates": [], "settings": {}, "customServices": [] }
}
```

Google Drive file metadata's monotonically increasing `version` is the revision. Before writing, compare the loaded revision with current Drive metadata; if different, refuse overwrite and require a reload/export decision. Drive appData is not transactional and concurrent changes can still race between metadata check and upload; clients must explain this limitation and never claim database-grade conflict safety. Only the listed non-secret business fields are candidates for cross-device sync. Exclude all users/authentication/passwords, account passwords, account master PINs, profile PINs, sale credentials/PINs, subscription tokens, and audit logs. Until a reviewed client-side encryption design exists, those sensitive fields remain local-only. Do not send them in plaintext.

## Required external configuration before OAuth can work

Create a Google Cloud OAuth 2.0 Web application client in the owner's project; enable Google Drive API; configure consent screen/audience and exact authorized web origins; add test users while in testing and complete Google verification if needed for public distribution. The only requested Drive scope is `https://www.googleapis.com/auth/drive.appdata`. Use a public OAuth client ID in runtime config (`VITE_GOOGLE_CLIENT_ID`); any code-exchange secret, if server-side code flow is adopted, must remain server-only. Never use an implicit token in a URL, service account, or an assistant's OAuth account. No client ID or secret is included or fabricated here.

The current integration is deliberately not activated because the existing app's auth and all CRUD/storage functions route through a file-backed server or shared browser-local fallback. A UI toggle alone would be unsafe: credentials are present in existing records, and switching providers without routing every read/write would silently continue writing server data. Adapter tests use mocked Drive responses; no live user account/data was accessed.
