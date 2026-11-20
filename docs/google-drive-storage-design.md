# Google Drive settings backup — implementation and boundaries

The optional settings backup is integrated in Settings on isolated branch `feature/google-drive-appdata`. It is not the app's storage provider. Existing app login, server API, CRUD behavior, and browser-local persistence are unchanged; backup/restore operations only run after the user explicitly connects Google Drive and grants consent.

## Consent and token lifecycle

The browser loads Google Identity Services and calls its OAuth token client from the user's explicit Connect action. It requests only `https://www.googleapis.com/auth/drive.appdata` with account selection and consent. It does not use the app login as proof of Google identity and does not request email or OpenID. Access tokens remain in memory, are cleared on expiration/logout/Stream account change, and must be requested again after reload. Disconnect attempts Google token revocation and always clears the local in-memory state.

## Allowlist, restore, and conflicts

The `createSafeDriveData` boundary reconstructs a schema-v1 payload only from `ownerId`, three settings fields, and a bounded list of custom-service presentation fields. Unknown fields and all business/authentication records are excluded. No account/user secrets, PINs, contacts, customers/providers, sales, templates, tokens, or audit data are synced. Restore applies currency/theme and adds non-duplicate service definitions; it is additive and does not delete or replace local records. This is not a full backup of business data.

Drive stores one private named JSON object in each Google account's `appDataFolder`. Reads load the current Drive file `version`; writes recheck it and reject stale revisions. This optimistic check prevents ordinary stale overwrites but Drive's check-then-upload is not transactional, so simultaneous writes can race. The UI offers a refresh and does not claim database-grade sync.

## Setup and remaining external prerequisite

`VITE_GOOGLE_CLIENT_ID` is intentionally empty in `.env.example`. The owner must create a Google Cloud OAuth 2.0 Web client, enable Drive API, authorize exact deployment origins, configure consent-screen details and testing users, set this public ID in hosting build/runtime configuration, and complete Google's required verification/review before public use. A client secret must never enter the SPA. Drive `appDataFolder` use does not require billing. Until the real ID/origins and consent screen are configured, live OAuth is gated and can only be validated with mocked tests.

No database file, production config, rules, or user records are part of this integration; no migration is performed.
