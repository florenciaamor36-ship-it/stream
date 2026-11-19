# V1 isolated contract: `stream` web + Stream-Flow-Pro Android

This document describes only a minimized candidate contract exercised by the emulator fixture. It does not assert compatibility with existing Firebase data or deployed rules. No production rules/documents are read or changed. The emulator project ID is `demo-stream-flow-contract`, never `stream-flow-pro`.

## Shared owner/path contract

Both clients derive the partition from the authenticated Firebase UID (not an email or caller-selected user ID):

- `users/{uid}/accounts/{stableId}`
- `users/{uid}/sales/{stableId}`
- `users/{uid}/clients/{stableId}` (`Customer` in web; `ClientEntity` in Android)

The emulator rules independently require `request.auth.uid == uid`, require document `userId == uid` on create/update, allowlist data fields, and deny other paths. Client owner checks are defense in depth only. Delete authorization is path-owner scoped and has no `request.resource` dependency.

## Field-level match and mismatch

| Concept | Web field | Android local field | V1 rule |
|---|---|---|---|
| Partition owner | `userId` | `userId` | required and must equal signed-in UID |
| Client/customer display name | `name` | `name` | same string field |
| Client/customer phone | `phone` | `phone` | same field; synthetic-only test data |
| Client/customer email | optional `email` | `email` (blank omitted) | same field |
| Client/customer note | optional `notes` | `notes` (blank omitted) | same field |
| Client/customer creation time | ISO string `createdAt` | epoch millis `createdAt: Long` | Android mapper converts to UTC ISO-8601 string |
| Document ID | web `id` property | Android `id` | stored as Firestore document ID, omitted from document body |
| Account document ID | `id` | `id` | document ID only |
| Account login/email + password | `accountEmail`, `accountPassword` | same names | deliberately excluded: credential-like login data/password is not synced |
| Account platform | `platform` | `platformName` | mismatch; requires explicit mapper before Android account writes |
| Account dates | ISO `purchaseDate`, `renewalDate` | epoch millis `purchaseDate`, `expirationDate` | mismatch; no account mapper yet |
| Profile list/PIN | `profiles[].pin`, `masterPin` | profile/PIN fields | excluded pending reviewed credential encryption; account documents with nested profiles are rejected by rules |
| Sale credential fields | `accountPassword`, `pin` | `accountPassword`, `profilePin` | excluded; protected records will not pass the rules |
| Sale model | `type/status/paymentStatus`, ISO dates, customer relation fields | `saleType/renewalStatus/paymentStatus`, epoch millis | mismatch; no Android sale mapper yet |
| Supplier/provider | web supplier ID and names | Android supplier name/phone | mismatch; no provider mapping in V1 |

The emulator test fixtures assert CRUD on allowlisted canonical shapes; account/sale adapter round-trip tests separately exercise synthetic mapping. They prove the owner rules, not that all production app models can currently be synchronized. Web and Android now have explicit allowlisted account/sale projections to this candidate shape, with synthetic mapper round-trip tests. Credentials and PINs remain local-only, and their blank shared-view fields are not recovered. Android Firestore sync is still hard-disabled (`FIRESTORE_SYNC_ENABLED=false`) and live reads/writes are not activated or verified.

## Security/data minimization boundary

Account credentials, PINs and nested profiles are not stored by this V1 rules contract. The web adapter already rejects plaintext credential fields. The rules reject unapproved keys. Do not drop credential fields from local records silently and do not sync records that require them; a reviewed cross-platform encryption/key custody design is still required for full account/sale parity. Tokens, providers, settings and templates are out of scope; `/usuarios` and `/tokens_usados` are not modified or granted by these fixture rules.

## Reproduction

On Node 20 with Java 21 (or supported Java runtime) and npm:

```sh
npm ci --no-audit --no-fund
npm install --no-save firebase@11.10.0 @firebase/rules-unit-testing@4.0.1 firebase-tools@14.12.1
npx firebase emulators:exec --only firestore --project demo-stream-flow-contract \
  'node tests/firestore-rules-emulator.test.mjs'
```

The suite seeds only fake sentinel documents in the emulator. It checks read/create/update/list/delete for each of the three paths for Alice and Bob; attempts cross-user read/create/update/delete, unauthenticated read/write, UID spoofing, password/PIN fields; and confirms synthetic `/usuarios`, `/tokens_usados` and unrelated sentinels remain unchanged and inaccessible under this isolated ruleset. It does not connect to the production project.

## Exact remaining blockers before enabling

1. Have a project owner verify Firebase Auth providers, actual deployed rules and expected users/data paths; do not overwrite current rules, which include `/usuarios` and token flows.
2. Design and review an interoperable credential encryption/key-management contract or explicitly choose an app workflow that does not sync those fields; no plaintext account/sale sync.
3. Resolve profile/provider/customer relationship semantics, test sync retries/conflicts/deletion and reconcile local-only credential UX. The current adapter retains essential safe finance/customer/date fields but does not synchronize profile PINs, supplier phones, payment method, or credentials.
4. Run this emulator suite and Android JVM/CI. Any production rules/config rollout needs a separate explicit approval and owner-controlled, reviewed deployment. No production deployment or migration is part of this work.

## Emulator test coverage boundaries

For each of the three candidate collections the harness covers Alice and Bob own create/read/update/list/delete; both users attempting cross-owner read/create/update/delete; unauthenticated read/create; ownerId spoofing; password/PIN key denial. It seeds and later checks three separate synthetic legacy/unrelated sentinels (`usuarios`, `tokens_usados`, `unrelated_collection`) using emulator-only rules-disabled setup, and checks they are still denied to clients. The test does not import or reference production documents, credentials, IDs or project IDs.
