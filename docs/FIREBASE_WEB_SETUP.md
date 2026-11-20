# Firebase web setup and current safety gate

The Firebase Console's registered `StreamFlow Pro` web app provides public Firebase client configuration (API key, auth domain, project ID, app ID, and optional messaging sender ID). These values initialize the browser SDK and are not service-account credentials. Never put a service-account JSON/private key or any other privileged credential in Vite variables or the client bundle.

The public values have been stored as GitHub Actions repository variables named `VITE_FIREBASE_*`. The GitHub Pages build workflow passes them to Vite at build time. `VITE_FIREBASE_ENABLED` is explicitly `false`; the Firebase login/register and Firestore path therefore remain unavailable in the deployed build until the production security prerequisites are reviewed.

## Scope of this web adapter

- Firebase email/password Auth for registration, login, persisted session observation, and logout.
- Firestore CRUD only under `users/{auth.uid}/accounts`, `users/{auth.uid}/sales`, and `users/{auth.uid}/clients`.
- The shared account/sale mapping omits account credentials, PINs, profiles, and Android-only data. Client records are constrained by the documented shared schema and the rules fixture.
- Providers, templates, settings, custom services, subscription tokens, token redemption, backup restore, and admin behavior are not enabled in this adapter.

## Required before enabling

1. Confirm Email/Password is enabled for Firebase Authentication.
2. Review the actual production Firestore rules and ensure they enforce authenticated owner-only access and exact allowed fields for the three collections.
3. Ensure the review preserves existing `/usuarios` and `/tokens_usados` behavior. Do not replace or broaden those live paths as part of this adapter.
4. Only after review, deliberately set the GitHub repository variable `VITE_FIREBASE_ENABLED` to `true` and separately approve any production deployment.

`firestore.rules` in this branch is a synthetic emulator test fixture only. It is not the live ruleset and must not be deployed. Emulator tests use synthetic data. No live Firestore rules or data were read, changed, or deployed by this work.
