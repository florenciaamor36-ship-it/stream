# Fail-closed security containment

This branch is a code-only containment change. It does not implement or claim to fix authentication.

## Changes

- Every `/api/*` request receives HTTP 503 before any existing handler can read or mutate the database. This disables login, registration, data access, CRUD, settings, backups/restores, tokens, and all other API features.
- Removed the code that seeded/promoted a built-in administrator and removed local/demo authentication and `localStorage` database fallback implementations. The browser no longer hydrates or persists a client-side user identity.
- The UI no longer collects an email or password and warns that real credentials must not be entered while server authentication is unavailable.
- Server-side automatic database initialization/fallback was removed. A missing or unreadable database now fails closed rather than creating/replacing data.
- The existing database file and contents were not read, changed, migrated, deleted, overwritten, imported, or copied by this work. No database schema or data files are in this branch's change set.
- Workflow branch guards remain unchanged: Pages deploy is limited to `main`; APK build is limited to `main`/`master`.

## Validation and limitations

A Python standard-library static regression test checks API gate ordering, absence of demo/local auth and local identity persistence, UI warning/no credential fields, database non-initialization, and workflow branch restrictions. These checks do not prove runtime behavior or a complete authorization boundary. JavaScript/TypeScript dependencies and a local Node/npm toolchain were unavailable; no frontend build, server integration test, or device test was run.

All API functionality is intentionally unavailable until a separately reviewed design implements password hashing, secure server sessions, CSRF/session protections as applicable, identity derived from verified sessions, per-route ownership/administrator authorization, input validation, rate limiting, and safe backup/restore semantics. The existing route handlers remain behind the global deny gate and must not be re-enabled until those issues are addressed. Existing database format/data is untouched and must be preserved; no migration is authorized here. The committed historical database/account material and public Git history remain unchanged and may require separate credential revocation/rotation and exposure review. Do not merge or deploy this branch as a claim that the application is production-safe.
