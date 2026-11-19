# Firebase compatibility contract (proposal only; no live project changes)

## Current status

This branch starts at `audit/fail-closed-auth-remediation-2026-11-19` commit `8a5eb6ebd322b6b5de25d6d586d520ac64838b8e`. The web API remains deliberately disabled with HTTP 503. This document does not enable any API, connect to Firebase, configure a project, read/write Firestore, or migrate any records. Do not remove the fail-closed gate based on this proposal.

Known from the task/audit context: Firebase project `stream-flow-pro` already has a web app and Firestore database; deployed rules have been observed for `/usuarios/{userId}` (owner access) and `/tokens_usados/{token}` (authenticated users can read/write). Android currently syncs `accounts`, `sales`, and `clients` below `/users/{uid}`. These are distinct paths and must not be treated as interchangeable. The exact deployed rules, Android field schemas, and web Firebase configuration were not validated in this code-only branch.

## Proposed shared owner boundary

For new cross-app integration, the candidate canonical paths are:

- `/users/{uid}/accounts/{documentId}`
- `/users/{uid}/sales/{documentId}`
- `/users/{uid}/clients/{documentId}`

The authenticated Firebase UID must be the owner boundary. A client-provided `userId`, path string, or document field is not proof of ownership. Every client should derive the UID from a verified Firebase Auth session; Firestore rules must require `request.auth.uid == uid` for reads and writes. This is a proposal only: if the Android application or deployed rules use another exact contract, inventory and reconcile that first without changing either side.

## Known model mismatch and unresolved mapping

The web TypeScript model names customers `Customer` and its old API/data model also includes providers, templates, settings, custom services, tokens, token audit logs, and user/subscription metadata. The known Android sync contract has `clients` rather than `customers`, and only `accounts`, `sales`, and `clients` have been confirmed. We do not yet know whether those Android records use the web `Account`, `Sale`, and `Customer` field names/types, document IDs, timestamp encoding, null handling, or credentials representation. Do not claim schema compatibility until those source definitions and serialization code are reviewed.

| Concept | Web model in this repository | Android model confirmed by task | Status |
| --- | --- | --- | --- |
| Account | `Account` (including credentials, profiles, provider relation) | `accounts` subcollection | Field/schema mapping unknown; sensitive credentials need explicit protection review |
| Sale | `Sale` | `sales` subcollection | Field/schema mapping unknown |
| Customer | `Customer` | `clients` subcollection | Name and field mapping unknown |
| Provider | `Provider` | Not confirmed | No shared mapping established |
| Templates/settings/custom services | Web-only models known | Not confirmed | Do not silently drop or write elsewhere |
| Subscription tokens | Web token model | Existing `/tokens_usados/{token}` rules observed | Separate security-critical contract; never use client-supplied identity or expose token listings |
| User profile | Web legacy `User` model | `/usuarios/{userId}` rules observed | Separate from `/users/{uid}` unless explicitly proven identical by code/data review |

## Non-destructive implementation sequence

1. Read Android source definitions and serialization to document exact field paths, IDs and types; review the current web model and the actual deployed rules. This step must not query or print production documents.
2. Agree a versioned mapping for `accounts`, `sales`, and `clients`. Preserve document IDs where possible. Decide explicitly what to do with web-only providers/settings/templates/tokens; no silent omission or destructive overwrite.
3. Add Firebase Auth to the web client using the existing web app configuration (Firebase web configuration is not a server secret, but must still be project-verified); do not add Admin SDK credentials or secrets to browser code. Keep `/api/*` fail closed until the chosen architecture has complete authorization.
4. Implement Firestore access behind an adapter that obtains UID only from Firebase Auth. Test with a local emulator and synthetic users A/B: A can CRUD only A's records; B cannot read/write A's records; unauthenticated requests fail. Rules tests must cover each collection and malformed/oversized data.
5. Before any production cutover, make an independently verified backup of every existing store. Compare counts and stable IDs; trial-import into an isolated emulator/project; reconcile mismatches; require a recoverable, idempotent, non-destructive cutover and rollback plan. Never overwrite or delete `/usuarios`, `/tokens_usados`, legacy JSON, or Android records as a side effect of first login or sync.
6. Run web build, lint, unit/integration/rules tests, and real cross-app tests with synthetic accounts. Only then propose a separately reviewed release. No production read/write/migration is authorized by this branch.

## Acceptance criteria before calling the apps shared/working

- The exact same Firebase project ID and verified Auth UID are used by web and Android.
- Account, sale, and client field mappings and document IDs are tested in both directions.
- Emulator rules tests prove isolation and deny unauthenticated access for every shared path.
- A create/update/read test from one app is visible in the other, and a negative cross-owner test is denied.
- Existing production documents and other databases/collections remain intact; migration and rollback are verified from synthetic/staging data first.
- Web production API stays fail-closed unless separately authenticated, authorized, and tested. A Firebase browser client does not justify re-enabling the legacy Express handlers.
