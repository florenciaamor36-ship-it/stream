# Web ↔ Android Firebase contract: guarded implementation

## Status and safety boundary

This branch adds a Firebase Auth/Firestore browser adapter, but it is **off by default**. It can only initialize when `VITE_FIREBASE_ENABLED=true`, all required public web config is present, and the configured project ID is exactly `stream-flow-pro`. This guard is a safety check, not proof that the Firebase app/config, Auth providers, rules, or data schemas have been verified. Do not set the enable flag on a live deployment until the blockers below are resolved.

No production Firestore rules or documents were changed or read for this work. The legacy Express `/api/*` routes remain fail-closed; this client adapter does not expose or re-enable them. Never add an Admin SDK credential or private key to browser configuration.

## Paths and ownership enforced by the adapter

All data paths are derived from `FirebaseAuth.currentUser.uid`; no caller-supplied UID is used to choose a Firestore path:

- `users/{uid}/accounts/{documentId}`
- `users/{uid}/sales/{documentId}`
- `users/{uid}/clients/{documentId}` (web `Customer` model)

The adapter rejects a record whose supplied `userId` disagrees with the authenticated UID, forces the authenticated UID into saved documents, and uses only the signed-in user's subcollections for reads/deletes. These client checks are not a substitute for Firestore Rules. Before enabling, rules must independently require an authenticated owner for every read and write on each path and deny all other users and unauthenticated clients. The previously observed broad write access on `/tokens_usados/{token}` is not used by this adapter and must not be widened or relied upon.

## Unresolved schema/security blockers

- Android and web field-level schemas, IDs, timestamp representation, and document serialization were not compared in this change. Collection names alone do not establish compatibility.
- Web `Account` and `Sale` models include streaming-account passwords/PINs. The adapter refuses to write non-empty credential fields in plaintext. No interoperable encryption/key-management contract with Android exists yet, so records requiring those fields cannot currently be fully saved/shared. Do not remove this guard until a reviewed, tested crypto design exists in both apps.
- Only `accounts`, `sales`, and `clients` are mapped. Web-only providers, settings, templates, custom services and subscription management remain disabled/not synced. Token issuance/redemption is deliberately unavailable from the browser; do not access `/tokens_usados`.
- Terms acceptance is stored only in this browser, not as verified server-side user metadata.
- Firebase configuration values are public client configuration, not secrets, but must come from the verified registered web app. They are intentionally not included in this branch.

## Enablement checklist (not authorized by this branch)

1. Review Android data classes and serialization and compare with web types using synthetic data only; agree exact mapping and stable document IDs.
2. Configure Firebase Auth email/password in the existing web app and obtain its web config from a trusted project owner. Verify project/app identity; never paste Admin credentials into the web app.
3. Review actual deployed rules without changing them as part of this change. Prepare a separately reviewed owner-only rules change for these exact paths and verify the rules in the Firebase Emulator Suite with synthetic users Alice/Bob and unauthenticated access. Tests must cover read, create, update and delete for all three collections, cross-owner denial, UID spoofing, and credential rejection. Do not infer access from client-side checks.
4. Resolve the credential encryption blocker before using real account records. Do not test against or migrate production documents.
5. Run production build/typecheck, emulator rules tests, and synthetic cross-app tests. Only after a separate explicit authorization should production rules/config be changed or the app enabled/deployed.

## Current honest capability

With a verified config and rules, the adapter provides email/password Firebase Auth and owner-scoped CRUD paths for the three proposed collections, subject to the schema and plaintext-credential blockers above. In this repository the feature is deliberately disabled by default, no real cross-app data test has been run, and the branch is not a live production integration.