# Stream Flow isolated API preview

This branch introduces an API adapter and a Cloudflare Worker candidate for a separate, synthetic-only preview. The app still uses the existing email/password form; the Worker stores password hashes (PBKDF2-SHA-256), issues opaque bearer sessions, stores only hashes of session keys and subscription-token codes, and enforces the subscription state server-side. User-owned rows are scoped to the authenticated owner. Cross-origin browser access is limited to the GitHub Pages origin in `APP_ORIGIN`.

## Safety boundary

- This is not a production migration and does not import or inspect `data/db.json`.
- It does not copy legacy user accounts, plaintext passwords, customers, sales, credentials, settings, or token records.
- Admin bootstrap requires Worker secrets `ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_SECRET`; neither is set by this branch. Never enable the old hard-coded admin/password or localStorage fallback.
- The UI uses `VITE_STREAM_API_URL` and stores the opaque session key in `sessionStorage`; if remote API requests fail, it must fail closed instead of saving a fake local account or accepting locally fabricated subscription tokens.
- `wrangler.toml` names a new Worker/class, not the existing `stream-flow-staging` probe Worker. Deployment is deliberately not wired into Pages or production.

## API surface expected by the app

`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/accept-terms`, `POST /api/auth/update-credentials`, `POST /api/auth/redeem-token`; authenticated `GET /api/data`; authenticated CRUD for providers, accounts, customers, sales (including `/renew`), templates, custom services, settings, backup export/restore; admin-only token generation and audit listing. Bearer authorization is required for all non-login/register operations.

## Remaining gates before a usable account preview

1. Build and deploy the Worker candidate under a separate staging script with its own SQLite-backed Durable Object. Set and verify only the allowed Pages origin, then run synthetic register/login/session, subscription redemption, every CRUD route, backup and persistence-across-requests smoke tests.
2. A real administrator and tokens cannot be brought over without a reviewed continuity plan. The current legacy login stores plaintext passwords and auto-promotes a hard-coded account; this Worker intentionally refuses that unsafe behavior. Existing user accounts require a safe credential reset/import flow before this can replace `/api/data`.
3. Pages deployment is intentionally preview-build-only; it must not change the live `/stream/` site until continuity is established and verified.

No runtime secrets, token values, user rows, or production database contents belong in this repository.
