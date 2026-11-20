# Optional Google Drive settings backup (web SPA)

Status: a manual, opt-in UI flow is wired on `feature/google-drive-appdata`. Existing login, API CRUD, and local-storage behavior remain the active storage path. Google Drive is not a replacement backend and no Drive call occurs until the signed-in user explicitly connects and approves Google consent.

## Exactly what is backed up

The versioned file `stream-flow-pro-safe-settings-v1.json` is private to the consenting Google account's Drive `appDataFolder`. Schema v1 contains only:

- the Stream app-account ID used to prevent restoring the wrong Stream account;
- settings `currency`, `currencySymbol`, and `theme`;
- custom-service definitions containing only `name`, `color`, `badgeBg`, `textColor`, `iconName`, and `defaultProfiles`.

The writer constructs a fresh payload from this allowlist. It does **not** include user records, passwords, account credentials, account/profile PINs, account/sale/customer/provider records or contacts, sale history, message templates, subscription tokens, audit logs, or arbitrary fields. Restoring applies the allowlisted preferences and adds custom services that do not already exist by name; it does not delete/replace existing local records or services. This is a settings backup, not a complete business-data backup. Existing JSON backup/export remains separate.

Access tokens are held in memory only, are cleared at expiry/logout/account change, and are not written to localStorage, URLs, server APIs, or the backup. The app does not request OpenID/email scopes and does not claim to know which Google account was selected. User-initiated writes compare Drive file `version` with the version last read and refuse a stale overwrite. Drive metadata-check/upload is not transactional, so a narrow concurrent race remains possible. Refresh the Drive status before deciding to save or restore after a conflict.

## Configure Google Cloud (required to enable OAuth)

1. In the app owner's Google Cloud project, enable **Google Drive API**.
2. Create an OAuth 2.0 client with application type **Web application**. The app uses Google Identity Services token client in the browser (no client secret and no server-side code exchange).
3. Add the exact deployed web origins under **Authorized JavaScript origins** (scheme + hostname + optional port; no path), plus the local development origin if needed. Make sure each origin used by users is present.
4. Configure the OAuth consent screen with the correct app name, support/developer contact, audience, and privacy-policy/homepage details Google requires. While the app is in Testing, add each intended tester as a test user. Before public distribution, complete Google's applicable verification/review for the Drive scope and the published app; testing-user status is not public consent.
5. Set the public **OAuth Web client ID** as runtime/build variable `VITE_GOOGLE_CLIENT_ID` in the hosting environment and rebuild. This value is an identifier, not a secret. The app shows an explicit setup error and leaves Drive disabled if it is missing. Never commit a made-up ID or put a client secret, refresh token, access token, API key, or service-account key in frontend config.

The only Drive scope requested is `https://www.googleapis.com/auth/drive.appdata`, with explicit consent and account selection. Google Drive `appDataFolder` use requires no Cloud Billing enablement. The owner must verify Google Cloud OAuth configuration and deployed origins; no OAuth client ID is present in this repository, and no real consent/account/API test has been performed.

## Validation and deployment boundary

The automated adapter/OAuth tests use mocked GIS and Drive APIs. They do not use production accounts or inspect/migrate records. Build and type-check from the repo using `npm run lint` and `npm run build`; run mocked tests with `npm run test:drive`. Do not merge/deploy the feature without owner review, setting the actual runtime client ID/origins, and completing the intended test-user/public-consent checks.
