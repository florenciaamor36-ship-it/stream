# Stream Flow Pro security audit (2026-11-19)

## Scope and limitations

Reviewed public repository state at `main` commit `fa5ad876376ca4e02d91ad623b0d741f064fefde`, visible branches, recent commit list, workflow definitions, latest Actions run/job metadata, artifact inventory, and deployment records. This branch is an audit/containment step only, not a complete security repair. No production data was imported or changed; no main-branch changes, merge, release, Pages deployment, or production action was performed.

## Confirmed high-risk findings

- `server.ts` contains a seeded administrator/demo account with a plaintext password and auto-provision/auto-promotion logic tied to a fixed email. The same local fallback/admin seed pattern exists in `src/lib/storage.ts`; `data/db.json` contains a demo user record with plaintext password data. **Rotate/revoke any exposed credentials and invalidate existing sessions/tokens; do not reuse the published password.** This report deliberately omits all values. Removing or rotating source strings does not remove them from public Git history.
- `server.ts` API endpoints rely on caller-supplied `userId`; login does not establish a server-side session or bearer token. The reviewed API routes include data, settings, backup/restore, subscriptions/tokens, and CRUD operations. No global authentication/owner-authorization middleware was found. This is an authorization bypass risk, not just missing UI checks.
- `src/lib/storage.ts` falls back to browser `localStorage` and contains local auth/admin fallback logic. UI/backend configuration and security boundaries are not suitable for treating a public static Pages deployment as a secure multi-user backend.
- Backup restore has duplicate route registrations in `server.ts`; restore replacement and validation/atomicity need a dedicated redesign.
- There is no npm lockfile in the repository tree; current workflows use `npm install`.

## Branch containment change

The branch adds a job-level ref guard to both workflows: Pages deploy only runs for `main`, and APK build only runs for `main`/`master`. Existing workflow triggers are `push` on the respective named branches plus `workflow_dispatch`; the job guards prevent a manually dispatched run on this audit branch from deploying or building an artifact. The deployment workflow had previously deployed from `main`; deployment records inspected were all on `main`. This does not remediate the vulnerabilities in `main` or make the current app safe.

## Required follow-up before any production use

1. Rotate exposed credentials and review account/token access; treat public-history copies as compromised.
2. Replace login with verified password hashing and secure session/token handling, with CSRF/session protections as appropriate; remove all local/demo admin fallbacks.
3. Enforce authentication and derive owner identity from the verified session on every route; add administrator-only policy where intended. Validate schemas, bounds, and ownership for every read/write/restore/token operation; rate-limit login and token redemption.
4. Design a non-destructive backup and validated, atomic, lossless migration to durable storage before changing persistence. Do not migrate/import production data in this task.
5. Move sensitive client data out of localStorage or explicitly design a safe offline encryption/sync model. Configure frontend API origin and backend secrets through deployment configuration, never committed fallback values.
6. Add a lockfile, security-focused tests (including cross-owner access, restore atomicity, password reset/login throttling), and CI.
7. Do not merge or deploy until the security work and tests are complete.

## Validation status

Repository inspection used GitHub REST API; no local Node/npm/git toolchain was available in the parent environment, so build/tests could not be run here. The existing run `30467612359`, job `90629358392`, shows failure at **Set up Node.js**; the detailed log endpoint returned HTTP 410, so the specific cause is unknown and is not inferred. The repository currently lists zero Actions artifacts.
