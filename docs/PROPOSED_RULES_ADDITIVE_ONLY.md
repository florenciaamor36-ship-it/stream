# Nonbreaking Firestore rules proposal — review only, not deployed

This note is a candidate appendix for a project owner/security review. It is **not** a replacement ruleset and makes no production changes. Keep every existing match and behavior (especially `/usuarios`, `/tokens_usados`, token redemption/admin paths, and current auth flows) byte-for-byte unless separately reviewed. Do not deploy the isolated emulator `firestore.rules` file.

Before any proposal is adopted, obtain a fresh copy of the current deployed rules, preserve it as a rollback artifact, and add only a narrowly scoped nested match for `users/{uid}/{collection}/{documentId}` for explicitly allowlisted collections (`accounts`, `sales`, `clients`). Each operation must bind `request.auth.uid == uid`; create/update must require `request.resource.data.userId == uid` and an exact allowlist per collection. Read/delete remain owner-scoped. Unknown collections and fields remain denied. Account credential/PIN fields stay excluded. Review update semantics and collection-group queries separately.

## Regression gate

Run the emulator test suite against the **full proposed merged rules**, not the isolated fixture. Seed only synthetic fixtures in emulator setup; assert the preexisting-match contracts and that `/usuarios`, `/tokens_usados`, admin/token operations, unauthenticated access, cross-owner reads/writes, and unknown fields behave exactly as before. No project data, deployed rules, or secrets are read by this repository test. This proposal is not evidence that the live rules are compatible.
